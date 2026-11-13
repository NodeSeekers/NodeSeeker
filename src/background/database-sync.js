const DATA_SYNC_SCHEMA = "nodeseek-helper-data";
const DATA_SYNC_VERSION = 1;
const DATA_SYNC_STORE_NAMES = [
  STORE_PROFILES,
  STORE_PROFILE_SNAPSHOTS,
  STORE_PROFILE_TEXT_BLOBS,
  STORE_LUCKY_NOTIFICATIONS,
  STORE_VISIT_HISTORY,
  STORE_META
];
const DATA_SYNC_STORE_KEYS = {
  [STORE_PROFILES]: "memberId",
  [STORE_PROFILE_SNAPSHOTS]: "id",
  [STORE_PROFILE_TEXT_BLOBS]: "hash",
  [STORE_LUCKY_NOTIFICATIONS]: "id",
  [STORE_VISIT_HISTORY]: "id",
  [STORE_META]: "key"
};

async function exportDatabaseData() {
  const storesData = {};
  await withTransaction(DATA_SYNC_STORE_NAMES, "readonly", async (stores) => {
    for (const storeName of DATA_SYNC_STORE_NAMES) {
      storesData[storeName] = await collectCursorValues(
        stores[storeName],
        null,
        "next",
        0,
        Number.MAX_SAFE_INTEGER
      );
    }
  });

  return {
    schema: DATA_SYNC_SCHEMA,
    version: DATA_SYNC_VERSION,
    extensionVersion: chrome.runtime.getManifest().version,
    dbName: DB_NAME,
    dbVersion: DB_VERSION,
    exportedAt: new Date().toISOString(),
    stores: storesData
  };
}

async function importDatabaseData(payload) {
  const normalized = await normalizeDatabaseImportPayload(payload?.data || payload);

  await withTransaction(DATA_SYNC_STORE_NAMES, "readwrite", async (stores) => {
    for (const storeName of DATA_SYNC_STORE_NAMES) {
      for (const item of normalized.stores[storeName]) {
        await requestToPromise(stores[storeName].put(item));
      }
    }
  });

  scheduleLuckyNotificationAlarmSync();
  scheduleProfileRetentionPrune(true);

  return {
    imported: true,
    importedCount: normalized.importedCount,
    skippedCount: normalized.skippedCount,
    counts: normalized.counts
  };
}

async function normalizeDatabaseImportPayload(payload) {
  if (!isImportObject(payload)) {
    throw new Error("数据文件格式不正确");
  }

  const importStores = extractImportStores(payload);
  const normalizedStores = Object.fromEntries(DATA_SYNC_STORE_NAMES.map((storeName) => [storeName, []]));
  const generatedTextBlobs = new Map();
  let skippedCount = 0;

  for (const storeName of DATA_SYNC_STORE_NAMES) {
    const rows = getImportStoreRows(storeName, importStores[storeName]);
    for (const row of rows) {
      try {
        const normalized = await normalizeImportStoreRow(storeName, row, generatedTextBlobs);
        if (normalized) {
          normalizedStores[storeName].push(normalized);
        } else {
          skippedCount += 1;
        }
      } catch (_error) {
        skippedCount += 1;
      }
    }
  }

  normalizedStores[STORE_PROFILE_TEXT_BLOBS].push(...generatedTextBlobs.values());

  let importedCount = 0;
  const counts = {};
  for (const storeName of DATA_SYNC_STORE_NAMES) {
    normalizedStores[storeName] = dedupeImportRows(storeName, normalizedStores[storeName]);
    counts[storeName] = normalizedStores[storeName].length;
    importedCount += counts[storeName];
  }

  if (importedCount === 0) {
    throw new Error("没有可导入的数据");
  }

  return {
    stores: normalizedStores,
    importedCount,
    skippedCount,
    counts
  };
}

function extractImportStores(payload) {
  if (isImportObject(payload.stores)) {
    return payload.stores;
  }

  if (DATA_SYNC_STORE_NAMES.some((storeName) => Object.prototype.hasOwnProperty.call(payload, storeName))) {
    return payload;
  }

  throw new Error("数据文件缺少数据库内容");
}

function getImportStoreRows(storeName, value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (!isImportObject(value)) {
    return [];
  }

  if (storeName === STORE_PROFILE_TEXT_BLOBS) {
    return Object.entries(value).map(([hash, item]) => {
      return isImportObject(item) ? { ...item, hash: item.hash || hash } : { hash, content: item };
    });
  }

  return Object.values(value);
}

async function normalizeImportStoreRow(storeName, row, generatedTextBlobs) {
  switch (storeName) {
    case STORE_PROFILES:
      return normalizeProfileImportRow(row, generatedTextBlobs);
    case STORE_PROFILE_SNAPSHOTS:
      return normalizeProfileSnapshotImportRow(row, generatedTextBlobs);
    case STORE_PROFILE_TEXT_BLOBS:
      return normalizeProfileTextBlobImportRow(row);
    case STORE_LUCKY_NOTIFICATIONS:
      return normalizeLuckyNotificationImportRow(row);
    case STORE_VISIT_HISTORY:
      return normalizeVisitHistoryImportRow(row);
    case STORE_META:
      return normalizeMetaImportRow(row);
    default:
      return null;
  }
}

