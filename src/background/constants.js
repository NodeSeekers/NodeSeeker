const DEFAULT_OPTIONS = {
  imageUploadEnabled: true,
  uploadEndpoint: "https://api.nodeimage.com/api/upload",
  uploadFieldName: "image",
  apiKey: "",
  markdownAltText: "image",
  luckyNotificationsEnabled: true,
  attendanceReminderEnabled: true,
  profileRetentionDays: 0
};
const LEGACY_STORAGE_KEYS = [
  "nshProfileCache",
  "nshProfileHistory",
  "nshLuckyNotifications"
];
const DB_NAME = "nodeseek-helper";
const DB_VERSION = 2;
const STORE_PROFILES = "profiles";
const STORE_PROFILE_SNAPSHOTS = "profileSnapshots";
const STORE_PROFILE_TEXT_BLOBS = "profileTextBlobs";
const STORE_LUCKY_NOTIFICATIONS = "luckyNotifications";
const STORE_VISIT_HISTORY = "visitHistory";
const STORE_META = "meta";
const PROFILE_TEXT_FIELDS = ["readme"];
const LUCKY_ALARM_NAME = "nshLucky:next";
const TELEGRAM_MESSAGE_ALARM_NAME = "nshTelegram:monitor";
const TELEGRAM_FAST_MONITOR_ALARM_NAMES = Object.freeze([
  "nshTelegram:monitor-10s-1",
  "nshTelegram:monitor-10s-2",
  "nshTelegram:monitor-10s-3"
]);
const TELEGRAM_RSS_ALARM_NAME = "nshTelegram:rss";
const TELEGRAM_UPDATES_WATCHDOG_ALARM_NAME = "nshTelegram:updates-watchdog";
const TELEGRAM_PERSONAL_START_ALARM_NAME = "nshTelegram:personal-start";
const LEGACY_LUCKY_ALARM_PREFIX = "nshLucky:";
const LUCKY_NOTIFICATION_PREFIX = "nshLuckyNotification:";
const LUCKY_NOTIFICATION_ICON = "assets/icon128.png";
const ATTENDANCE_REMINDER_STORAGE_KEY = "nshAttendanceReminder";
const LUCKY_STATUS_PENDING = "pending";
const LUCKY_STATUS_NOTIFIED = "notified";
const LUCKY_RESULT_WON = "won";
const LUCKY_RESULT_LOST = "lost";
const LUCKY_RESULT_UNKNOWN = "unknown";
const PROFILE_RETENTION_META_KEY = "profileRetentionLastPrunedAt";
const PROFILE_RETENTION_PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
