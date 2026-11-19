function scheduleProfileRetentionPrune(force = false) {
  runBackgroundOperation(() => pruneProfileRetention(force)).catch((error) => {
    console.error("Failed to prune profile retention", error);
  });
}

async function pruneProfileRetention(force) {
  const options = await getOptions();
  const retentionDays = normalizeProfileRetentionDays(options.profileRetentionDays);
  if (retentionDays <= 0) {
    return;
  }

  const now = Date.now();
  const shouldRun = force || await shouldRunProfileRetentionPrune(now);
  if (!shouldRun) {
    return;
  }

  const cutoff = getProfileRetentionCutoff(retentionDays);
  await withTransaction([STORE_PROFILE_SNAPSHOTS], "readwrite", async ({ profileSnapshots }) => {
    await deleteCursorValues(profileSnapshots.index("byCollectedAt"), IDBKeyRange.upperBound(cutoff - 1));
  });
  await deleteOrphanProfileTextBlobs();
  await withTransaction([STORE_META], "readwrite", async ({ meta }) => {
    await requestToPromise(meta.put({ key: PROFILE_RETENTION_META_KEY, value: now }));
  });
}

async function shouldRunProfileRetentionPrune(now) {
  return withTransaction([STORE_META], "readonly", async ({ meta }) => {
    const entry = await requestToPromise(meta.get(PROFILE_RETENTION_META_KEY));
    return !Number.isFinite(entry?.value) || now - entry.value >= PROFILE_RETENTION_PRUNE_INTERVAL_MS;
  });
}

async function deleteCursorValues(source, range) {
  return new Promise((resolve, reject) => {
    const request = source.openCursor(range);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }

      cursor.delete();
      cursor.continue();
    };
    request.onerror = () => reject(request.error || new Error("删除 IndexedDB 游标失败"));
  });
}

async function deleteOrphanProfileTextBlobs() {
  const usedHashes = new Set();
  await withTransaction([STORE_PROFILES, STORE_PROFILE_SNAPSHOTS, STORE_PROFILE_TEXT_BLOBS], "readwrite",
    async ({ profiles, profileSnapshots, profileTextBlobs }) => {
    for (const [store, refsKey] of [[profiles, "latestTextRefs"], [profileSnapshots, "textRefs"]]) {
      await new Promise((resolve, reject) => {
        const request = store.openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return resolve();
          for (const hash of Object.values(cursor.value[refsKey] || {})) {
            if (hash) usedHashes.add(hash);
          }
          cursor.continue();
        };
        request.onerror = () => reject(request.error);
      });
    }
    await new Promise((resolve, reject) => {
      const request = profileTextBlobs.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve();
          return;
        }

        if (!usedHashes.has(cursor.key)) {
          cursor.delete();
        }
        cursor.continue();
      };
      request.onerror = () => reject(request.error || new Error("清理文本引用失败"));
    });
  });
}

const LOCAL_DATA_GROUPS = Object.freeze({
  profiles: [STORE_PROFILES],
  trends: [STORE_PROFILE_SNAPSHOTS],
  lucky: [STORE_LUCKY_NOTIFICATIONS],
  visits: [STORE_VISIT_HISTORY]
});

async function countLocalDataGroups() {
  return withTransaction(Object.values(LOCAL_DATA_GROUPS).flat(), "readonly", async (stores) => {
    const counts = {};
    for (const [key, names] of Object.entries(LOCAL_DATA_GROUPS)) {
      const count = await Promise.all(names.map((name) => requestToPromise(stores[name].count())));
      counts[key] = count.reduce((total, value) => total + value, 0);
    }
    return counts;
  });
}

async function clearLocalDataGroups(groups) {
  const selected = new Set(Array.isArray(groups) ? groups : []);
  const names = Object.entries(LOCAL_DATA_GROUPS).filter(([key]) => selected.has(key)).flatMap(([, names]) => names);
  if (!names.length) return { cleared: false };
  await withTransaction(names, "readwrite", async (stores) => {
    await Promise.all(Object.values(stores).map((store) => requestToPromise(store.clear())));
  });
  if (selected.has("profiles") || selected.has("trends")) await deleteOrphanProfileTextBlobs();
  if (selected.has("lucky")) scheduleLuckyNotificationAlarmSync();
  return { cleared: true };
}

async function clearAllLocalData() {
  await clearLocalDataGroups(Object.keys(LOCAL_DATA_GROUPS));
  await chrome.storage.local.remove([...LEGACY_STORAGE_KEYS, ATTENDANCE_REMINDER_STORAGE_KEY]);
  await withTransaction([STORE_META], "readwrite", ({ meta }) => requestToPromise(meta.clear()));
  return { cleared: true };
}

async function discardLegacyStorage() {
  try {
    await chrome.storage.local.remove(LEGACY_STORAGE_KEYS);
  } catch (error) {
    console.warn("Failed to discard legacy storage", error);
  }
}
