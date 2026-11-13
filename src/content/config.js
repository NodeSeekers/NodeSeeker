const INSERT_EVENT = "nodeseek-helper:insert-markdown";
const FOCUS_EVENT = "nodeseek-helper:focus-editor";
const RESULT_EVENT = "nodeseek-helper:insert-result";
const SELECTION_EVENT = "nodeseek-helper:get-editor-selection";
const SELECTION_RESULT_EVENT = "nodeseek-helper:editor-selection-result";
const AUTO_PAGE_COMMENTS_EVENT = "nodeseek-helper:append-post-comments";
const DEFAULT_LEVEL_COLORS = {
  1: "#ffffff",
  2: "#2ea043",
  3: "#0969da",
  4: "#8250df",
  5: "#ff61c0",
  6: "#fb8500"
};
const PROFILE_FIELD_DEFINITIONS = [
  { key: "member_id", label: "ID" },
  { key: "member_name", label: "用户" },
  { key: "isAdmin", label: "管理", type: "booleanNumber" },
  { key: "rank", label: "Lv", enabledByDefault: true },
  { key: "coin", label: "鸡腿", enabledByDefault: true },
  { key: "stardust", label: "星辰" },
  { key: "created_at", label: "注册", type: "datetime" },
  { key: "nPost", label: "主题", enabledByDefault: true },
  { key: "nComment", label: "评论", enabledByDefault: true },
  { key: "follows", label: "关注" },
  { key: "fans", label: "粉丝" },
  { key: "collectionCount", label: "收藏" },
  { key: "created_at_str", label: "加入", enabledByDefault: true },
  { key: "roles", label: "角色", type: "array" },
  { key: "followed", label: "已关注", type: "boolean" }
];
const DEFAULT_PROFILE_LABEL_KEYS = PROFILE_FIELD_DEFINITIONS
  .filter((field) => field.enabledByDefault)
  .map((field) => field.key);
const PROFILE_LABEL_SIZE_OPTIONS = ["large", "standard", "small"];
const DEFAULT_PROFILE_LABEL_SIZE = "standard";
const DEFAULT_FOLLOW_RULES = {
  keywordGroups: [],
  userGroups: []
};
const DEFAULT_OPTIONS = {
  imageUploadEnabled: true,
  uploadEndpoint: "https://api.nodeimage.com/api/upload",
  uploadFieldName: "image",
  apiKey: "",
  markdownAltText: "image",
  userStatsEnabled: true,
  profileTrend7DaysEnabled: true,
  profileTrend30DaysEnabled: true,
  profileHoverSignatureEnabled: true,
  userCacheHours: 24,
  profileRetentionDays: 0,
  blockFilterEnabled: true,
  blockFilterQuickKeywordEnabled: true,
  blockFilterQuickUserEnabled: true,
  blockedKeywords: [],
  blockedUsers: [],
  followRules: DEFAULT_FOLLOW_RULES,
  readingNavigationEnabled: true,
  attendanceReminderEnabled: true,
  autoAttendanceEnabled: false,
  autoAttendanceMode: "random",
  linkPurifierEnabled: true,
  imagePreviewEnabled: true,
  messageEntryEnabled: true,
  editorToolsEnabled: true,
  postSwitcherEnabled: true,
  autoPageEnabled: true,
  autoPageAppendEnabled: true,
  autoPageDelayMs: 100,
  ...DEFAULT_READING_SHORTCUTS,
  quickPhrasesEnabled: true,
  quickPhrases: [],
  luckyNotificationsEnabled: true,
  luckyAutoAddEnabled: true,
  profileLabelKeys: DEFAULT_PROFILE_LABEL_KEYS,
  profileLabelSize: DEFAULT_PROFILE_LABEL_SIZE,
  levelColors: DEFAULT_LEVEL_COLORS
};
const MIN_USER_CACHE_HOURS = 12;
const MIN_AUTO_PAGE_DELAY_MS = 0;
const AUTO_PAGE_BOTTOM_THRESHOLD = 12;
const AUTO_PAGE_TOUCH_THRESHOLD = 24;
const LUCKY_NAV_BUTTON_GAP = 40;
const ATTENDANCE_REMINDER_STORAGE_KEY = "nshAttendanceReminder";
const PROFILE_STATS_RIGHT_GAP = 10;
const PROFILE_TREND_DAYS = 30;
const PROFILE_TREND_RECENT_DAYS = 7;
const PROFILE_TREND_HIDE_DELAY_MS = 180;
const PROFILE_PROGRESS_CACHE_TTL_MS = 30 * 1000;
const PROFILE_TREND_CHART_FIELDS = [
  { key: "coin", label: "鸡腿", color: "#fb8500" },
  { key: "nPost", label: "主题", color: "#0969da" },
  { key: "nComment", label: "评论", color: "#8250df" },
  { key: "stardust", label: "星辰", color: "#d73a7f" }
];
const PROFILE_DETAIL_TEXT_FIELDS = ["readme"];
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const PROFILE_CACHE = new Map();
let luckyPositionFrame = 0;
let profileStatsResizeFrame = 0;
let profileTrendPopup = null;
let profileTrendAnchor = null;
let profileTrendHideTimer = 0;
let profileTrendRequestId = 0;
let profileProgressPopup = null;
let profileProgressAnchor = null;
let profileProgressHideTimer = 0;
let profileProgressRequestId = 0;
let profileProgressCache = null;
let profileProgressCacheLoadedAt = 0;
let profileProgressPromise = null;
let profileProgressPromiseMemberId = "";
let levelColorsPromise = null;
let featureOptions = { ...DEFAULT_OPTIONS };
let attendanceReminderPromise = null;
let attendanceReminderPromiseDateKey = "";
let autoPageNavigating = false;
let autoPageRequiresBottomReset = false;
let autoPageRequiresTopReset = false;
let autoPageBottomArmed = false;
let autoPageTopArmed = false;
let autoPageBottomArmTimer = 0;
let autoPageTopArmTimer = 0;
let autoPageTouchStartY = 0;
let autoPageAppendLoading = false;
let autoPageAppendInitialized = false;
let autoPageAppendBaseUrl = "";
let autoPageAppendNextUrl = "";
let autoPageAppendLoadedUrls = new Set();
let autoPageReplyEditor = null;
let autoPageWaitForReplyScroll = false;
let autoPageReplyScrollY = 0;
let blockFilterSelectionBubble = null;
let blockFilterSelectionKeyword = "";
let blockFilterSelectionType = "keyword";
let blockFilterSelectionHideTimer = 0;

function normalizeBlockFilterList(value) {
  const entries = Array.isArray(value)
    ? value
    : String(value || "").split(/\r?\n/);

  return [...new Set(
    entries
      .map((entry) => String(entry || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
  )];
}

function normalizeQuickPhrases(value) {
  const entries = Array.isArray(value)
    ? value
    : (String(value || "").trim() ? [value] : []);
  const seen = new Set();
  const phrases = [];

  entries.forEach((entry) => {
    const phrase = String(entry || "").replace(/\r\n?/g, "\n").trim();
    if (!phrase || seen.has(phrase)) {
      return;
    }

    seen.add(phrase);
    phrases.push(phrase);
  });

  return phrases;
}

function normalizeProfileLabelSize(value) {
  return PROFILE_LABEL_SIZE_OPTIONS.includes(value) ? value : DEFAULT_PROFILE_LABEL_SIZE;
}
