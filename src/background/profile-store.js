async function getCachedProfile(payload) {
  const memberId = normalizeMemberId(payload.memberId);
  if (!memberId) {
    return null;
  }

  const cacheHours = normalizeUserCacheHours(payload.cacheHours);
  const ttlMs = cacheHours * 60 * 60 * 1000;
  if (ttlMs <= 0) {
    return null;
  }

  return withTransaction([STORE_PROFILES], "readonly", async ({ profiles }) => {
    const profile = await requestToPromise(profiles.get(memberId));
    if (!profile || !Number.isFinite(profile.cachedAt)) {
      return null;
    }

    return Date.now() - profile.cachedAt <= ttlMs ? { ...profile.latestDetailLean } : null;
  });
}

async function saveProfileSnapshot(payload) {
  const memberId = normalizeMemberId(payload.memberId || payload.detail?.member_id);
  if (!memberId || !hasProfileFields(payload.detail)) {
    return null;
  }

  const collectedAt = Number.isFinite(payload.collectedAt) ? payload.collectedAt : Date.now();
  const { snapshot, textBlobs } = await buildProfileSnapshot(memberId, payload.detail, collectedAt);

  await withTransaction(
    [STORE_PROFILES, STORE_PROFILE_SNAPSHOTS, STORE_PROFILE_TEXT_BLOBS],
    "readwrite",
    async ({ profiles, profileSnapshots, profileTextBlobs }) => {
      for (const blob of textBlobs) {
        const existingBlob = await requestToPromise(profileTextBlobs.get(blob.hash));
        await requestToPromise(profileTextBlobs.put({
          ...blob,
          firstSeenAt: existingBlob?.firstSeenAt || blob.firstSeenAt,
          lastSeenAt: collectedAt
        }));
      }

      const existingSnapshot = await requestToPromise(profileSnapshots.get(snapshot.id));
      if (!existingSnapshot || snapshot.collectedAt >= existingSnapshot.collectedAt) {
        await requestToPromise(profileSnapshots.put(snapshot));
      }

      const existingProfile = await requestToPromise(profiles.get(memberId));
      await requestToPromise(profiles.put({
        ...existingProfile,
        memberId,
        memberName: snapshot.detailLean.member_name || existingProfile?.memberName || memberId,
        cachedAt: collectedAt,
        latestSnapshotId: snapshot.id,
        latestCollectedAt: snapshot.collectedAt,
        latestDetailLean: snapshot.detailLean,
        latestTextRefs: snapshot.textRefs
      }));
    }
  );

  scheduleProfileRetentionPrune();
  return snapshot;
}

async function buildProfileSnapshot(memberId, detail, collectedAt) {
  const dateKey = getDateKey(collectedAt);
  const detailLean = { ...detail, member_id: detail.member_id || memberId };
  const textRefs = {};
  const textBlobs = [];

  for (const field of PROFILE_TEXT_FIELDS) {
    const content = typeof detailLean[field] === "string" ? detailLean[field] : "";
    delete detailLean[field];

    if (!content) {
      textRefs[field] = null;
      continue;
    }

    const hash = `sha256:${await sha256Hex(content)}`;
    const now = Date.now();
    textRefs[field] = hash;
    textBlobs.push({
      hash,
      content,
      byteLength: new TextEncoder().encode(content).byteLength,
      firstSeenAt: now,
      lastSeenAt: collectedAt
    });
  }

  return {
    snapshot: {
      id: `${memberId}:${dateKey}`,
      memberId,
      dateKey,
      collectedAt,
      detailLean,
      textRefs
    },
    textBlobs
  };
}

async function getProfileTrendEntries(payload) {
  const memberId = normalizeMemberId(payload.memberId);
  const days = Math.max(1, Math.floor(Number(payload.days) || 30));
  if (!memberId) {
    return [];
  }

  const cutoff = getProfileTrendCutoff(days);
  const now = Date.now();

  return withTransaction([STORE_PROFILE_SNAPSHOTS], "readonly", async ({ profileSnapshots }) => {
    const index = profileSnapshots.index("byMemberCollectedAt");
    const range = IDBKeyRange.bound([memberId, cutoff], [memberId, now]);
    const snapshots = await collectCursorValues(index, range, "next", 0, Number.MAX_SAFE_INTEGER);
    return snapshots.map((snapshot) => ({
      collectedAt: snapshot.collectedAt,
      detail: snapshot.detailLean
    }));
  });
}

async function getLatestProfileSnapshot(payload) {
  const memberId = normalizeMemberId(payload.memberId);
  if (!memberId) {
    return null;
  }

  const cacheHours = normalizeUserCacheHours(payload.cacheHours);
  const ttlMs = cacheHours * 60 * 60 * 1000;

  const record = await withTransaction(
    [STORE_PROFILES, STORE_PROFILE_SNAPSHOTS],
    "readonly",
    async ({ profiles, profileSnapshots }) => {
      const profile = await requestToPromise(profiles.get(memberId));
      if (
        !profile?.latestSnapshotId
        || !Number.isFinite(profile.cachedAt)
        || Date.now() - profile.cachedAt > ttlMs
      ) {
        return null;
      }

      const snapshot = await requestToPromise(profileSnapshots.get(profile.latestSnapshotId));
      return {
        profile,
        snapshot: snapshot || {
          id: profile.latestSnapshotId,
          collectedAt: profile.latestCollectedAt,
          detailLean: profile.latestDetailLean,
          textRefs: profile.latestTextRefs
        }
      };
    }
  );

  if (!record) {
    return null;
  }

  return {
    ...record,
    detail: await hydrateProfileDetail(record.snapshot.detailLean, record.snapshot.textRefs)
  };
}

async function hydrateProfileDetail(detailLean, textRefs) {
  const detail = { ...detailLean };
  const refs = textRefs || {};
  const hashes = PROFILE_TEXT_FIELDS
    .map((field) => refs[field])
    .filter(Boolean);

  if (hashes.length === 0) {
    return detail;
  }

  await withTransaction([STORE_PROFILE_TEXT_BLOBS], "readonly", async ({ profileTextBlobs }) => {
    for (const field of PROFILE_TEXT_FIELDS) {
      const hash = refs[field];
      if (!hash) {
        continue;
      }

      const blob = await requestToPromise(profileTextBlobs.get(hash));
      detail[field] = blob?.content || "";
    }
  });

  return detail;
}
