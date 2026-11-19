async function exportConfig() {
  openConfirmDialog({
    title: "导出配置",
    message: "配置备份包含全部插件设置、内容规则、Telegram 推送目标和 Bot Token。文件含敏感凭据，请妥善保管。",
    confirmText: "导出"
  }, exportConfigFile);
}

async function exportConfigFile() {
  try {
    const saved = await chrome.storage.local.get(null);
    const options = normalizeConfigBackupOptions(saved);
    downloadJsonFile({
      schema: BACKUP_CONFIG_SCHEMA,
      version: BACKUP_CONFIG_VERSION,
      extensionVersion: chrome.runtime.getManifest().version,
      exportedAt: new Date().toISOString(),
      options
    }, `nodeseeker-helper-config-${formatSyncFileTimestamp()}.json`);
    showToast("已导出配置");
  } catch (error) {
    showToast(formatToastError(error, "导出配置失败"), "error");
  }
}

async function exportFullBackup() {
  openConfirmDialog({
    title: "完整导出",
    message: "完整备份包含全部设置、本地资料库和同步进度。未完成的 Telegram 发送任务不会备份。文件含 API Key、Bot Token 和本地历史，请妥善保管。",
    confirmText: "导出"
  }, exportFullBackupFile);
}

async function exportFullBackupFile() {
  try {
    const saved = await chrome.storage.local.get(null);
    const options = normalizeConfigBackupOptions(saved);
    const omittedKeys = new Set([
      ...BACKUP_OMITTED_LOCAL_KEYS,
      ...CONFIG_BACKUP_KEYS,
      ...BACKUP_LOCAL_KEYS_PRESERVED_ON_RESTORE
    ]);
    const localState = Object.fromEntries(Object.entries(saved)
      .filter(([key]) => !omittedKeys.has(key) && !key.startsWith("nshPostSwitcherSequence:")));
    const database = await sendExtensionMessage("data:exportDatabase");

    downloadJsonFile({
      schema: BACKUP_FULL_SCHEMA,
      version: BACKUP_FULL_VERSION,
      extensionVersion: chrome.runtime.getManifest().version,
      exportedAt: new Date().toISOString(),
      configuration: {
        schema: BACKUP_CONFIG_SCHEMA,
        version: BACKUP_CONFIG_VERSION,
        options
      },
      localState,
      database
    }, `nodeseeker-helper-full-backup-${formatSyncFileTimestamp()}.json`);
    showToast("已导出完整备份");
  } catch (error) {
    showToast(formatToastError(error, "完整导出失败"), "error");
  }
}

function openBackupRestorePicker() {
  restoreBackupFileInput.click();
}

async function restoreBackupFromFile(event) {
  const file = event.currentTarget.files?.[0];
  event.currentTarget.value = "";
  if (!file) return;

  try {
    const payload = await readJsonFile(file);
    const backupType = detectBackupType(payload);
    if (backupType === "config") {
      openConfirmDialog({
        title: "恢复配置",
        message: "将覆盖当前插件设置和 Telegram 对话映射，不会改动本地资料库。",
        confirmText: "恢复",
        danger: true
      }, () => restoreConfigBackup(payload));
      return;
    }

    if (backupType === "full") {
      openConfirmDialog({
        title: "完整恢复",
        message: "将覆盖当前设置、同步状态和本地资料库。当前资料会被替换；未完成的 Telegram 发送和重试任务会清除，不会自动重发。",
        confirmText: "完整恢复",
        danger: true
      }, () => restoreFullBackupFile(payload));
      return;
    }

    openConfirmDialog({
      title: "恢复旧版数据备份",
      message: "这个旧版文件只包含 IndexedDB 资料，不含设置。数据会合并到本机；设置保持不变。",
      confirmText: "导入",
      danger: true
    }, () => restoreLegacyDatabaseBackup(payload));
  } catch (error) {
    showToast(formatToastError(error, "无法识别备份文件"), "error");
  }
}

async function restoreConfigBackup(payload) {
  try {
    const options = await buildConfigImportOptions(payload);
    await sendExtensionMessage("data:restoreConfig", { configuration: options });
    await refreshAfterBackupRestore();
    showToast("已恢复配置");
  } catch (error) {
    showToast(formatToastError(error, "恢复配置失败"), "error");
  }
}

async function restoreFullBackupFile(payload) {
  try {
    const options = await buildConfigImportOptions(payload.configuration);
    const localState = normalizeFullBackupLocalState(payload.localState);
    const database = validateFullBackupDatabase(payload.database);
    const result = await sendExtensionMessage("data:restoreFullBackup", {
      configuration: options,
      localState,
      database
    });
    await refreshAfterBackupRestore();
    showToast(`已完整恢复：${result.importedCount} 条资料`);
  } catch (error) {
    showToast(formatToastError(error, "完整恢复失败"), "error");
  }
}

async function restoreLegacyDatabaseBackup(payload) {
  try {
    const result = await sendExtensionMessage("data:importDatabase", { data: payload });
    await renderLocalDatabaseViews();
    showToast(`已导入 ${result.importedCount} 条数据，跳过 ${result.skippedCount} 条`);
  } catch (error) {
    showToast(formatToastError(error, "恢复旧版数据失败"), "error");
  }
}

async function refreshAfterBackupRestore() {
  applyOptionsSnapshot(await readStoredOptions());
  await restoreTelegramConfig();
  await renderLocalDatabaseViews();
  const telegramHistory = await chrome.storage.local.get({ telegramRssHistory: [] });
  renderTelegramHistory(telegramHistory.telegramRssHistory);
}

async function renderLocalDatabaseViews() {
  luckyPage = 0;
  visitHistoryPage = 0;
  await renderLuckyNotifications();
  await renderVisitHistory();
}

