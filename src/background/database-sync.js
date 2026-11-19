const DATA_SYNC_SCHEMA = "nodeseek-helper-data";
const DATA_SYNC_VERSION = 1;
const DATA_SYNC_STORE_NAMES = BACKUP_DATABASE_STORE_NAMES;
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

  storesData[STORE_META] = storesData[STORE_META].filter((row) => row.key !== FULL_BACKUP_RESTORE_JOURNAL_KEY);
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
  await writeNormalizedDatabase(normalized, false);

  scheduleLuckyNotificationAlarmSync();
  scheduleProfileRetentionPrune(true);

  return {
    imported: true,
    importedCount: normalized.importedCount,
    skippedCount: normalized.skippedCount,
    counts: normalized.counts
  };
}

const FULL_BACKUP_RESTORE_JOURNAL_KEY = "nshFullBackupRestoreJournal";
let fullBackupRestoreInProgress = false;
let backupRecoveryAtStartup = null;
const activeBackgroundOperations = new Set();

function runBackgroundOperation(operation) {
  if (fullBackupRestoreInProgress) return Promise.reject(new Error("正在恢复备份，请稍后重试"));
  const task = (backupRecoveryAtStartup || Promise.resolve()).then(() => {
    if (fullBackupRestoreInProgress) throw new Error("正在恢复备份，请稍后重试");
    return operation();
  });
  activeBackgroundOperations.add(task);
  return task.finally(() => activeBackgroundOperations.delete(task));
}

async function recoverInterruptedFullBackup() {
  const journal = await withTransaction([STORE_META], "readonly", ({ meta }) =>
    requestToPromise(meta.get(FULL_BACKUP_RESTORE_JOURNAL_KEY)));
  if (journal) {
    await replaceLocalStorageState(journal.value, journal.markPreloadedConfigImported !== false);
    await clearFullBackupRestoreJournal();
  }
}

function clearFullBackupRestoreJournal() {
  return withTransaction([STORE_META], "readwrite", ({ meta }) =>
    requestToPromise(meta.delete(FULL_BACKUP_RESTORE_JOURNAL_KEY)));
}

async function restoreBackupConfiguration(configuration) {
  if (!isImportObject(configuration)) throw new Error("配置备份格式不正确");
  await backupRecoveryAtStartup;
  if (fullBackupRestoreInProgress) throw new Error("正在恢复备份，请稍后重试");
  fullBackupRestoreInProgress = true;
  try {
    await Promise.allSettled([...activeBackgroundOperations]);
    const old = await chrome.storage.local.get({ telegramBotToken: "", telegramTargets: [] });
    await chrome.storage.local.set(configuration);
    await chrome.storage.local.remove(["telegramMentionReplyNotificationsEnabled", "telegramChatId"]);
    if (old.telegramBotToken !== configuration.telegramBotToken
        || JSON.stringify(old.telegramTargets) !== JSON.stringify(configuration.telegramTargets)) {
      await chrome.storage.local.remove([
        ...(old.telegramBotToken !== configuration.telegramBotToken ? ["telegramPersonalStartOffset"] : []),
        "telegramProcessedTopicUpdateIds",
        "telegramPendingTopicUpdates", "telegramPendingTopicImageMarkdowns", "telegramPendingTopicReadUserIds",
        "telegramPendingPersonalStartUpdates", "telegramPendingDirectTopics",
        "telegramOutgoingMessageEchoes", "telegramOutgoingMessageReadStatuses",
        "telegramDeliveryReceipts", "telegramActivityCommentReceipts", "telegramRetryStates", "telegramUpdatesRetryState"
      ]);
    }
  } finally {
    fullBackupRestoreInProgress = false;
    resumeBackgroundAfterBackupRestore();
  }
  return { imported: true };
}

function resumeBackgroundAfterBackupRestore() {
  scheduleLuckyNotificationAlarmSync();
  scheduleProfileRetentionPrune(true);
  runBackgroundOperation(() => scheduleTelegramMonitorAlarm({ checkImmediately: true })).catch(() => {});
  runBackgroundOperation(scheduleAutoAttendanceAlarm).catch(() => {});
}

