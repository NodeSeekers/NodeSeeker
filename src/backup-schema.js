const BACKUP_CONFIG_SCHEMA = "nodeseek-helper-config";
const BACKUP_CONFIG_VERSION = 2;
const BACKUP_FULL_SCHEMA = "nodeseek-helper-full-backup";
const BACKUP_FULL_VERSION = 1;
const BACKUP_DATABASE_STORE_NAMES = Object.freeze([
  "profiles",
  "profileSnapshots",
  "profileTextBlobs",
  "luckyNotifications",
  "visitHistory",
  "meta"
]);

// These values represent unfinished external actions or temporary UI sessions.
// Restoring them could replay messages, reads, or one-time Telegram commands.
const BACKUP_OMITTED_LOCAL_KEYS = Object.freeze([
  "telegramPendingTopicUpdates",
  "telegramPendingTopicImageMarkdowns",
  "telegramPendingTopicReadUserIds",
  "telegramPendingPersonalStartUpdates",
  "telegramPendingDirectTopics",
  "telegramPendingPersonalChatId",
  "telegramPendingPersonalTargetName",
  "telegramPendingPersonalStartUpdateId",
  "telegramPersonalStartWatchUntil",
  "telegramPersonalStartWatchSince",
  "telegramPersonalStartRepliedUpdateId",
  "telegramDirectTopicScanUntil",
  "telegramRetryStates",
  "telegramUpdatesRetryState",
  "telegramActivityStatus:at",
  "telegramActivityStatus:reply",
  "telegramMonitorLastCheck",
  "telegramMonitorLastError",
  "telegramRssLastCheck",
  "telegramRssLastError",
  "telegramChatId",
  "telegramMentionReplyNotificationsEnabled",
  "nshBackupRestoreInProgress",
  "nshPostSwitcherSequence",
  "nshPublishShortcutDebug"
]);

const BACKUP_LOCAL_KEYS_PRESERVED_ON_RESTORE = Object.freeze([
  "nshPreloadedConfigImported"
]);
