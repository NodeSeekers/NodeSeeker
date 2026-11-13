function scheduleProfileRetentionPrune(force = false) {
  pruneProfileRetention(force).catch((error) => {
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
  await withTransaction([STORE_PROFILE_SNAPSHOTS], "readonly", async ({ profileSnapshots }) => {
    const snapshots = await collectCursorValues(profileSnapshots, null, "next", 0, Number.MAX_SAFE_INTEGER);
    snapshots.forEach((snapshot) => {
      PROFILE_TEXT_FIELDS.forEach((field) => {
        const hash = snapshot.textRefs?.[field];
        if (hash) {
          usedHashes.add(hash);
        }
      });
    });
  });

  await withTransaction([STORE_PROFILE_TEXT_BLOBS], "readwrite", async ({ profileTextBlobs }) => {
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

async function clearAllLocalData() {
  await chrome.storage.local.remove([...LEGACY_STORAGE_KEYS, ATTENDANCE_REMINDER_STORAGE_KEY]);
  await chrome.alarms.clear(LUCKY_ALARM_NAME);
  await clearLegacyLuckyAlarms();
  await withTransaction(
    [
      STORE_PROFILES,
      STORE_PROFILE_SNAPSHOTS,
      STORE_PROFILE_TEXT_BLOBS,
      STORE_LUCKY_NOTIFICATIONS,
      STORE_VISIT_HISTORY,
      STORE_META
    ],
    "readwrite",
    async (stores) => {
      await Promise.all(Object.values(stores).map((store) => requestToPromise(store.clear())));
    }
  );
  return { cleared: true };
}

async function discardLegacyStorage() {
  try {
    await chrome.storage.local.remove(LEGACY_STORAGE_KEYS);
  } catch (error) {
    console.warn("Failed to discard legacy storage", error);
  }
}