async function restoreFullBackup(payload) {
  if (!isImportObject(payload?.configuration)
      || !isImportObject(payload?.localState)
      || !isImportObject(payload?.database)
      || payload.database.schema !== DATA_SYNC_SCHEMA
      || !isImportObject(payload.database.stores)) {
    throw new Error("完整备份文件格式不正确");
  }

  for (const storeName of DATA_SYNC_STORE_NAMES) {
    if (!Array.isArray(payload.database.stores[storeName])) {
      throw new Error(`完整备份缺少资料表：${storeName}`);
    }
  }
  const unknownStores = Object.keys(payload.database.stores)
    .filter((storeName) => !DATA_SYNC_STORE_NAMES.includes(storeName));
  if (unknownStores.length > 0) {
    throw new Error(`当前版本无法恢复资料表：${unknownStores.join("、")}`);
  }

  const normalized = await normalizeDatabaseImportPayload(payload.database, { allowEmpty: true });
  if (normalized.skippedCount > 0) {
    throw new Error(`完整备份中有 ${normalized.skippedCount} 条无法识别的数据；未执行恢复`);
  }

  const omittedKeys = new Set(BACKUP_OMITTED_LOCAL_KEYS);
  const nextLocalState = Object.fromEntries(Object.entries({
    ...payload.localState,
    ...payload.configuration
  }).filter(([key]) => !omittedKeys.has(key) && !key.startsWith("nshPostSwitcherSequence:")));

  await backupRecoveryAtStartup;
  if (fullBackupRestoreInProgress) throw new Error("正在恢复备份，请稍后重试");
  fullBackupRestoreInProgress = true;
  let previousDatabase;
  let previousLocalState;
  let databaseReplaced = false;
  let recoveryRequired = false;
  try {
    await Promise.allSettled([...activeBackgroundOperations]);
    previousDatabase = await exportDatabaseData();
    previousLocalState = await chrome.storage.local.get(null);
    await writeNormalizedDatabase(normalized, true, nextLocalState);
    databaseReplaced = true;
    await replaceLocalStorageState(nextLocalState, true);
    await clearFullBackupRestoreJournal();
  } catch (error) {
    if (databaseReplaced) {
      try {
        const previousNormalized = await normalizeDatabaseImportPayload(previousDatabase, { allowEmpty: true });
        await writeNormalizedDatabase(previousNormalized, true, previousLocalState, false);
        await replaceLocalStorageState(previousLocalState, false);
        await clearFullBackupRestoreJournal();
      } catch (rollbackError) {
        recoveryRequired = true;
        throw new Error(`完整恢复失败，自动回滚也失败：${String(rollbackError?.message || rollbackError).slice(0, 180)}`);
      }
    }
    throw error;
  } finally {
    fullBackupRestoreInProgress = recoveryRequired;
    if (!recoveryRequired) resumeBackgroundAfterBackupRestore();
  }

  return {
    imported: true,
    importedCount: normalized.importedCount,
    skippedCount: 0,
    counts: normalized.counts
  };
}

async function writeNormalizedDatabase(normalized, replace, localState, markPreloadedConfigImported = true) {
  await withTransaction(DATA_SYNC_STORE_NAMES, "readwrite", async (stores) => {
    for (const storeName of DATA_SYNC_STORE_NAMES) {
      if (replace) await requestToPromise(stores[storeName].clear());
      for (const item of normalized.stores[storeName]) {
        if (storeName !== STORE_META || item.key !== FULL_BACKUP_RESTORE_JOURNAL_KEY) {
          await requestToPromise(stores[storeName].put(item));
        }
      }
    }
    if (localState) await requestToPromise(stores[STORE_META].put({
      key: FULL_BACKUP_RESTORE_JOURNAL_KEY, value: localState, markPreloadedConfigImported
    }));
  });
}

async function replaceLocalStorageState(values, markPreloadedConfigImported) {
  const replacement = { ...values };
  if (markPreloadedConfigImported) {
    replacement.nshPreloadedConfigImported = true;
  }
  delete replacement.nshBackupRestoreInProgress;

  await chrome.storage.local.set({
    ...replacement,
    telegramMonitorPaused: true,
    nshBackupRestoreInProgress: true
  });

  const current = await chrome.storage.local.get(null);
  const keysToRemove = Object.keys(current).filter((key) => !Object.hasOwn(replacement, key)
    && key !== "nshBackupRestoreInProgress" && key !== "telegramMonitorPaused");
  if (keysToRemove.length > 0) await chrome.storage.local.remove(keysToRemove);

  await chrome.storage.local.set({
    telegramMonitorPaused: replacement.telegramMonitorPaused === true
  });
  await chrome.storage.local.remove("nshBackupRestoreInProgress");
}

async function normalizeDatabaseImportPayload(payload, { allowEmpty = false } = {}) {
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

  if (importedCount === 0 && !allowEmpty) {
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