async function normalizeProfileImportRow(row, generatedTextBlobs) {
  if (!isImportObject(row)) {
    return null;
  }

  const detailSource = getImportDetailSource(row, "latestDetailLean", "latestDetail", "detail");
  const memberId = normalizeMemberId(row.memberId || row.member_id || detailSource.member_id);
  if (!memberId) {
    return null;
  }

  const now = Date.now();
  const cachedAt = normalizeImportTimestamp(row.cachedAt, now);
  const latestCollectedAt = normalizeImportTimestamp(row.latestCollectedAt, cachedAt);
  const detail = await normalizeProfileDetailForImport(
    memberId,
    detailSource,
    row.latestTextRefs,
    latestCollectedAt,
    generatedTextBlobs
  );

  return {
    ...row,
    memberId,
    memberName: cleanImportText(row.memberName || detail.detailLean.member_name || memberId),
    cachedAt,
    latestSnapshotId: cleanImportText(row.latestSnapshotId),
    latestCollectedAt,
    latestDetailLean: detail.detailLean,
    latestTextRefs: detail.textRefs
  };
}

async function normalizeProfileSnapshotImportRow(row, generatedTextBlobs) {
  if (!isImportObject(row)) {
    return null;
  }

  const detailSource = getImportDetailSource(row, "detailLean", "detail");
  const collectedAt = normalizeImportTimestamp(row.collectedAt, Date.now());
  const memberId = normalizeMemberId(
    row.memberId
    || detailSource.member_id
    || getMemberIdFromSnapshotId(row.id)
  );
  if (!memberId) {
    return null;
  }

  const dateKey = cleanImportText(row.dateKey) || getDateKey(collectedAt);
  const detail = await normalizeProfileDetailForImport(
    memberId,
    detailSource,
    row.textRefs,
    collectedAt,
    generatedTextBlobs
  );

  return {
    ...row,
    id: cleanImportText(row.id) || `${memberId}:${dateKey}`,
    memberId,
    dateKey,
    collectedAt,
    detailLean: detail.detailLean,
    textRefs: detail.textRefs
  };
}

async function normalizeProfileDetailForImport(memberId, detail, refs, seenAt, generatedTextBlobs) {
  const detailLean = {
    ...(isImportObject(detail) ? detail : {}),
    member_id: memberId
  };
  const textRefs = {};
  const inputRefs = isImportObject(refs) ? refs : {};

  for (const field of PROFILE_TEXT_FIELDS) {
    const content = typeof detailLean[field] === "string" ? detailLean[field] : "";
    const existingRef = cleanImportText(inputRefs[field]);
    delete detailLean[field];

    if (content) {
      const blob = await buildProfileTextBlobForImport(content, seenAt);
      textRefs[field] = blob.hash;
      generatedTextBlobs.set(blob.hash, blob);
    } else {
      textRefs[field] = existingRef || null;
    }
  }

  return { detailLean, textRefs };
}

async function normalizeProfileTextBlobImportRow(row) {
  if (!isImportObject(row)) {
    if (typeof row !== "string") {
      return null;
    }
    return buildProfileTextBlobForImport(row, Date.now());
  }

  const content = typeof row.content === "string" ? row.content : "";
  const hash = cleanImportText(row.hash) || (content ? `sha256:${await sha256Hex(content)}` : "");
  if (!hash) {
    return null;
  }

  const firstSeenAt = normalizeImportTimestamp(row.firstSeenAt, Date.now());
  const lastSeenAt = normalizeImportTimestamp(row.lastSeenAt, firstSeenAt);
  return {
    ...row,
    hash,
    content,
    byteLength: new TextEncoder().encode(content).byteLength,
    firstSeenAt,
    lastSeenAt
  };
}

async function buildProfileTextBlobForImport(content, seenAt) {
  const hash = `sha256:${await sha256Hex(content)}`;
  return {
    hash,
    content,
    byteLength: new TextEncoder().encode(content).byteLength,
    firstSeenAt: seenAt,
    lastSeenAt: seenAt
  };
}

function normalizeLuckyNotificationImportRow(row) {
  if (!isImportObject(row)) {
    return null;
  }

  const normalized = normalizeLuckyNotification(row);
  const status = isLuckyNotificationStatus(row.status) ? row.status : normalized.status;
  const notifiedAt = normalizeImportTimestamp(row.notifiedAt, normalized.notifiedAt);

  return {
    ...row,
    ...normalized,
    status,
    notifiedAt: status === LUCKY_STATUS_NOTIFIED && !notifiedAt ? Date.now() : notifiedAt,
    notificationId: cleanImportText(row.notificationId || normalized.notificationId)
  };
}

function normalizeVisitHistoryImportRow(row) {
  if (!isImportObject(row)) {
    return null;
  }

  const normalized = normalizeVisitHistoryItem(row);
  const now = Date.now();
  const visitedAt = normalizeImportTimestamp(row.visitedAt, now);
  return {
    ...row,
    ...normalized,
    firstVisitedAt: normalizeImportTimestamp(row.firstVisitedAt, visitedAt),
    visitedAt,
    visitCount: Math.max(Math.floor(Number(row.visitCount) || 1), 1),
    updatedAt: normalizeImportTimestamp(row.updatedAt, visitedAt)
  };
}

function normalizeMetaImportRow(row) {
  if (!isImportObject(row)) {
    return null;
  }

  const key = cleanImportText(row.key);
  if (!key) {
    return null;
  }

  return {
    key,
    value: row.value
  };
}

function dedupeImportRows(storeName, rows) {
  const keyPath = DATA_SYNC_STORE_KEYS[storeName];
  const rowMap = new Map();
  for (const row of rows) {
    const key = cleanImportText(row?.[keyPath]);
    if (key) {
      rowMap.set(key, row);
    }
  }

  return [...rowMap.values()];
}

function getImportDetailSource(row, ...keys) {
  for (const key of keys) {
    if (isImportObject(row[key])) {
      return row[key];
    }
  }

  return {};
}

function getMemberIdFromSnapshotId(value) {
  return cleanImportText(value).split(":")[0] || "";
}

function normalizeImportTimestamp(value, fallback) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? Math.floor(timestamp) : fallback;
}

function cleanImportText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isImportObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
