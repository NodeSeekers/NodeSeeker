async function exportConfig() {
  openConfirmDialog({
    title: "导出配置",
    message: "配置文件会包含图床 API Key 和 Telegram Bot Token 等凭据，请勿随意共享该文件。",
    confirmText: "导出"
  }, exportConfigFile);
}

async function exportConfigFile() {
  try {
    const saved = await chrome.storage.local.get(SYNC_CONFIG_DEFAULTS);
    const options = pickSyncConfigOptions(normalizeSyncConfigOptions(saved));
    downloadJsonFile({
      schema: "nodeseek-helper-config",
      version: 1,
      extensionVersion: chrome.runtime.getManifest().version,
      exportedAt: new Date().toISOString(),
      options
    }, `nodeseek-helper-config-${formatSyncFileTimestamp()}.json`);
    showToast("已导出配置");
  } catch (error) {
    showToast(formatToastError(error, "导出配置失败"), "error");
  }
}

function openConfigImportPicker() {
  openConfirmDialog({
    title: "导入配置",
    message: "导入配置会覆盖本地配置，确定继续吗？",
    confirmText: "导入",
    danger: true
  }, () => importConfigFileInput.click());
}

async function importConfigFromFile(event) {
  const file = event.currentTarget.files?.[0];
  event.currentTarget.value = "";
  if (!file) {
    return;
  }

  try {
    const payload = await readJsonFile(file);
    const options = await buildConfigImportOptions(payload);
    await chrome.storage.local.set(options);
    applyOptionsSnapshot(await readStoredOptions());
    await restoreTelegramConfig();
    showToast("已导入配置");
  } catch (error) {
    showToast(formatToastError(error, "导入配置失败"), "error");
  }
}

async function buildConfigImportOptions(payload) {
  const importedValues = extractConfigPayload(payload);
  const currentTelegramConfig = await chrome.storage.local.get(TELEGRAM_SYNC_CONFIG_DEFAULTS);
  return pickSyncConfigOptions(normalizeSyncConfigOptions({
    ...currentTelegramConfig,
    ...importedValues
  }));
}

async function exportDatabaseData() {
  openConfirmDialog({
    title: "导出数据",
    message: "数据备份会包含本机缓存和历史数据，请勿随意共享该文件。",
    confirmText: "导出"
  }, exportDatabaseDataFile);
}

async function exportDatabaseDataFile() {
  try {
    const payload = await sendExtensionMessage("data:exportDatabase");
    downloadJsonFile(payload, `nodeseek-helper-data-${formatSyncFileTimestamp()}.json`);
    showToast("已导出数据");
  } catch (error) {
    showToast(formatToastError(error, "导出数据失败"), "error");
  }
}

function openDataImportPicker() {
  openConfirmDialog({
    title: "导入数据",
    message: "导入数据会写入本地数据库，合并有效记录，确定继续吗？",
    confirmText: "导入",
    danger: true
  }, () => importDataFileInput.click());
}

async function importDatabaseDataFromFile(event) {
  const file = event.currentTarget.files?.[0];
  event.currentTarget.value = "";
  if (!file) {
    return;
  }

  try {
    const data = await readJsonFile(file);
    const result = await sendExtensionMessage("data:importDatabase", { data });
    luckyPage = 0;
    visitHistoryPage = 0;
    await renderLuckyNotifications();
    await renderVisitHistory();
    showToast(`已导入数据 ${result.importedCount} 条，跳过 ${result.skippedCount} 条`);
  } catch (error) {
    showToast(formatToastError(error, "导入数据失败"), "error");
  }
}

function extractConfigPayload(payload) {
  if (!isPlainObject(payload)) {
    throw new Error("配置文件格式不正确");
  }

  if (isPlainObject(payload.options)) {
    return payload.options;
  }

  if (SYNC_CONFIG_KEYS.some((key) => Object.prototype.hasOwnProperty.call(payload, key))) {
    return payload;
  }

  throw new Error("配置文件缺少设置项");
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