async function buildConfigImportOptions(payload) {
  const importedValues = { ...extractConfigPayload(payload) };
  if (typeof importedValues.telegramMentionReplyNotificationsEnabled === "boolean") {
    if (!Object.hasOwn(importedValues, "telegramMentionNotificationsEnabled")) {
      importedValues.telegramMentionNotificationsEnabled = importedValues.telegramMentionReplyNotificationsEnabled;
    }
    if (!Object.hasOwn(importedValues, "telegramReplyNotificationsEnabled")) {
      importedValues.telegramReplyNotificationsEnabled = importedValues.telegramMentionReplyNotificationsEnabled;
    }
    delete importedValues.telegramMentionReplyNotificationsEnabled;
  }

  const currentConfig = await chrome.storage.local.get(CONFIG_BACKUP_DEFAULTS);
  return pickConfigBackupOptions(normalizeConfigBackupOptions({
    ...currentConfig,
    ...importedValues
  }));
}

function detectBackupType(payload) {
  if (!isPlainObject(payload)) {
    throw new Error("备份文件格式不正确");
  }

  if (payload.schema === BACKUP_FULL_SCHEMA
      && payload.version === BACKUP_FULL_VERSION
      && isPlainObject(payload.configuration)
      && isPlainObject(payload.configuration.options)
      && isPlainObject(payload.localState)
      && isPlainObject(payload.database)) {
    return "full";
  }

  if (payload.schema === BACKUP_CONFIG_SCHEMA
      && [1, BACKUP_CONFIG_VERSION].includes(payload.version)
      && isPlainObject(payload.options)) {
    return "config";
  }

  if (SYNC_CONFIG_KEYS.some((key) => Object.prototype.hasOwnProperty.call(payload, key))) {
    return "config";
  }

  if (payload.schema === "nodeseek-helper-data"
      || BACKUP_DATABASE_STORE_NAMES.some((storeName) => Object.hasOwn(payload, storeName))
      || isPlainObject(payload.stores)) {
    return "legacy-data";
  }

  throw new Error("文件不是受支持的配置或完整备份");
}

function normalizeFullBackupLocalState(value) {
  if (!isPlainObject(value)) {
    throw new Error("完整备份缺少本机状态");
  }

  const excluded = new Set([
    ...BACKUP_OMITTED_LOCAL_KEYS,
    ...CONFIG_BACKUP_KEYS,
    ...BACKUP_LOCAL_KEYS_PRESERVED_ON_RESTORE
  ]);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !excluded.has(key)));
}

function validateFullBackupDatabase(database) {
  if (!isPlainObject(database)
      || database.schema !== "nodeseek-helper-data"
      || database.version !== 1
      || !isPlainObject(database.stores)) {
    throw new Error("完整备份中的资料库格式不正确");
  }

  for (const storeName of BACKUP_DATABASE_STORE_NAMES) {
    if (!Array.isArray(database.stores[storeName])) {
      throw new Error(`完整备份缺少资料表：${storeName}`);
    }
  }
  return database;
}

function extractConfigPayload(payload) {
  if (!isPlainObject(payload)) {
    throw new Error("配置文件格式不正确");
  }

  if (isPlainObject(payload.configuration?.options)) {
    return payload.configuration.options;
  }
  if (isPlainObject(payload.options)) {
    return payload.options;
  }

  if (CONFIG_BACKUP_KEYS.some((key) => Object.prototype.hasOwnProperty.call(payload, key))) {
    return payload;
  }

  throw new Error("配置文件缺少设置项");
}

function normalizeConfigBackupOptions(value) {
  const raw = isPlainObject(value) ? value : {};
  const syncOptions = normalizeSyncConfigOptions({
    ...SYNC_CONFIG_DEFAULTS,
    ...raw
  });
  const extras = Object.fromEntries(Object.entries(CONFIG_BACKUP_EXTRA_DEFAULTS).map(([key, fallback]) => {
    const item = Object.hasOwn(raw, key) ? raw[key] : fallback;
    if (Array.isArray(fallback)) return [key, Array.isArray(item) ? item : []];
    if (typeof fallback === "number") {
      const number = Number(item);
      return [key, Number.isFinite(number) ? number : fallback];
    }
    if (key === "telegramNotificationDefaultsMigrationV1") return [key, true];
    return [key, item == null ? fallback : item];
  }));

  return {
    ...pickSyncConfigOptions(syncOptions),
    ...extras
  };
}

function normalizeSyncConfigOptions(value) {
  const options = normalizeStoredOptions({
    ...SYNC_CONFIG_DEFAULTS,
    ...(isPlainObject(value) ? value : {})
  });

  return {
    ...options,
    apiKey: normalizeSyncString(options.apiKey, ""),
    uploadFieldName: normalizeSyncString(options.uploadFieldName, SYNC_CONFIG_DEFAULTS.uploadFieldName),
    markdownAltText: normalizeSyncString(options.markdownAltText, SYNC_CONFIG_DEFAULTS.markdownAltText)
  };
}

function pickSyncConfigOptions(options) {
  return Object.fromEntries(SYNC_CONFIG_KEYS.map((key) => [key, options[key]]));
}

function pickConfigBackupOptions(options) {
  return Object.fromEntries(CONFIG_BACKUP_KEYS.map((key) => [key, options[key]]));
}

function normalizeSyncString(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

async function readJsonFile(file) {
  let text = "";
  try {
    text = await file.text();
  } catch (_error) {
    throw new Error("读取文件失败");
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    throw new Error("JSON 文件格式不正确");
  }
}

function downloadJsonFile(payload, fileName) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function formatSyncFileTimestamp(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[:]/g, "-");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
