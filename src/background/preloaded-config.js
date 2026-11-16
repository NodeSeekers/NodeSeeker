const PRELOADED_CONFIG_STORAGE_KEYS = Object.freeze([
  "imageUploadEnabled",
  "uploadFieldName",
  "apiKey",
  "markdownAltText",
  "userStatsEnabled",
  "profileTrend7DaysEnabled",
  "profileTrend30DaysEnabled",
  "profileHoverSignatureEnabled",
  "profileHoverTrendEnabled",
  "userCacheHours",
  "profileRetentionDays",
  "blockFilterEnabled",
  "blockFilterQuickKeywordEnabled",
  "blockFilterQuickUserEnabled",
  "blockedKeywords",
  "blockedUsers",
  "followRules",
  "readingNavigationEnabled",
  "attendanceReminderEnabled",
  "autoAttendanceEnabled",
  "autoAttendanceMode",
  "imagePreviewEnabled",
  "messageEntryEnabled",
  "editorToolsEnabled",
  "postSwitcherEnabled",
  "autoPageEnabled",
  "autoPageAppendEnabled",
  "autoPageDelayMs",
  "postPagePreviousShortcut",
  "postPageNextShortcut",
  "postSwitcherPreviousShortcut",
  "postSwitcherNextShortcut",
  "quickReplyShortcut",
  "replySubmitShortcut",
  "quickPhrasesEnabled",
  "quickPhrases",
  "luckyNotificationsEnabled",
  "luckyAutoAddEnabled",
  "profileLabelKeys",
  "profileLabelSize",
  "levelColors",
  "telegramMessageNotificationsEnabled",
  "telegramPostNotificationsEnabled",
  "telegramMentionNotificationsEnabled",
  "telegramReplyNotificationsEnabled",
  "telegramMonitorIntervalSeconds",
  "telegramOfflineMessageSyncEnabled",
  "telegramSilentPushEnabled",
  "telegramRssMonitorIntervalSeconds",
  "telegramBotToken",
  "telegramTargets",
  "telegramKeywordRules",
  "telegramBlockedKeywords",
  "telegramBoardSlugs",
  "telegramMonitorPaused",
  "telegramMessageCursors",
  "telegramMentionReplyCursors",
  "telegramRssInitialized",
  "telegramRssSeenIds"
]);
const PRELOADED_CONFIG_SCHEMA = "nodeseek-helper-preloaded-config";
const PRELOADED_CONFIG_MARKER_KEY = "nshPreloadedConfigImported";

async function importPreloadedConfiguration() {
  const saved = await chrome.storage.local.get([
    ...PRELOADED_CONFIG_STORAGE_KEYS,
    PRELOADED_CONFIG_MARKER_KEY
  ]);
  if (saved[PRELOADED_CONFIG_MARKER_KEY]) {
    return false;
  }

  let response;
  try {
    response = await fetch(chrome.runtime.getURL("nsh-preloaded-config.json"));
  } catch (_error) {
    return false;
  }
  if (!response.ok) return false;

  let payload;
  try {
    payload = await response.json();
  } catch (_error) {
    return false;
  }
  if (payload?.schema !== PRELOADED_CONFIG_SCHEMA
      || payload?.version !== 1
      || !payload.options
      || typeof payload.options !== "object"
      || Array.isArray(payload.options)) {
    return false;
  }

  const options = Object.fromEntries(PRELOADED_CONFIG_STORAGE_KEYS
    .filter((key) => !Object.prototype.hasOwnProperty.call(saved, key)
      && Object.prototype.hasOwnProperty.call(payload.options, key))
    .map((key) => [key, payload.options[key]]));
  if (Object.keys(options).length === 0) return false;

  await chrome.storage.local.set({ ...options, [PRELOADED_CONFIG_MARKER_KEY]: true });
  return true;
}
