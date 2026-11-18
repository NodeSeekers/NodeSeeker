const TELEGRAM_KEYS = {
  token: "telegramBotToken",
  targets: "telegramTargets",
  messagesEnabled: "telegramMessageNotificationsEnabled",
  postsEnabled: "telegramPostNotificationsEnabled",
  mentionEnabled: "telegramMentionNotificationsEnabled",
  replyEnabled: "telegramReplyNotificationsEnabled",
  systemFollowEnabled: "telegramSystemFollowNotificationsEnabled",
  systemFeedEnabled: "telegramSystemFeedNotificationsEnabled",
  systemLikeEnabled: "telegramSystemLikeNotificationsEnabled",
  keywords: "telegramKeywordRules",
  blockedKeywords: "telegramBlockedKeywords",
  boards: "telegramBoardSlugs",
  messageCursors: "telegramMessageCursors",
  outgoingMessageEchoes: "telegramOutgoingMessageEchoes",
  outgoingReadStatuses: "telegramOutgoingMessageReadStatuses",
  topicReadMarkerIconId: "telegramTopicUnreadDistortedFaceIconCustomEmojiId",
  systemNotificationUserId: "telegramSystemNotificationUserId",
  managedTopics: "telegramManagedTopics",
  settingsTopics: "telegramSettingsTopics",
  settingsTopicIconId: "telegramSettingsTopicIconId",
  settingsTopicIconVersion: "telegramSettingsTopicIconVersion",
  deliveryReceipts: "telegramDeliveryReceipts",
  processedTopicUpdates: "telegramProcessedTopicUpdateIds",
  pendingTopicUpdates: "telegramPendingTopicUpdates",
  pendingStartUpdates: "telegramPendingPersonalStartUpdates",
  retryStates: "telegramRetryStates",
  updatesRetryState: "telegramUpdatesRetryState",
  pendingTopicImageMarkdowns: "telegramPendingTopicImageMarkdowns",
  pendingTopicReadUserIds: "telegramPendingTopicReadUserIds",
  mentionReplyCursors: "telegramMentionReplyCursors",
  activityCommentReceipts: "telegramActivityCommentReceipts",
  rssSeenIds: "telegramRssSeenIds",
  rssInitialized: "telegramRssInitialized",
  rssHistory: "telegramRssHistory",
  paused: "telegramMonitorPaused",
  lastCheck: "telegramMonitorLastCheck",
  lastError: "telegramMonitorLastError"
};
const TELEGRAM_RSS_URL = "https://rss.nodeseek.com/";
const TELEGRAM_RSS_HISTORY_LIMIT = 100;
const TELEGRAM_RSS_SEEN_LIMIT = 500;
const TELEGRAM_ACTIVITY_CURSOR_LIMIT = 500;
const TELEGRAM_ACTIVITY_COMMENT_RECEIPT_LIMIT = 1000;
const TELEGRAM_ACTIVITY_PAGE_LIMIT = 20;
const TELEGRAM_ACTIVITY_PAGE_SIZE = 10;
const TELEGRAM_OUTGOING_ECHO_LIMIT = 200;
const TELEGRAM_OUTGOING_ECHO_TTL_MS = 2 * 60 * 60 * 1000;
const TELEGRAM_OUTGOING_ECHO_PENDING_TIMEOUT_MS = 30 * 1000;
const TELEGRAM_TOPIC_UNREAD_MARKER_TYPE = "topic-icon-eyes";
const TELEGRAM_SETTINGS_CALLBACK_PREFIX = "nsh:";
const TELEGRAM_SETTINGS_DIALOGS_PAGE_SIZE = 8;
const TELEGRAM_TOPIC_STYLES = Object.freeze({
  system: Object.freeze({ name: "系统", iconCustomEmojiId: "5309984423003823246", iconColor: 16766590 }),
  rss: Object.freeze({ name: "监控", iconCustomEmojiId: "5309965701241379366", iconColor: 9367192 }),
  mention: Object.freeze({ name: "提及", iconCustomEmojiId: "5379748062124056162", iconColor: 16478047 }),
  reply: Object.freeze({ name: "回复", iconCustomEmojiId: "5417915203100613993", iconColor: 13338331 }),
  settings: Object.freeze({ name: "Settings", iconCustomEmojiId: "5350554349074391003", iconColor: 7322096 }),
  dm: Object.freeze({ name: "", iconColor: 7322096 })
});
const TELEGRAM_SYSTEM_NOTIFICATION_DEFAULTS = Object.freeze({
  follow: false,
  feed: true,
  like: true
});
const TELEGRAM_DM_TOPIC_ICONS = Object.freeze([
  Object.freeze({ emoji: "🔥", customEmojiId: "5312241539987020022" }),
  Object.freeze({ emoji: "💎", customEmojiId: "5309958691854754293" }),
  Object.freeze({ emoji: "💰", customEmojiId: "5350452584119279096" }),
  Object.freeze({ emoji: "💸", customEmojiId: "5309929258443874898" }),
  Object.freeze({ emoji: "🪙", customEmojiId: "5377690785674175481" }),
  Object.freeze({ emoji: "🎮", customEmojiId: "5309950797704865693" }),
  Object.freeze({ emoji: "💻", customEmojiId: "5350554349074391003" }),
  Object.freeze({ emoji: "🚗", customEmojiId: "5312322066328853156" }),
  Object.freeze({ emoji: "🏠", customEmojiId: "5312486108309757006" }),
  Object.freeze({ emoji: "💘", customEmojiId: "5310029292527164639" }),
  Object.freeze({ emoji: "🎉", customEmojiId: "5310228579009699834" }),
  Object.freeze({ emoji: "‼️", customEmojiId: "5377498341074542641" }),
  Object.freeze({ emoji: "🏆", customEmojiId: "5312315739842026755" }),
  Object.freeze({ emoji: "🔞", customEmojiId: "5420331611830886484" }),
  Object.freeze({ emoji: "📚", customEmojiId: "5350481781306958339" }),
  Object.freeze({ emoji: "👑", customEmojiId: "5357107601584693888" }),
  Object.freeze({ emoji: "⚽️", customEmojiId: "5375159220280762629" }),
  Object.freeze({ emoji: "🏀", customEmojiId: "5384327463629233871" }),
  Object.freeze({ emoji: "📺", customEmojiId: "5350513667144163474" }),
  Object.freeze({ emoji: "🍓", customEmojiId: "5310157398516703416" }),
  Object.freeze({ emoji: "🧳", customEmojiId: "5357120306097956843" }),
  Object.freeze({ emoji: "🏖", customEmojiId: "5310303848311562896" }),
  Object.freeze({ emoji: "⛅️", customEmojiId: "5350424168615649565" }),
  Object.freeze({ emoji: "🦄", customEmojiId: "5413625003218313783" }),
  Object.freeze({ emoji: "🚂", customEmojiId: "5350497316203668441" }),
  Object.freeze({ emoji: "🛥", customEmojiId: "5350422527938141909" }),
  Object.freeze({ emoji: "🏔", customEmojiId: "5418196338774907917" }),
  Object.freeze({ emoji: "🏕", customEmojiId: "5350648297189023928" }),
  Object.freeze({ emoji: "🤖", customEmojiId: "5309832892262654231" }),
  Object.freeze({ emoji: "🪩", customEmojiId: "5350751634102166060" }),
  Object.freeze({ emoji: "🎟", customEmojiId: "5377624166436445368" }),
  Object.freeze({ emoji: "🏴‍☠️", customEmojiId: "5386395194029515402" }),
  Object.freeze({ emoji: "🗳", customEmojiId: "5350387571199319521" }),
  Object.freeze({ emoji: "🎓", customEmojiId: "5357419403325481346" }),
  Object.freeze({ emoji: "🔭", customEmojiId: "5368585403467048206" }),
  Object.freeze({ emoji: "🔬", customEmojiId: "5377580546748588392" }),
  Object.freeze({ emoji: "🎶", customEmojiId: "5377317729109811382" }),
  Object.freeze({ emoji: "🕺", customEmojiId: "5357298525765902091" }),
  Object.freeze({ emoji: "💃", customEmojiId: "5357370526597653193" }),
  Object.freeze({ emoji: "🪖", customEmojiId: "5357188789351490453" }),
  Object.freeze({ emoji: "💼", customEmojiId: "5348227245599105972" }),
  Object.freeze({ emoji: "👨‍👩‍👧‍👦", customEmojiId: "5386435923204382258" }),
  Object.freeze({ emoji: "👶", customEmojiId: "5377675010259297233" }),
  Object.freeze({ emoji: "🤰", customEmojiId: "5386609083400856174" }),
  Object.freeze({ emoji: "💅", customEmojiId: "5368808634392257474" }),
  Object.freeze({ emoji: "🏛", customEmojiId: "5350548830041415279" }),
  Object.freeze({ emoji: "👮‍♂️", customEmojiId: "5377494501373780436" }),
  Object.freeze({ emoji: "💊", customEmojiId: "5310094636159607472" }),
  Object.freeze({ emoji: "💉", customEmojiId: "5310139157790596888" }),
  Object.freeze({ emoji: "🧼", customEmojiId: "5377468357907849200" }),
  Object.freeze({ emoji: "🪪", customEmojiId: "5418115271267197333" }),
  Object.freeze({ emoji: "🛃", customEmojiId: "5372819184658949787" }),
  Object.freeze({ emoji: "🍽", customEmojiId: "5350344462612570293" }),
  Object.freeze({ emoji: "🐟", customEmojiId: "5384574037701696503" }),
  Object.freeze({ emoji: "🎨", customEmojiId: "5310039132297242441" }),
  Object.freeze({ emoji: "🎭", customEmojiId: "5350658016700013471" }),
  Object.freeze({ emoji: "🎩", customEmojiId: "5357504778685392027" }),
  Object.freeze({ emoji: "🔮", customEmojiId: "5350367161514732241" }),
  Object.freeze({ emoji: "🍹", customEmojiId: "5350520238444126134" }),
  Object.freeze({ emoji: "🎂", customEmojiId: "5310132165583840589" }),
  Object.freeze({ emoji: "☕️", customEmojiId: "5350392020785437399" }),
  Object.freeze({ emoji: "🍣", customEmojiId: "5350406176997646350" }),
  Object.freeze({ emoji: "🍔", customEmojiId: "5350403544182694064" }),
  Object.freeze({ emoji: "🍕", customEmojiId: "5350444672789519765" }),
  Object.freeze({ emoji: "🦠", customEmojiId: "5312424913615723286" }),
  Object.freeze({ emoji: "🎄", customEmojiId: "5312054580060625569" }),
  Object.freeze({ emoji: "🎃", customEmojiId: "5309744892677727325" }),
  Object.freeze({ emoji: "✍️", customEmojiId: "5238156910363950406" }),
  Object.freeze({ emoji: "⭐️", customEmojiId: "5235579393115438657" }),
  Object.freeze({ emoji: "🎖", customEmojiId: "5238027455754680851" }),
  Object.freeze({ emoji: "🤡", customEmojiId: "5238234236955148254" }),
  Object.freeze({ emoji: "🧠", customEmojiId: "5237889595894414384" }),
  Object.freeze({ emoji: "🦮", customEmojiId: "5237999392438371490" }),
  Object.freeze({ emoji: "🐈", customEmojiId: "5235912661102773458" })
]);
const TELEGRAM_MONITOR_INTERVAL_SECONDS = Object.freeze([10, 30, 60, 300, 900]);
const TELEGRAM_RSS_INTERVAL_SECONDS = Object.freeze([30, 60, 300, 900]);
const TELEGRAM_RSS_INTERVAL_KEY = "telegramRssMonitorIntervalSeconds";
const TELEGRAM_DIRECT_TOPIC_SCAN_UNTIL_KEY = "telegramDirectTopicScanUntil";
const TELEGRAM_DIRECT_TOPIC_SCAN_DURATION_MS = 5 * 60 * 1000;
const TELEGRAM_UPDATES_LONG_POLL_TIMEOUT_SECONDS = 20;
const TELEGRAM_UPDATES_RETRY_MAX_MS = 30 * 1000;
const TELEGRAM_REQUEST_TIMEOUT_MS = 15 * 1000;
const TELEGRAM_FILE_REQUEST_TIMEOUT_MS = 30 * 1000;
const TELEGRAM_OFFSCREEN_PARSER_PATH = "src/background/telegram-offscreen.html";
const TELEGRAM_OFFSCREEN_PARSER_TARGET = "nsh:telegram-offscreen";
const TELEGRAM_ACTIVITY_ENDPOINTS = Object.freeze({
  at: "/api/notification/at-me/list",
  reply: "/api/notification/reply-to-me/list"
});
const TELEGRAM_PERSONAL_START_WATCH_DURATION_MS = 5 * 60 * 1000;
const TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY = "telegramPersonalStartWatchUntil";
const TELEGRAM_PERSONAL_START_WATCH_SINCE_KEY = "telegramPersonalStartWatchSince";
const TELEGRAM_PERSONAL_START_REPLIED_UPDATE_ID_KEY = "telegramPersonalStartRepliedUpdateId";
const TELEGRAM_PERSONAL_START_OFFSET_KEY = "telegramPersonalStartOffset";
const TELEGRAM_PENDING_DIRECT_TOPICS_KEY = "telegramPendingDirectTopics";
const TELEGRAM_PENDING_PERSONAL_CHAT_ID_KEY = "telegramPendingPersonalChatId";
const TELEGRAM_PENDING_PERSONAL_TARGET_NAME_KEY = "telegramPendingPersonalTargetName";
let telegramUpdatesCheckInFlight = false;
let telegramMonitorCheckInFlight = false;
let telegramRssCheckInFlight = false;
let telegramUpdatesLongPollRunning = false;
let telegramUpdatesAbortController = null;
let telegramUpdatesActiveToken = "";
let telegramUpdatesFailureCount = 0;
let telegramSettingsCallbacksReady = false;
let telegramOffscreenParserSetupPromise = null;
const telegramUpdateBatchWaiters = new Set();
const TELEGRAM_BOARD_NAMES = {
  daily: "日常",
  tech: "技术",
  info: "情报",
  review: "测评",
  trade: "交易",
  carpool: "拼车",
  promo: "推广",
  life: "生活",
  dev: "Dev",
  "photo-share": "贴图",
  expose: "曝光",
  inner: "内版",
  sandbox: "沙盒"
};

async function getTelegramUpdateConflictMessage(token) {
  try {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const result = await response.json();
    if (response.ok && result?.ok && result.result?.url) {
      return "该机器人已配置 Webhook。插件可以发送通知，但无法通过 getUpdates 接收 Topic 回信或自动读取 /start、频道 Direct 会话。";
    }
  } catch (_error) {
    // Keep the fallback message useful if Telegram cannot return webhook status.
  }
  return "另一个实例正在使用 getUpdates。插件仍可发送通知，但自动读取 /start、频道 Direct 会话和转发 Topic 回信会受影响。";
}

async function fetchWithTimeout(input, options = {}, timeoutMs = TELEGRAM_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const externalSignal = options?.signal;
  const abortFromExternalSignal = () => controller.abort(externalSignal.reason);
  if (externalSignal?.aborted) abortFromExternalSignal();
  else externalSignal?.addEventListener("abort", abortFromExternalSignal, { once: true });
  let timeoutId = setTimeout(() => {
    controller.abort("timeout");
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  }, timeoutMs);
  const cleanup = () => {
    clearTimeout(timeoutId);
    timeoutId = 0;
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  };
  const toTimeoutError = () => {
    const error = new Error(`网络请求超时（${Math.ceil(timeoutMs / 1000)} 秒）`);
    error.code = "REQUEST_TIMEOUT";
    return error;
  };
  try {
    const response = await fetch(input, { ...options, signal: controller.signal });
    for (const method of ["json", "text", "blob", "arrayBuffer", "formData"]) {
      if (typeof response?.[method] !== "function") continue;
      const readBody = response[method].bind(response);
      response[method] = async (...args) => {
        try {
          return await readBody(...args);
        } catch (error) {
          if (controller.signal.reason === "timeout") throw toTimeoutError();
          throw error;
        } finally {
          cleanup();
        }
      };
    }
    return response;
  } catch (error) {
    cleanup();
    if (controller.signal.reason === "timeout") throw toTimeoutError();
    throw error;
  }
}

function promiseWithTimeout(promise, timeoutMs, label = "操作") {
  let timeoutId;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label}超时（${Math.ceil(timeoutMs / 1000)} 秒）`)), timeoutMs);
    })
  ]).finally(() => clearTimeout(timeoutId));
}

async function scheduleTelegramMonitorAlarm(
  {
    resetMessageBaseline = false,
    resetPostBaseline = false,
    resetMentionBaseline = false,
    resetReplyBaseline = false,
    checkImmediately = false
  } = {}
) {
  const config = await chrome.storage.local.get({
    [TELEGRAM_KEYS.token]: "",
    [TELEGRAM_KEYS.targets]: [],
    [TELEGRAM_KEYS.messagesEnabled]: true,
    [TELEGRAM_KEYS.postsEnabled]: true,
    [TELEGRAM_KEYS.mentionEnabled]: null,
    [TELEGRAM_KEYS.replyEnabled]: null,
    [TELEGRAM_KEYS.systemFollowEnabled]: false,
    [TELEGRAM_KEYS.systemFeedEnabled]: true,
    [TELEGRAM_KEYS.systemLikeEnabled]: true,
    [TELEGRAM_KEYS.managedTopics]: [],
    [TELEGRAM_KEYS.outgoingMessageEchoes]: [],
    [TELEGRAM_KEYS.outgoingReadStatuses]: {},
    telegramMentionReplyNotificationsEnabled: null,
    telegramMonitorIntervalSeconds: 30,
    [TELEGRAM_RSS_INTERVAL_KEY]: null,
    [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0,
    [TELEGRAM_DIRECT_TOPIC_SCAN_UNTIL_KEY]: 0,
    [TELEGRAM_KEYS.paused]: false
  });
  if (typeof config[TELEGRAM_KEYS.mentionEnabled] !== "boolean"
      || typeof config[TELEGRAM_KEYS.replyEnabled] !== "boolean"
      || config.telegramMentionReplyNotificationsEnabled !== null) {
    config[TELEGRAM_KEYS.mentionEnabled] = typeof config[TELEGRAM_KEYS.mentionEnabled] === "boolean"
      ? config[TELEGRAM_KEYS.mentionEnabled]
      : config.telegramMentionReplyNotificationsEnabled === true;
    config[TELEGRAM_KEYS.replyEnabled] = typeof config[TELEGRAM_KEYS.replyEnabled] === "boolean"
      ? config[TELEGRAM_KEYS.replyEnabled]
      : config.telegramMentionReplyNotificationsEnabled === true;
    await chrome.storage.local.set({
      [TELEGRAM_KEYS.mentionEnabled]: config[TELEGRAM_KEYS.mentionEnabled],
      [TELEGRAM_KEYS.replyEnabled]: config[TELEGRAM_KEYS.replyEnabled]
    });
    await chrome.storage.local.remove("telegramMentionReplyNotificationsEnabled");
  }
  config[TELEGRAM_RSS_INTERVAL_KEY] = await getOrMigrateTelegramRssInterval();
  const personalWatchUntil = Number(config[TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]) || 0;
  if (personalWatchUntil > Date.now()) {
    await chrome.alarms.create(TELEGRAM_PERSONAL_START_ALARM_NAME, { when: personalWatchUntil });
  } else {
    await chrome.alarms.clear(TELEGRAM_PERSONAL_START_ALARM_NAME);
    if (personalWatchUntil) {
      await chrome.storage.local.set({ [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0 });
    }
  }

  if (resetMessageBaseline) {
    await chrome.storage.local.remove(TELEGRAM_KEYS.messageCursors);
  }
  if (resetPostBaseline) {
    await chrome.storage.local.set({
      [TELEGRAM_KEYS.rssSeenIds]: [],
      [TELEGRAM_KEYS.rssInitialized]: false
    });
  }
  if (resetMentionBaseline || resetReplyBaseline) {
    const storedCursors = await chrome.storage.local.get({ [TELEGRAM_KEYS.mentionReplyCursors]: {} });
    const cursors = { ...(storedCursors[TELEGRAM_KEYS.mentionReplyCursors] || {}) };
    if (resetMentionBaseline) delete cursors.at;
    if (resetReplyBaseline) delete cursors.reply;
    await chrome.storage.local.set({ [TELEGRAM_KEYS.mentionReplyCursors]: cursors });
  }

  await scheduleTelegramNodeSeekMonitorAlarms(config);
  await scheduleTelegramRssAlarm(config);
  await ensureTelegramUpdatesLongPoll();

  if (resetMessageBaseline || resetPostBaseline || resetMentionBaseline || resetReplyBaseline || checkImmediately) {
    if (isTelegramNodeSeekMonitorReady(config)) {
      checkTelegramNotifications().catch((error) => {
        console.warn("Telegram notification baseline failed:", error?.message || "unknown error");
      });
    }
    if (isTelegramRssMonitorReady(config)) {
      checkTelegramRssNotifications().catch((error) => {
        console.warn("Telegram RSS baseline failed:", error?.message || "unknown error");
      });
    }
  }
}

async function getOrMigrateTelegramRssInterval() {
  const stored = await chrome.storage.local.get([TELEGRAM_RSS_INTERVAL_KEY, "telegramMonitorIntervalSeconds"]);
  const storedInterval = Number(stored[TELEGRAM_RSS_INTERVAL_KEY]);
  if (TELEGRAM_RSS_INTERVAL_SECONDS.includes(storedInterval)) return storedInterval;

  const previousInterval = Number(stored.telegramMonitorIntervalSeconds);
  const interval = [30, 60, 300, 900].includes(previousInterval) ? previousInterval : 60;
  await chrome.storage.local.set({ [TELEGRAM_RSS_INTERVAL_KEY]: interval });
  return interval;
}

async function scheduleTelegramNodeSeekMonitorAlarms(config) {
  const alarmNames = [TELEGRAM_MESSAGE_ALARM_NAME, ...TELEGRAM_FAST_MONITOR_ALARM_NAMES];
  await Promise.all(alarmNames.map((name) => chrome.alarms.clear(name)));
  if (!isTelegramNodeSeekMonitorReady(config)) return;

  const intervalSeconds = TELEGRAM_MONITOR_INTERVAL_SECONDS.includes(Number(config.telegramMonitorIntervalSeconds))
    ? Number(config.telegramMonitorIntervalSeconds)
    : 30;
  if (intervalSeconds === 10) {
    const firstDueAt = Date.now() + 30_000;
    await Promise.all(TELEGRAM_FAST_MONITOR_ALARM_NAMES.map((name, index) => chrome.alarms.create(name, {
      when: firstDueAt + index * 10_000,
      periodInMinutes: 0.5
    })));
    return;
  }

  const intervalInMinutes = intervalSeconds / 60;
  await chrome.alarms.create(TELEGRAM_MESSAGE_ALARM_NAME, {
    delayInMinutes: intervalInMinutes,
    periodInMinutes: intervalInMinutes
  });
}

async function scheduleTelegramRssAlarm(config) {
  await chrome.alarms.clear(TELEGRAM_RSS_ALARM_NAME);
  if (!isTelegramRssMonitorReady(config)) return;

  const intervalSeconds = TELEGRAM_RSS_INTERVAL_SECONDS.includes(Number(config[TELEGRAM_RSS_INTERVAL_KEY]))
    ? Number(config[TELEGRAM_RSS_INTERVAL_KEY])
    : 60;
  const intervalInMinutes = intervalSeconds / 60;
  await chrome.alarms.create(TELEGRAM_RSS_ALARM_NAME, {
    delayInMinutes: intervalInMinutes,
    periodInMinutes: intervalInMinutes
  });
}

function isTelegramMonitorReady(config) {
  const targets = Array.isArray(config[TELEGRAM_KEYS.targets]) ? config[TELEGRAM_KEYS.targets] : [];
  const hasEnabledTarget = targets.some((target) => target?.enabled !== false && target?.chatId);
  const mentionEnabled = typeof config[TELEGRAM_KEYS.mentionEnabled] === "boolean"
    ? config[TELEGRAM_KEYS.mentionEnabled]
    : config.telegramMentionReplyNotificationsEnabled === true;
  const replyEnabled = typeof config[TELEGRAM_KEYS.replyEnabled] === "boolean"
    ? config[TELEGRAM_KEYS.replyEnabled]
    : config.telegramMentionReplyNotificationsEnabled === true;
  return Boolean(String(config[TELEGRAM_KEYS.token] || "").trim())
    && hasEnabledTarget
    && !config[TELEGRAM_KEYS.paused]
    && (config[TELEGRAM_KEYS.messagesEnabled]
      || config[TELEGRAM_KEYS.postsEnabled]
      || mentionEnabled
      || replyEnabled
      || isTelegramSystemNotificationCategoryEnabled(config, "follow")
      || isTelegramSystemNotificationCategoryEnabled(config, "feed")
      || isTelegramSystemNotificationCategoryEnabled(config, "like")
      || (Array.isArray(config[TELEGRAM_KEYS.managedTopics]) && config[TELEGRAM_KEYS.managedTopics].length > 0));
}

function isTelegramNodeSeekMonitorReady(config) {
  return isTelegramMonitorReady(config)
    && (config[TELEGRAM_KEYS.messagesEnabled]
      || config[TELEGRAM_KEYS.mentionEnabled]
      || config[TELEGRAM_KEYS.replyEnabled]
      || isTelegramSystemNotificationCategoryEnabled(config, "follow")
      || isTelegramSystemNotificationCategoryEnabled(config, "feed")
      || isTelegramSystemNotificationCategoryEnabled(config, "like")
      || hasPendingTelegramOutgoingReadTracking(config));
}

function isTelegramMessageMonitorReady(config) {
  return isTelegramMonitorReady(config)
    && (config[TELEGRAM_KEYS.messagesEnabled]
      || isTelegramSystemNotificationCategoryEnabled(config, "follow")
      || isTelegramSystemNotificationCategoryEnabled(config, "feed")
      || isTelegramSystemNotificationCategoryEnabled(config, "like")
      || hasPendingTelegramOutgoingReadTracking(config));
}

function isTelegramSystemNotificationCategoryEnabled(config, category) {
  const key = {
    follow: TELEGRAM_KEYS.systemFollowEnabled,
    feed: TELEGRAM_KEYS.systemFeedEnabled,
    like: TELEGRAM_KEYS.systemLikeEnabled
  }[category];
  if (!key) return false;
  return typeof config[key] === "boolean"
    ? config[key]
    : TELEGRAM_SYSTEM_NOTIFICATION_DEFAULTS[category];
}

function getTelegramSystemNotificationCategory(content) {
  const text = String(content || "");
  if (text.includes("关注的用户")) return "follow";
  if (text.includes("投喂")) return "feed";
  if (text.includes("点赞")) return "like";
  return "";
}

function hasPendingTelegramOutgoingReadTracking(config) {
  const echoes = Array.isArray(config[TELEGRAM_KEYS.outgoingMessageEchoes])
    ? config[TELEGRAM_KEYS.outgoingMessageEchoes] : [];
  const statuses = config[TELEGRAM_KEYS.outgoingReadStatuses]
    && typeof config[TELEGRAM_KEYS.outgoingReadStatuses] === "object"
    ? Object.values(config[TELEGRAM_KEYS.outgoingReadStatuses]) : [];
  const now = Date.now();
  return echoes.some((echo) => echo?.userId && echo?.originChatId && echo?.originTopicId
      && now - Number(echo.createdAt) <= TELEGRAM_OUTGOING_ECHO_TTL_MS)
    || statuses.some((status) => status?.userId && status?.messageId);
}

function isTelegramRssMonitorReady(config) {
  return isTelegramMonitorReady(config) && config[TELEGRAM_KEYS.postsEnabled] === true;
}

function isTelegramUpdateLongPollNeeded(config) {
  const token = String(config[TELEGRAM_KEYS.token] || "").trim();
  if (!token) return false;
  const watchActive = Number(config[TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]) > Date.now();
  const directScanActive = Number(config[TELEGRAM_DIRECT_TOPIC_SCAN_UNTIL_KEY]) > Date.now();
  if (watchActive || directScanActive) return true;

  const targets = Array.isArray(config[TELEGRAM_KEYS.targets]) ? config[TELEGRAM_KEYS.targets] : [];
  const hasPersonalSettingsTarget = targets.some((target) => target?.type !== "direct" && target?.chatId);
  if (hasPersonalSettingsTarget) return true;

  if (!isTelegramMonitorReady(config)) return false;
  const hasDirectTarget = targets.some((target) => target?.type === "direct" && target?.enabled !== false);
  const topics = Array.isArray(config[TELEGRAM_KEYS.managedTopics]) ? config[TELEGRAM_KEYS.managedTopics] : [];
  const hasPrivateMessageTopic = topics.some((topic) => topic?.kind === "dm" && topic?.chatId && topic?.topicId);
  return hasDirectTarget || hasPrivateMessageTopic;
}

async function ensureTelegramUpdatesLongPoll() {
  const config = await chrome.storage.local.get({
    [TELEGRAM_KEYS.token]: "",
    [TELEGRAM_KEYS.targets]: [],
    [TELEGRAM_KEYS.messagesEnabled]: true,
    [TELEGRAM_KEYS.postsEnabled]: true,
    [TELEGRAM_KEYS.mentionEnabled]: false,
    [TELEGRAM_KEYS.replyEnabled]: false,
    [TELEGRAM_KEYS.systemFollowEnabled]: false,
    [TELEGRAM_KEYS.systemFeedEnabled]: true,
    [TELEGRAM_KEYS.systemLikeEnabled]: true,
    [TELEGRAM_KEYS.managedTopics]: [],
    telegramMentionReplyNotificationsEnabled: false,
    [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0,
    [TELEGRAM_DIRECT_TOPIC_SCAN_UNTIL_KEY]: 0,
    [TELEGRAM_KEYS.paused]: false
  });
  if (!isTelegramUpdateLongPollNeeded(config)) {
    telegramUpdatesAbortController?.abort();
    await chrome.alarms.clear(TELEGRAM_UPDATES_WATCHDOG_ALARM_NAME);
    return;
  }
  const token = String(config[TELEGRAM_KEYS.token] || "").trim();
  if (telegramUpdatesLongPollRunning && telegramUpdatesActiveToken !== token) {
    telegramUpdatesAbortController?.abort();
  }

  await chrome.alarms.create(TELEGRAM_UPDATES_WATCHDOG_ALARM_NAME, {
    delayInMinutes: 0.5,
    periodInMinutes: 0.5
  });
  if (!telegramUpdatesLongPollRunning) {
    telegramUpdatesLongPollRunning = true;
    runTelegramUpdatesLongPoll().catch((error) => {
      console.warn("Telegram long polling stopped:", error?.message || "unknown error");
    });
  }
}

async function runTelegramUpdatesLongPoll() {
  const settingsSessionStartedAt = Math.floor(Date.now() / 1000);
  let discardFirstBatchCallbacks = true;
  telegramSettingsCallbacksReady = false;
  try {
    while (true) {
      const config = await chrome.storage.local.get({
        [TELEGRAM_KEYS.token]: "",
        [TELEGRAM_KEYS.targets]: [],
        [TELEGRAM_KEYS.messagesEnabled]: true,
        [TELEGRAM_KEYS.postsEnabled]: true,
        [TELEGRAM_KEYS.mentionEnabled]: false,
        [TELEGRAM_KEYS.replyEnabled]: false,
        [TELEGRAM_KEYS.systemFollowEnabled]: false,
        [TELEGRAM_KEYS.systemFeedEnabled]: true,
        [TELEGRAM_KEYS.systemLikeEnabled]: true,
        [TELEGRAM_KEYS.managedTopics]: [],
        telegramMentionReplyNotificationsEnabled: false,
        [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0,
        [TELEGRAM_DIRECT_TOPIC_SCAN_UNTIL_KEY]: 0,
        [TELEGRAM_KEYS.paused]: false
      });
      if (!isTelegramUpdateLongPollNeeded(config)) break;

      const retryState = await chrome.storage.local.get({ [TELEGRAM_KEYS.updatesRetryState]: null });
      const retryDelayMs = Math.max(0,
        Number(retryState[TELEGRAM_KEYS.updatesRetryState]?.nextRetryAt) - Date.now());
      if (retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

      const token = String(config[TELEGRAM_KEYS.token] || "").trim();
      const controller = new AbortController();
      telegramUpdatesAbortController = controller;
      telegramUpdatesActiveToken = token;
      const timeoutId = setTimeout(() => controller.abort("timeout"), 25_000);
      try {
        await getTelegramUpdatesAndProcess(
          token,
          null,
          TELEGRAM_UPDATES_LONG_POLL_TIMEOUT_SECONDS,
          controller.signal,
          { settingsSessionStartedAt, allowSettingsCallbacks: !discardFirstBatchCallbacks }
        );
        discardFirstBatchCallbacks = false;
        telegramSettingsCallbacksReady = true;
        telegramUpdatesFailureCount = 0;
        await chrome.storage.local.set({
          [TELEGRAM_KEYS.updatesRetryState]: { failureCount: 0, nextRetryAt: 0 }
        });
      } catch (error) {
        if (controller.signal.aborted && controller.signal.reason !== "timeout") continue;
        const storedRetryState = await chrome.storage.local.get({ [TELEGRAM_KEYS.updatesRetryState]: null });
        const previousFailureCount = Number(storedRetryState[TELEGRAM_KEYS.updatesRetryState]?.failureCount) || 0;
        telegramUpdatesFailureCount = Math.max(telegramUpdatesFailureCount, previousFailureCount) + 1;
        const delayMs = getTelegramUpdatesRetryDelayMs(
          telegramUpdatesFailureCount,
          error?.retryAfterSeconds
        );
        await chrome.storage.local.set({
          [TELEGRAM_KEYS.updatesRetryState]: {
            failureCount: telegramUpdatesFailureCount,
            nextRetryAt: Date.now() + delayMs
          }
        });
        await chrome.storage.local.set({ [TELEGRAM_KEYS.lastError]: `Telegram 长轮询：${error?.message || "连接失败"}` });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } finally {
        clearTimeout(timeoutId);
        if (telegramUpdatesAbortController === controller) telegramUpdatesAbortController = null;
      }
    }
  } finally {
    telegramUpdatesAbortController = null;
    telegramUpdatesActiveToken = "";
    telegramUpdatesLongPollRunning = false;
  }
}

function getTelegramUpdatesRetryDelayMs(failureCountValue, retryAfterSecondsValue = 0) {
  const retryAfterSeconds = Number(retryAfterSecondsValue) || 0;
  if (retryAfterSeconds > 0) return Math.max(1000, retryAfterSeconds * 1000);
  const failureCount = Math.max(1, Math.floor(Number(failureCountValue) || 1));
  return Math.min(1000 * (2 ** Math.min(failureCount - 1, 5)), TELEGRAM_UPDATES_RETRY_MAX_MS);
}

async function isTelegramRetryDue(keyValue) {
  const key = String(keyValue || "").trim();
  if (!key) return true;
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.retryStates]: {} });
  const state = stored[TELEGRAM_KEYS.retryStates]?.[key];
  return (Number(state?.nextRetryAt) || 0) <= Date.now();
}

async function recordTelegramRetryFailure(keyValue, error) {
  const key = String(keyValue || "").trim();
  if (!key) return 0;
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.retryStates]: {} });
  const states = { ...(stored[TELEGRAM_KEYS.retryStates] || {}) };
  const previous = states[key] || {};
  const failureCount = (Number(previous.failureCount) || 0) + 1;
  const retryAfterSeconds = Number(error?.retryAfterSeconds) || 0;
  const delayMs = retryAfterSeconds > 0
    ? Math.max(1000, retryAfterSeconds * 1000)
    : Math.min(10_000 * (2 ** Math.min(failureCount - 1, 5)), 5 * 60 * 1000);
  states[key] = {
    failureCount,
    nextRetryAt: Date.now() + delayMs,
    lastError: String(error?.message || error || "请求失败").slice(0, 300)
  };
  await chrome.storage.local.set({ [TELEGRAM_KEYS.retryStates]: states });
  return delayMs;
}

async function clearTelegramRetryState(keyValue) {
  const key = String(keyValue || "").trim();
  if (!key) return;
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.retryStates]: {} });
  const states = { ...(stored[TELEGRAM_KEYS.retryStates] || {}) };
  if (!Object.hasOwn(states, key)) return;
  delete states[key];
  await chrome.storage.local.set({ [TELEGRAM_KEYS.retryStates]: states });
}

async function runTelegramRetriableOperation(key, operation) {
  if (!await isTelegramRetryDue(key)) return false;
  try {
    await operation();
    await clearTelegramRetryState(key);
    return true;
  } catch (error) {
    await recordTelegramRetryFailure(key, error);
    throw error;
  }
}

function getTelegramBaselineResetOptions(changes, currentConfig) {
  const defaults = {
    [TELEGRAM_KEYS.token]: "",
    [TELEGRAM_KEYS.targets]: [],
    [TELEGRAM_KEYS.messagesEnabled]: true,
    [TELEGRAM_KEYS.postsEnabled]: true,
    [TELEGRAM_KEYS.managedTopics]: [],
    [TELEGRAM_KEYS.mentionEnabled]: false,
    [TELEGRAM_KEYS.replyEnabled]: false,
    [TELEGRAM_KEYS.systemFollowEnabled]: TELEGRAM_SYSTEM_NOTIFICATION_DEFAULTS.follow,
    [TELEGRAM_KEYS.systemFeedEnabled]: TELEGRAM_SYSTEM_NOTIFICATION_DEFAULTS.feed,
    [TELEGRAM_KEYS.systemLikeEnabled]: TELEGRAM_SYSTEM_NOTIFICATION_DEFAULTS.like,
    telegramMentionReplyNotificationsEnabled: null,
    [TELEGRAM_KEYS.paused]: false
  };
  const previousConfig = { ...defaults, ...currentConfig };
  for (const key of Object.keys(defaults)) {
    if (Object.hasOwn(changes, key)) {
      previousConfig[key] = changes[key]?.oldValue === undefined ? defaults[key] : changes[key].oldValue;
    }
  }
  const monitorBecameReady = !isTelegramMonitorReady(previousConfig) && isTelegramMonitorReady(currentConfig);
  const messageMonitorBecameReady = !isTelegramMessageMonitorReady(previousConfig)
    && isTelegramMessageMonitorReady(currentConfig);
  return {
    resetMessageBaseline: monitorBecameReady || messageMonitorBecameReady
      || changes[TELEGRAM_KEYS.messagesEnabled]?.newValue === true,
    resetPostBaseline: monitorBecameReady || changes[TELEGRAM_KEYS.postsEnabled]?.newValue === true,
    resetMentionBaseline: monitorBecameReady || changes[TELEGRAM_KEYS.mentionEnabled]?.newValue === true,
    resetReplyBaseline: monitorBecameReady || changes[TELEGRAM_KEYS.replyEnabled]?.newValue === true
  };
}

async function checkTelegramNotifications() {
  if (telegramMonitorCheckInFlight) return;
  telegramMonitorCheckInFlight = true;
  try {
    const config = await chrome.storage.local.get({
      [TELEGRAM_KEYS.token]: "",
      [TELEGRAM_KEYS.targets]: [],
      [TELEGRAM_KEYS.messagesEnabled]: true,
      [TELEGRAM_KEYS.mentionEnabled]: false,
      [TELEGRAM_KEYS.replyEnabled]: false,
      [TELEGRAM_KEYS.systemFollowEnabled]: TELEGRAM_SYSTEM_NOTIFICATION_DEFAULTS.follow,
      [TELEGRAM_KEYS.systemFeedEnabled]: TELEGRAM_SYSTEM_NOTIFICATION_DEFAULTS.feed,
      [TELEGRAM_KEYS.systemLikeEnabled]: TELEGRAM_SYSTEM_NOTIFICATION_DEFAULTS.like,
      [TELEGRAM_KEYS.keywords]: [],
      [TELEGRAM_KEYS.blockedKeywords]: [],
      [TELEGRAM_KEYS.boards]: [],
      [TELEGRAM_KEYS.messageCursors]: null,
      [TELEGRAM_KEYS.outgoingMessageEchoes]: [],
      [TELEGRAM_KEYS.outgoingReadStatuses]: {},
      [TELEGRAM_KEYS.mentionReplyCursors]: {},
      [TELEGRAM_KEYS.paused]: false
    });
    const hasEnabledTarget = Array.isArray(config[TELEGRAM_KEYS.targets])
      && config[TELEGRAM_KEYS.targets].some((target) => target?.enabled !== false && target?.chatId);
    if (!config[TELEGRAM_KEYS.token].trim() || config[TELEGRAM_KEYS.paused] || !hasEnabledTarget) return;

    const errors = [];
    const hasPendingReadTracking = hasPendingTelegramOutgoingReadTracking(config);
    const hasEnabledSystemNotificationCategory = ["follow", "feed", "like"]
      .some((category) => isTelegramSystemNotificationCategoryEnabled(config, category));
    if (config[TELEGRAM_KEYS.messagesEnabled] || hasEnabledSystemNotificationCategory || hasPendingReadTracking) {
      try {
        await checkForNewNodeSeekMessages(config, {
          allowUnmatchedOutgoing: config[TELEGRAM_KEYS.messagesEnabled] === true,
          allowIncoming: config[TELEGRAM_KEYS.messagesEnabled] === true
        });
      } catch (error) {
        errors.push(`私信：${error?.message || "检查失败"}`);
      }
    }
    if (hasPendingReadTracking) {
      await checkPendingTelegramOutgoingEchoes();
      const resolvedReadStatuses = await checkPendingTelegramOutgoingReadStatuses(config[TELEGRAM_KEYS.token]);
      if (resolvedReadStatuses) await scheduleTelegramMonitorAlarm();
    }
    for (const [kind, enabled] of [
      ["at", config[TELEGRAM_KEYS.mentionEnabled]],
      ["reply", config[TELEGRAM_KEYS.replyEnabled]]
    ]) {
      if (enabled) {
        try {
          await runTelegramRetriableOperation(`nodeseek-activity:${kind}`, () =>
            checkForNewNodeSeekActivity(config, kind));
        } catch (error) {
          errors.push(`${kind === "at" ? "提及" : "回复"}：${error?.message || "检查失败"}`);
        }
      }
    }
    await chrome.storage.local.set({
      [TELEGRAM_KEYS.lastCheck]: Date.now(),
      [TELEGRAM_KEYS.lastError]: errors.join("；")
    });
  } finally {
    telegramMonitorCheckInFlight = false;
  }
}

async function checkTelegramRssNotifications() {
  if (telegramRssCheckInFlight) return;
  telegramRssCheckInFlight = true;
  try {
    const config = await chrome.storage.local.get({
      [TELEGRAM_KEYS.token]: "",
      [TELEGRAM_KEYS.targets]: [],
      [TELEGRAM_KEYS.postsEnabled]: true,
      [TELEGRAM_KEYS.keywords]: [],
      [TELEGRAM_KEYS.blockedKeywords]: [],
      [TELEGRAM_KEYS.boards]: [],
      [TELEGRAM_KEYS.rssSeenIds]: [],
      [TELEGRAM_KEYS.rssInitialized]: false,
      [TELEGRAM_KEYS.rssHistory]: [],
      [TELEGRAM_KEYS.paused]: false
    });
    if (!isTelegramRssMonitorReady(config)) return;

    let errorMessage = "";
    try {
      await runTelegramRetriableOperation("nodeseek-rss", () => checkRssPosts(config));
    } catch (error) {
      errorMessage = `RSS：${error?.message || "检查失败"}`;
    }
    await chrome.storage.local.set({
      telegramRssLastCheck: Date.now(),
      telegramRssLastError: errorMessage
    });
  } finally {
    telegramRssCheckInFlight = false;
  }
}

async function checkForNewNodeSeekMessages(config, {
  allowUnmatchedOutgoing = true,
  allowIncoming = true
} = {}) {
  if (!await isTelegramRetryDue("nodeseek-dm-list")) return;
  let data;
  try {
    const response = await fetchWithTimeout("https://www.nodeseek.com/api/notification/message/list", {
      credentials: "include",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`NodeSeek 私信接口返回 HTTP ${response.status}`);
    data = await response.json();
    if (data?.success !== true || !Array.isArray(data.msgArray)) {
      throw new Error("NodeSeek 私信接口响应格式异常");
    }
    await clearTelegramRetryState("nodeseek-dm-list");
  } catch (error) {
    await recordTelegramRetryFailure("nodeseek-dm-list", error);
    throw error;
  }

  const systemNotificationMessage = data.msgArray.find((message) => {
    const senderIsSystem = String(message.sender_name || "").trim() === "系统通知";
    const receiverIsSystem = String(message.receiver_name || "").trim() === "系统通知";
    return (senderIsSystem && String(message.sender_id || "").trim())
      || (receiverIsSystem && String(message.receiver_id || "").trim());
  });
  const storedSystemUser = await chrome.storage.local.get({
    [TELEGRAM_KEYS.systemNotificationUserId]: ""
  });
  let systemNotificationUserId = String(storedSystemUser[TELEGRAM_KEYS.systemNotificationUserId] || "").trim();
  if (systemNotificationMessage) {
    systemNotificationUserId = String(
      String(systemNotificationMessage.sender_name || "").trim() === "系统通知"
        ? systemNotificationMessage.sender_id
        : systemNotificationMessage.receiver_id
    ).trim();
    if (systemNotificationUserId !== String(storedSystemUser[TELEGRAM_KEYS.systemNotificationUserId] || "").trim()) {
      await chrome.storage.local.set({ [TELEGRAM_KEYS.systemNotificationUserId]: systemNotificationUserId });
    }
  }
  if (systemNotificationUserId) {
    await normalizeManagedSystemTopics(config[TELEGRAM_KEYS.token], systemNotificationUserId);
  }

  const cursors = config[TELEGRAM_KEYS.messageCursors];
  const nextCursors = { ...(cursors || {}) };
  if (!cursors) {
    for (const message of data.msgArray) {
      const conversationId = getConversationId(message);
      if (conversationId && message.max_id != null) nextCursors[conversationId] = String(message.max_id);
    }
    await chrome.storage.local.set({ [TELEGRAM_KEYS.messageCursors]: nextCursors });
    return;
  }

  const seenMessageKeys = new Set();
  const changedMessages = data.msgArray.filter((message) => {
    const conversationId = getConversationId(message);
    if (!conversationId || message.max_id == null) return false;
    const messageKey = `${conversationId}:${message.max_id}`;
    if (seenMessageKeys.has(messageKey)) return false;
    seenMessageKeys.add(messageKey);
    return nextCursors[conversationId] !== String(message.max_id);
  });
  const currentUserId = changedMessages.length > 0
    ? String((await fetchLuckyCurrentUser("https://www.nodeseek.com/"))?.member_id || "").trim()
    : "";
  if (changedMessages.length > 0 && !currentUserId) {
    throw new Error("无法确认当前 NodeSeek 账号，已跳过私信同步以避免误发");
  }

  let changed = false;
  const conversationErrors = [];
  for (const message of changedMessages) {
    const conversationId = getConversationId(message);
    const retryKey = `nodeseek-dm:${conversationId}`;
    if (!await isTelegramRetryDue(retryKey)) continue;
    try {
    const previousMessageId = String(nextCursors[conversationId] || "0");
    const latestMessageId = String(message.max_id);

    const peerId = getConversationPeerId(message, currentUserId);
    if (!peerId) throw new Error("无法识别 NodeSeek 私信会话用户，已保留消息游标");
    const conversation = await fetchNodeSeekConversationMessages(peerId);
    const hasLatestMessage = conversation.msgArray.some((item) => String(item?.id) === latestMessageId);
    if (!hasLatestMessage) throw new Error("私信明细未包含最新消息，已保留消息游标并等待重试");

    const newMessages = conversation.msgArray
      .filter((item) => isNodeSeekMessageIdAfter(item?.id, previousMessageId)
        && Number(item.id) <= Number(latestMessageId))
      .sort((a, b) => Number(a.id) - Number(b.id));
    const knownTopic = (Array.isArray(config[TELEGRAM_KEYS.managedTopics])
      ? config[TELEGRAM_KEYS.managedTopics] : [])
      .find((topic) => (topic.kind === "dm" && String(topic.nsUserId) === peerId)
        || (peerId === systemNotificationUserId && topic.kind === "system"));

    let waitingForTelegramSend = false;
    for (const incomingMessage of newMessages) {
      const senderId = String(incomingMessage.sender_id || "").trim();
      const receiverId = String(incomingMessage.receiver_id || "").trim();
      const isOutgoing = senderId === currentUserId && receiverId === peerId;
      const isIncoming = senderId === peerId && receiverId === currentUserId;
      if (isOutgoing || isIncoming) {
        if (isOutgoing) {
          const echoMatch = await consumeTelegramOutgoingEcho(peerId, incomingMessage.content, incomingMessage.id);
          if (echoMatch?.pending) {
            waitingForTelegramSend = true;
            break;
          }
          if (echoMatch?.record) {
            await recordTelegramOutgoingReadStatus(config[TELEGRAM_KEYS.token], echoMatch.record, incomingMessage)
              .catch(() => {});
            nextCursors[conversationId] = String(incomingMessage.id);
            await chrome.storage.local.set({ [TELEGRAM_KEYS.messageCursors]: nextCursors });
            continue;
          }
          if (!allowUnmatchedOutgoing) {
            nextCursors[conversationId] = String(incomingMessage.id);
            await chrome.storage.local.set({ [TELEGRAM_KEYS.messageCursors]: nextCursors });
            continue;
          }
        }
        const peerName = String(isOutgoing
          ? incomingMessage.receiver_name || message.receiver_name || knownTopic?.name
          : incomingMessage.sender_name
            || (String(message.sender_id || "") === senderId ? message.sender_name : knownTopic?.name)
          || "NodeSeek 用户").trim() || "NodeSeek 用户";
        const isSystemNotification = peerId === systemNotificationUserId
          || peerName === "系统通知"
          || String(message.sender_name || "").trim() === "系统通知"
          || String(message.receiver_name || "").trim() === "系统通知";
        const systemNotificationCategory = isSystemNotification && isIncoming
          ? getTelegramSystemNotificationCategory(incomingMessage.content)
          : "";
        const categoryEnabled = systemNotificationCategory
          ? isTelegramSystemNotificationCategoryEnabled(config, systemNotificationCategory)
          : allowIncoming;
        if (isIncoming && !categoryEnabled) {
          nextCursors[conversationId] = String(incomingMessage.id);
          await chrome.storage.local.set({ [TELEGRAM_KEYS.messageCursors]: nextCursors });
          continue;
        }
        const messageContent = extractTelegramMessageMedia(incomingMessage.content);
        const messageBody = messageContent.text || (messageContent.imageUrls.length ? "" : "（消息没有文本内容）");
        const isFollowedUserPost = systemNotificationCategory === "follow";
        const originalPost = isFollowedUserPost
          ? await fetchTelegramSystemNotificationPostContent(incomingMessage.content)
          : null;
        const body = originalPost
          ? formatTelegramSystemPostNotificationBody(messageBody, originalPost)
          : messageBody;
        const fallbackText = isOutgoing
          ? ["NodeSeek 私信", "发送者：我", `对话：${peerName}`, ...(body ? ["", body] : [])].join("\n")
          : ["NodeSeek 新私信", `发件人：${peerName}`, ...(body ? ["", body] : [])].join("\n");
        const topicText = isOutgoing && body ? `我：${body}` : body;
        const deliveredTopics = await sendTelegramPrivateMessageToTopics(
          config,
          peerId,
          peerName,
          topicText,
          fallbackText,
          isSystemNotification ? "system" : "dm",
          messageContent.imageUrls,
          {
            includeDirectTargets: !isOutgoing,
            deliveryKey: `ns-dm:${conversationId}:${String(incomingMessage.id)}`
          }
        );
        if (isOutgoing && !isSystemNotification) {
          for (const topic of deliveredTopics) {
            await recordTelegramOutgoingReadStatus(config[TELEGRAM_KEYS.token], {
              userId: peerId,
              originChatId: topic.chatId,
              originTopicId: topic.topicId,
              originTopicName: topic.name
            }, incomingMessage).catch(() => {});
          }
        }
      }

      nextCursors[conversationId] = String(incomingMessage.id);
      await chrome.storage.local.set({ [TELEGRAM_KEYS.messageCursors]: nextCursors });
    }

    if (waitingForTelegramSend) {
      await clearTelegramRetryState(retryKey);
      continue;
    }

    nextCursors[conversationId] = latestMessageId;
    changed = true;
    await clearTelegramRetryState(retryKey);
    } catch (error) {
      await recordTelegramRetryFailure(retryKey, error);
      conversationErrors.push(`${message.sender_name || message.receiver_name || conversationId}：${error?.message || "同步失败"}`);
    }
  }

  if (changed) await chrome.storage.local.set({ [TELEGRAM_KEYS.messageCursors]: nextCursors });
  if (conversationErrors.length > 0) {
    throw new Error(`部分私信将在退避后重试：${conversationErrors.join("；")}`);
  }
}

async function checkForNewNodeSeekActivity(config, kind) {
  const endpoint = TELEGRAM_ACTIVITY_ENDPOINTS[kind];
  if (!endpoint) throw new Error("未知的通知类型");

  const cursorState = await chrome.storage.local.get({ [TELEGRAM_KEYS.mentionReplyCursors]: {} });
  const storedCursors = cursorState[TELEGRAM_KEYS.mentionReplyCursors];
  const cursor = normalizeTelegramActivityCursor(storedCursors?.[kind]);
  const wasInitialized = cursor.initialized;
  const knownIds = new Set(cursor.ids);
  const discoveredIds = [];
  const candidates = [];
  const candidateIds = new Set();
  const pageSignatures = new Set();
  let reachedKnownEntry = false;

  for (let page = 1; page <= TELEGRAM_ACTIVITY_PAGE_LIMIT; page += 1) {
    const response = await fetchWithTimeout(`https://www.nodeseek.com${endpoint}?page=${page}`, {
      credentials: "include",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`NodeSeek 接口返回 HTTP ${response.status}`);
    const result = await response.json();
    if (result?.success !== true || !Array.isArray(result.data)) {
      throw new Error("NodeSeek 通知接口响应格式异常");
    }
    const entries = result.data;
    if (entries.length === 0) break;

    const pageIds = entries.map((entry) => normalizeTelegramActivityId(entry?.id)).filter(Boolean);
    const signature = pageIds.join(",");
    if (!signature || pageSignatures.has(signature)) break;
    pageSignatures.add(signature);

    for (const entry of entries) {
      const id = normalizeTelegramActivityId(entry?.id);
      if (!id) continue;
      discoveredIds.push(id);
      if (knownIds.has(id)) {
        reachedKnownEntry = true;
      } else if (wasInitialized && !candidateIds.has(id)) {
        candidateIds.add(id);
        candidates.push(entry);
      }
    }

    if (reachedKnownEntry || entries.length < TELEGRAM_ACTIVITY_PAGE_SIZE) break;
  }

  // First activation records existing notifications without sending historical alerts.
  if (!wasInitialized) {
    await saveTelegramActivityCursor(kind, discoveredIds, cursor);
    return;
  }

  // The notification ID, not NodeSeek's current read state, determines whether
  // this event is new. Users may open the mention/reply in NodeSeek before the
  // next poll; filtering by `viewed` would then consume the cursor without alerting.
  const newEntries = candidates;
  let currentUserId = "";
  if (newEntries.length > 0) {
    currentUserId = String((await fetchLuckyCurrentUser("https://www.nodeseek.com/"))?.member_id || "").trim();
    if (!currentUserId) {
      throw new Error("无法确认当前 NodeSeek 账号，已跳过通知以避免误报");
    }
    if (newEntries.some((entry) => !normalizeTelegramActivityId(entry?.commenter_id))) {
      throw new Error("通知缺少作者 ID，已跳过发送以避免误报");
    }
  }

  // Entries from the API are newest-first; send oldest-first when a poll finds several.
  const notificationEntries = newEntries.reverse().filter((entry) => {
    return normalizeTelegramActivityId(entry.commenter_id) !== currentUserId;
  });
  // Mention and reply endpoints can report the same comment; the first successful delivery owns it.
  const commentReceipts = notificationEntries.length > 0
    ? await getTelegramActivityCommentReceipts()
    : {};
  const pendingNotificationEntries = notificationEntries.filter((entry) => {
    const receiptKey = getTelegramActivityCommentReceiptKey(currentUserId, entry.comment_id);
    return !receiptKey || !commentReceipts[receiptKey];
  });
  const activityContents = await fetchTelegramActivityCommentContents(pendingNotificationEntries);
  for (const entry of pendingNotificationEntries) {
    const receiptKey = getTelegramActivityCommentReceiptKey(currentUserId, entry.comment_id);
    if (receiptKey && commentReceipts[receiptKey]) continue;
    const commentId = normalizeTelegramActivityId(entry.comment_id);
    const extracted = activityContents.get(commentId);
    const content = String(extracted?.reply || entry.content || "");
    await sendTelegramActivityNotification(config, kind, formatTelegramActivityNotification(kind, {
      ...entry,
      quote: extracted?.quote || "",
      content
      }), `activity:${kind}:${normalizeTelegramActivityId(entry?.id)}`);
    if (receiptKey) {
      commentReceipts[receiptKey] = Date.now();
      await saveTelegramActivityCommentReceipts(commentReceipts);
    }
  }

  await saveTelegramActivityCursor(kind, discoveredIds, cursor);
}

function normalizeTelegramActivityCursor(value) {
  const ids = Array.isArray(value?.ids)
    ? [...new Set(value.ids.map(normalizeTelegramActivityId).filter(Boolean))].slice(0, TELEGRAM_ACTIVITY_CURSOR_LIMIT)
    : [];
  return { initialized: value?.initialized === true, ids };
}

function normalizeTelegramActivityId(value) {
  const id = String(value ?? "").trim();
  return /^\d+$/.test(id) ? id : "";
}

function getTelegramActivityCommentReceiptKey(userIdValue, commentIdValue) {
  const userId = normalizeTelegramActivityId(userIdValue);
  const commentId = normalizeTelegramActivityId(commentIdValue);
  return userId && commentId ? `${userId}:${commentId}` : "";
}

function normalizeTelegramActivityCommentReceipts(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([key, timestamp]) => /^\d+:\d+$/.test(key)
      && Number.isFinite(Number(timestamp)) && Number(timestamp) > 0)
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .slice(0, TELEGRAM_ACTIVITY_COMMENT_RECEIPT_LIMIT));
}

async function getTelegramActivityCommentReceipts() {
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.activityCommentReceipts]: {} });
  return normalizeTelegramActivityCommentReceipts(stored[TELEGRAM_KEYS.activityCommentReceipts]);
}

async function saveTelegramActivityCommentReceipts(receiptsValue) {
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.activityCommentReceipts]: {} });
  const receipts = {
    ...normalizeTelegramActivityCommentReceipts(stored[TELEGRAM_KEYS.activityCommentReceipts]),
    ...normalizeTelegramActivityCommentReceipts(receiptsValue)
  };
  const retainedReceipts = normalizeTelegramActivityCommentReceipts(receipts);
  await chrome.storage.local.set({ [TELEGRAM_KEYS.activityCommentReceipts]: retainedReceipts });
  return retainedReceipts;
}

async function fetchTelegramActivityCommentContents(entries) {
  const comments = entries
    .map((entry) => {
      const postId = normalizeTelegramActivityId(entry?.post_id);
      const commentId = normalizeTelegramActivityId(entry?.comment_id);
      if (!postId || !commentId) return null;
      const floor = Number(entry?.floor_id ?? entry?.floor_index);
      const pageNumber = Number.isInteger(floor) && floor > 0
        ? Math.ceil(floor / TELEGRAM_ACTIVITY_PAGE_SIZE)
        : 1;
      return { postId, commentId, pageNumber };
    })
    .filter(Boolean);
  if (comments.length === 0) return new Map();

  const pageGroups = new Map();
  for (const comment of comments) {
    const key = `${comment.postId}:${comment.pageNumber}`;
    if (!pageGroups.has(key)) pageGroups.set(key, []);
    pageGroups.get(key).push(comment);
  }

  const contents = new Map();
  for (const pageComments of pageGroups.values()) {
    const { postId, pageNumber } = pageComments[0];
    const html = await fetchTelegramPostPageHtml({ postId, pageNumber }, "通知帖子");
    const result = await parseTelegramPostHtmlInOffscreen("parse-activity-comments", html, pageComments);
    for (const item of Array.isArray(result?.contents) ? result.contents : []) {
      const commentId = normalizeTelegramActivityId(item?.commentId);
      if (!commentId || (typeof item?.quote !== "string" && typeof item?.reply !== "string")) continue;
      contents.set(commentId, { quote: String(item.quote || ""), reply: String(item.reply || "") });
    }
  }

  const missingComment = comments.find((comment) => !contents.has(comment.commentId));
  if (missingComment) throw new Error("NodeSeek 通知楼层正文缺失，稍后重试");
  return contents;
}

async function fetchTelegramPostPageHtml(reference, label) {
  const postId = normalizeTelegramActivityId(reference?.postId);
  const pageNumber = Number(reference?.pageNumber);
  if (!postId || !Number.isSafeInteger(pageNumber) || pageNumber < 1) {
    throw new Error("NodeSeek 帖子编号无效");
  }

  const url = `https://www.nodeseek.com/post-${postId}-${pageNumber}`;
  const response = await fetchWithTimeout(url, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "text/html" }
  });
  if (!response.ok) throw new Error(`读取${label}失败（HTTP ${response.status}）`);
  const html = await response.text();
  if (!/<(?:!doctype\s+html|html)\b/i.test(html)) throw new Error(`读取${label}时未返回帖子页面`);
  return html;
}

async function parseTelegramPostHtmlInOffscreen(operation, html, comments = []) {
  await ensureTelegramOffscreenParser();
  const response = await chrome.runtime.sendMessage({
    target: TELEGRAM_OFFSCREEN_PARSER_TARGET,
    operation,
    html,
    comments
  });
  if (!response?.ok) throw new Error(String(response?.error || "解析 NodeSeek 帖子正文失败"));
  return response.result;
}

async function ensureTelegramOffscreenParser() {
  if (!chrome.offscreen?.createDocument || typeof chrome.runtime.getContexts !== "function") {
    throw new Error("当前浏览器不支持后台解析帖子正文");
  }
  if (telegramOffscreenParserSetupPromise) return telegramOffscreenParserSetupPromise;

  telegramOffscreenParserSetupPromise = (async () => {
    const documentUrl = chrome.runtime.getURL(TELEGRAM_OFFSCREEN_PARSER_PATH);
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [documentUrl]
    });
    if (contexts.length > 0) return;

    await chrome.offscreen.createDocument({
      url: TELEGRAM_OFFSCREEN_PARSER_PATH,
      reasons: ["DOM_PARSER"],
      justification: "Parse NodeSeek post HTML to extract notification titles, quotes, and reply text."
    });
  })().catch((error) => {
    telegramOffscreenParserSetupPromise = null;
    throw error;
  });
  return telegramOffscreenParserSetupPromise;
}

async function saveTelegramActivityCursor(kind, discoveredIds, previousCursor) {
  const latest = await chrome.storage.local.get({ [TELEGRAM_KEYS.mentionReplyCursors]: {} });
  const storedCursors = latest[TELEGRAM_KEYS.mentionReplyCursors];
  const prior = normalizeTelegramActivityCursor(previousCursor);
  const ids = [...new Set([
    ...discoveredIds,
    ...(prior.initialized ? prior.ids : [])
  ])].slice(0, TELEGRAM_ACTIVITY_CURSOR_LIMIT);
  const cursors = { ...(storedCursors || {}), [kind]: { initialized: true, ids } };
  await chrome.storage.local.set({ [TELEGRAM_KEYS.mentionReplyCursors]: cursors });
}

function formatTelegramActivityNotification(kind, entry) {
  const isMention = kind === "at";
  const postUrl = buildTelegramNotificationPostUrl(entry);
  const author = String(entry.commenter_name || "NodeSeek 用户").trim().slice(0, 80);
  const title = normalizeTelegramMessageBody(entry.title || "NodeSeek 帖子").slice(0, 300);
  const quote = normalizeTelegramMessageBody(entry.quote || "").slice(0, 500);
  const content = normalizeTelegramMessageBody(entry.content || "").slice(0, 500);
  const lines = [
    isMention ? "NodeSeek 有人提及你" : "NodeSeek 有人回复你",
    `用户：${author}`,
    `主题：${title || "NodeSeek 帖子"}`
  ];
  if (postUrl) lines.push(postUrl);
  if (quote) lines.push(`引用: ${quote}`);
  if (content) lines.push(`回复: ${content}`);
  return lines.join("\n");
}

function buildTelegramNotificationPostUrl(entry) {
  const postId = String(entry?.post_id || "").replace(/\D/g, "");
  if (!postId) return "";

  const floor = entry?.floor_id ?? entry?.floor_index;
  const floorNumber = Number(floor);
  const pageNumber = Number.isInteger(floorNumber) && floorNumber > 0
    ? Math.ceil(floorNumber / TELEGRAM_ACTIVITY_PAGE_SIZE)
    : 1;
  const url = new URL(`https://www.nodeseek.com/post-${postId}-${pageNumber}`);
  if (entry.comment_id != null) url.searchParams.set("nshComment", String(entry.comment_id));
  if (floor != null) url.searchParams.set("nshFloor", String(floor));
  return url.href;
}

async function checkRssPosts(config) {
  const response = await fetchWithTimeout(TELEGRAM_RSS_URL, {
    credentials: "omit",
    headers: { Accept: "application/rss+xml, application/xml, text/xml" }
  });
  if (!response.ok) throw new Error(`NodeSeek RSS 返回 HTTP ${response.status}`);
  const posts = parseNodeSeekRss(await response.text());
  if (posts.length === 0) return;

  const seen = new Set(config[TELEGRAM_KEYS.rssSeenIds]);
  if (!config[TELEGRAM_KEYS.rssInitialized]) {
    await chrome.storage.local.set({
      [TELEGRAM_KEYS.rssSeenIds]: posts.map((post) => post.id).filter(Boolean).slice(0, TELEGRAM_RSS_SEEN_LIMIT),
      [TELEGRAM_KEYS.rssInitialized]: true
    });
    return;
  }

  const newPosts = posts.filter((post) => post.id && !seen.has(post.id)).reverse();
  const history = [...config[TELEGRAM_KEYS.rssHistory]];
  const addedIds = [];
  let currentUser;
  let currentUserLoaded = false;
  for (const post of newPosts) {
    const matched = matchTelegramRssPost(post, config);
    if (matched.length > 0) {
      if (!currentUserLoaded) {
        currentUser = typeof fetchLuckyCurrentUser === "function"
          ? await fetchLuckyCurrentUser("https://www.nodeseek.com/")
          : null;
        currentUserLoaded = true;
      }
      if (await isTelegramRssPostFromCurrentUser(post, currentUser)) {
        addedIds.push(post.id);
        continue;
      }

      const board = post.categories.length > 0 ? post.categories.join("、") : "未标注";
      await sendTelegramActivityNotification(
        config,
        "rss",
        `NodeSeek 新帖\n板块：${board}\n${post.title}\n命中：${matched.join("、")}\n${post.link}`,
        `rss:${post.id}`
      );
      history.unshift({ id: post.id, title: post.title, link: post.link, notifiedAt: Date.now() });
    }
    addedIds.push(post.id);
  }

  if (addedIds.length || history.length !== config[TELEGRAM_KEYS.rssHistory].length) {
    await chrome.storage.local.set({
      [TELEGRAM_KEYS.rssSeenIds]: [...addedIds.reverse(), ...seen].slice(0, TELEGRAM_RSS_SEEN_LIMIT),
      [TELEGRAM_KEYS.rssHistory]: history.slice(0, TELEGRAM_RSS_HISTORY_LIMIT)
    });
  }
}

function parseNodeSeekRss(xml) {
  return [...String(xml || "").matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
    .map((match) => {
      const item = match[1];
      const title = readRssTag(item, "title");
      const link = readRssTag(item, "link");
      const guid = readRssTag(item, "guid");
      const categoryValues = [...item.matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/gi)]
        .map((category) => decodeXmlText(category[1]).trim())
        .filter(Boolean);
      const id = String(guid || link).match(/post-(\d+)/i)?.[1] || guid || link;
      const author = readNodeSeekRssAuthor(item);
      return { id, title, link, categories: categoryValues, ...author };
    })
    .filter((post) => post.id && post.title && isSafeNodeSeekPostUrl(post.link));
}

function readNodeSeekRssAuthor(item) {
  const authorBlock = item.match(/<author\b[^>]*>([\s\S]*?)<\/author>/i)?.[1] || "";
  const authorId = [
    readRssTag(item, "author_id"),
    readRssTag(item, "authorId"),
    readRssTag(item, "creator_id"),
    readRssTag(item, "creatorId")
  ].find(Boolean) || authorBlock.match(/\/space\/(\d+)/i)?.[1] || "";
  const authorName = [
    readRssTag(item, "dc:creator"),
    readRssTag(item, "creator"),
    readRssTag(authorBlock, "name"),
    authorBlock ? decodeXmlText(authorBlock) : ""
  ].find(Boolean) || "";
  return {
    ...(authorId ? { authorId: String(authorId).trim() } : {}),
    ...(authorName ? { authorName: String(authorName).trim() } : {})
  };
}

async function isTelegramRssPostFromCurrentUser(post, currentUser) {
  const currentUserId = String(currentUser?.member_id || "").trim();
  const currentUserName = normalizeTelegramRssAuthorName(currentUser?.member_name);
  if (!currentUserId && !currentUserName) return false;

  let authorId = String(post.authorId || "").trim();
  let authorName = normalizeTelegramRssAuthorName(post.authorName);
  if (!authorId) {
    const response = await fetchWithTimeout(post.link, {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "text/html" }
    });
    if (!response.ok) throw new Error(`读取 NodeSeek 帖子作者失败：HTTP ${response.status}`);
    const pageAuthor = parseTelegramRssPostAuthor(await response.text());
    authorId = pageAuthor.authorId;
    authorName ||= pageAuthor.authorName;
  }

  return Boolean(
    (currentUserId && authorId && authorId === currentUserId)
    || (currentUserName && authorName && authorName === currentUserName)
  );
}

function parseTelegramRssPostAuthor(html) {
  const links = [...String(html || "").matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const authorLink = links.find((match) => {
    const className = match[1].match(/\bclass=["']([^"']*)["']/i)?.[1] || "";
    const href = match[1].match(/\bhref=["']([^"']*)["']/i)?.[1] || "";
    return className.split(/\s+/).includes("author-name") && /\/space\/[^/?#]+/i.test(href);
  });
  const href = authorLink?.[1].match(/\bhref=["']([^"']*)["']/i)?.[1] || "";
  const authorId = href.match(/\/space\/([^/?#]+)/i)?.[1] || "";
  const authorName = authorLink?.[2] || "";
  return {
    authorId: decodeXmlText(authorId),
    authorName: normalizeTelegramRssAuthorName(decodeXmlText(authorName))
  };
}

function normalizeTelegramRssAuthorName(value) {
  return decodeXmlText(String(value || "")).trim().replace(/^@/, "").toLocaleLowerCase();
}

function readRssTag(item, name) {
  const value = item.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || "";
  return decodeXmlText(value).trim();
}

function decodeXmlText(value) {
  return String(value || "")
    .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\s+/g, " ");
}

function isSafeNodeSeekPostUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === "https://www.nodeseek.com" && /^\/post-\d+-\d+\/?$/.test(url.pathname);
  } catch (_error) {
    return false;
  }
}

function matchTelegramRssPost(post, config) {
  const rules = config[TELEGRAM_KEYS.keywords].filter((rule) => rule?.enabled !== false && Array.isArray(rule.terms));
  if (rules.length === 0) return [];
  const text = `${post.title} ${post.categories.join(" ")}`.toLocaleLowerCase();
  const blocked = config[TELEGRAM_KEYS.blockedKeywords]
    .some((keyword) => keyword && text.includes(keyword.toLocaleLowerCase()));
  if (blocked) return [];

  const boardSlugs = config[TELEGRAM_KEYS.boards];
  if (boardSlugs.length > 0) {
    const postBoards = post.categories.map(resolveTelegramBoardSlug).filter(Boolean);
    if (!boardSlugs.some((slug) => postBoards.includes(slug))) return [];
  }

  const matched = new Set();
  for (const rule of rules) {
    const termGroups = getTelegramKeywordRuleTermGroups(rule);
    const excludedTerms = Array.isArray(rule.excludeTerms)
      ? rule.excludeTerms.map((term) => String(term || "").trim()).filter(Boolean)
      : [];
    if (excludedTerms.some((term) => text.includes(term.toLocaleLowerCase()))) continue;
    const checks = termGroups.map((group) => group.filter((term) => text.includes(term.toLocaleLowerCase())));
    const hit = checks.length > 0 && checks.every((group) => group.length > 0);
    if (hit) checks.flat().forEach((term) => matched.add(term));
  }
  return [...matched];
}

function getTelegramKeywordRuleTermGroups(rule) {
  const savedGroups = Array.isArray(rule?.termGroups)
    ? rule.termGroups.map((group) => Array.isArray(group)
      ? [...new Set(group.map((term) => String(term || "").trim()).filter(Boolean))]
      : []).filter((group) => group.length > 0)
    : [];
  if (savedGroups.length > 0) return savedGroups;

  const terms = [...new Set((Array.isArray(rule?.terms) ? rule.terms : [])
    .map((term) => String(term || "").trim()).filter(Boolean))];
  if (rule?.mode === "all") return terms.map((term) => [term]);
  return terms.length > 0 ? [terms] : [];
}

function resolveTelegramBoardSlug(value) {
  const normalized = String(value || "").trim().toLocaleLowerCase();
  if (Object.hasOwn(TELEGRAM_BOARD_NAMES, normalized)) return normalized;
  return Object.entries(TELEGRAM_BOARD_NAMES)
    .find(([, name]) => name.toLocaleLowerCase() === normalized)?.[0] || "";
}

function getConversationId(message) {
  const participants = [message?.sender_id, message?.receiver_id]
    .map((value) => String(value || "").trim()).filter(Boolean).sort();
  return participants.length === 2 ? participants.join(":") : "";
}

function getConversationPeerId(message, currentUserIdValue) {
  const currentUserId = String(currentUserIdValue || "").trim();
  const senderId = String(message?.sender_id || "").trim();
  const receiverId = String(message?.receiver_id || "").trim();
  if (!currentUserId || !senderId || !receiverId) return "";
  if (senderId === currentUserId) return receiverId;
  if (receiverId === currentUserId) return senderId;
  return "";
}

function isNodeSeekMessageIdAfter(messageIdValue, cursorValue) {
  const messageId = Number(messageIdValue);
  const cursor = Number(cursorValue) || 0;
  return Number.isFinite(messageId) && messageId > cursor;
}

async function getTelegramOutgoingEchoFingerprint(userIdValue, contentValue) {
  const userId = String(userIdValue || "").trim();
  const media = extractTelegramMessageMedia(contentValue);
  const content = JSON.stringify([
    media.text.replace(/\s+/g, " ").trim(),
    media.imageUrls
  ]);
  const bytes = new TextEncoder().encode(`${userId}\u0000${content}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function rememberTelegramOutgoingEcho(userIdValue, contentValue, origin = {}) {
  const userId = String(userIdValue || "").trim();
  const originChatId = String(origin.chatId || "").trim();
  const originTopicId = String(origin.topicId || "").trim();
  const originTopicName = stripTelegramTopicUnreadPrefix(origin.topicName || "");
  const fingerprint = await getTelegramOutgoingEchoFingerprint(userId, contentValue);
  const now = Date.now();
  const cursorState = await chrome.storage.local.get({ [TELEGRAM_KEYS.messageCursors]: {} });
  const conversationCursor = origin.baselineMessageId != null
    ? String(origin.baselineMessageId)
    : Object.entries(cursorState[TELEGRAM_KEYS.messageCursors] || {})
    .find(([conversationId]) => conversationId.split(":").includes(userId))?.[1];
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.outgoingMessageEchoes]: [] });
  const echoes = (Array.isArray(stored[TELEGRAM_KEYS.outgoingMessageEchoes])
    ? stored[TELEGRAM_KEYS.outgoingMessageEchoes] : [])
    .filter((echo) => echo?.userId && echo?.fingerprint
      && now - Number(echo.createdAt) <= TELEGRAM_OUTGOING_ECHO_TTL_MS);
  const id = String(origin.echoId || crypto.randomUUID());
  if (echoes.some((echo) => echo.id === id)) return id;
  echoes.push({
    id,
    userId,
    fingerprint,
    originChatId,
    originTopicId,
    originTopicName,
    baselineMessageId: conversationCursor == null ? "" : String(conversationCursor),
    status: "sending",
    createdAt: now
  });
  await chrome.storage.local.set({
    [TELEGRAM_KEYS.outgoingMessageEchoes]: echoes.slice(-TELEGRAM_OUTGOING_ECHO_LIMIT)
  });
  return id;
}

async function findNodeSeekOutgoingMessageForTelegramEcho(userIdValue, contentValue, baselineMessageIdValue) {
  const userId = String(userIdValue || "").trim();
  const baselineMessageId = Number(baselineMessageIdValue);
  if (!userId || !Number.isFinite(baselineMessageId)) return null;
  const currentUser = await fetchLuckyCurrentUser("https://www.nodeseek.com/");
  const currentUserId = String(currentUser?.member_id || "").trim();
  if (!currentUserId) throw new Error("无法确认当前 NodeSeek 账号，暂时无法核对发送结果");
  const expectedFingerprint = await getTelegramOutgoingEchoFingerprint(userId, contentValue);
  const conversation = await fetchNodeSeekConversationMessages(userId);
  for (const message of conversation.msgArray) {
    if (String(message?.sender_id || "") !== currentUserId
        || String(message?.receiver_id || "") !== userId
        || Number(message?.id) <= baselineMessageId) continue;
    const fingerprint = await getTelegramOutgoingEchoFingerprint(userId, message?.content || "");
    if (fingerprint === expectedFingerprint) return message;
  }
  return null;
}

async function getNodeSeekTelegramSendBaselineMessageId(userIdValue) {
  const userId = String(userIdValue || "").trim();
  const conversation = await fetchNodeSeekConversationMessages(userId);
  return conversation.msgArray.reduce((latest, message) => {
    const id = Number(message?.id);
    return Number.isSafeInteger(id) && id > latest ? id : latest;
  }, 0).toString();
}

async function updateTelegramOutgoingEchoStatus(echoIdValue, status) {
  const echoId = String(echoIdValue || "");
  if (!echoId) return;
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.outgoingMessageEchoes]: [] });
  const echoes = Array.isArray(stored[TELEGRAM_KEYS.outgoingMessageEchoes])
    ? stored[TELEGRAM_KEYS.outgoingMessageEchoes] : [];
  await chrome.storage.local.set({
    [TELEGRAM_KEYS.outgoingMessageEchoes]: echoes.map((echo) => echo.id === echoId
      ? { ...echo, status }
      : echo)
  });
}

async function discardTelegramOutgoingEcho(echoIdValue) {
  const echoId = String(echoIdValue || "");
  if (!echoId) return;
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.outgoingMessageEchoes]: [] });
  const echoes = Array.isArray(stored[TELEGRAM_KEYS.outgoingMessageEchoes])
    ? stored[TELEGRAM_KEYS.outgoingMessageEchoes] : [];
  await chrome.storage.local.set({
    [TELEGRAM_KEYS.outgoingMessageEchoes]: echoes.filter((echo) => echo.id !== echoId)
  });
}

async function consumeTelegramOutgoingEcho(userIdValue, contentValue, messageIdValue = null) {
  try {
    const userId = String(userIdValue || "").trim();
    const fingerprint = await getTelegramOutgoingEchoFingerprint(userId, contentValue);
    const now = Date.now();
    const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.outgoingMessageEchoes]: [] });
    const previousEchoes = Array.isArray(stored[TELEGRAM_KEYS.outgoingMessageEchoes])
      ? stored[TELEGRAM_KEYS.outgoingMessageEchoes] : [];
    const echoes = previousEchoes.filter((echo) => echo?.userId && echo?.fingerprint
      && now - Number(echo.createdAt) <= TELEGRAM_OUTGOING_ECHO_TTL_MS);
    const hasMessageId = messageIdValue !== null && messageIdValue !== undefined
      && Number.isFinite(Number(messageIdValue));
    const messageId = Number(messageIdValue);
    const matchIndex = echoes.findIndex((echo) => {
      if (echo.userId !== userId || echo.fingerprint !== fingerprint) return false;
      const hasBaseline = echo.baselineMessageId !== "" && echo.baselineMessageId != null
        && Number.isFinite(Number(echo.baselineMessageId));
      return !hasMessageId || !hasBaseline || messageId > Number(echo.baselineMessageId);
    });
    if (matchIndex < 0) {
      if (echoes.length !== previousEchoes.length) {
        await chrome.storage.local.set({ [TELEGRAM_KEYS.outgoingMessageEchoes]: echoes });
      }
      return null;
    }
    const match = echoes[matchIndex];
    if (match.status === "sending"
        && now - Number(match.createdAt) < TELEGRAM_OUTGOING_ECHO_PENDING_TIMEOUT_MS) {
      return { pending: true };
    }
    echoes.splice(matchIndex, 1);
    await chrome.storage.local.set({ [TELEGRAM_KEYS.outgoingMessageEchoes]: echoes });
    return { record: match };
  } catch (_error) {
    return null;
  }
}

async function fetchNodeSeekConversationMessages(userIdValue) {
  const userId = String(userIdValue || "").trim();
  const response = await fetchWithTimeout(
    `https://www.nodeseek.com/api/notification/message/with/${encodeURIComponent(userId)}`,
    { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } }
  );
  const conversation = await response.json();
  if (!response.ok || conversation?.success !== true || !Array.isArray(conversation.msgArray)) {
    throw new Error(conversation?.message || `读取 NodeSeek 私信失败（HTTP ${response.status}）`);
  }
  return conversation;
}

function isUnviewedMessage(message) {
  return message?.viewed === false || message?.viewed === 0 || String(message?.viewed) === "0";
}

function isViewedMessage(message) {
  return message?.viewed === true || message?.viewed === 1 || String(message?.viewed) === "1";
}

function getTelegramTopicReadStatusKey(chatIdValue, topicIdValue) {
  return `${String(chatIdValue || "").trim()}:${String(topicIdValue || "").trim()}`;
}

function stripTelegramTopicUnreadPrefix(nameValue) {
  return String(nameValue || "").replace(/^📬\s*/, "").trim();
}

async function editTelegramTopicReadMarker(tokenValue, status, unread) {
  const token = String(tokenValue || "").trim();
  const chatId = String(status?.chatId || "").trim();
  const topicId = String(status?.topicId || "").trim();
  const baseName = stripTelegramTopicUnreadPrefix(status?.topicName);
  if (!token || !chatId || !/^\d+$/.test(topicId) || !baseName) return false;

  const storedTopics = await chrome.storage.local.get({ [TELEGRAM_KEYS.managedTopics]: [] });
  const topic = (Array.isArray(storedTopics[TELEGRAM_KEYS.managedTopics])
    ? storedTopics[TELEGRAM_KEYS.managedTopics] : [])
    .find((item) => String(item.chatId) === chatId && String(item.topicId) === topicId);
  const originalIconId = String(status.topicIconBeforeMarker || topic?.iconCustomEmojiId || "");
  if (!originalIconId) return false;
  const iconId = unread
    ? await getTelegramTopicUnreadIconCustomEmojiId(token)
    : originalIconId;
  if (!iconId) return false;
  try {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/editForumTopic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_thread_id: Number(topicId),
        name: baseName,
        icon_custom_emoji_id: iconId
      })
    });
    const result = await response.json();
    return response.ok && result?.ok === true;
  } catch (_error) {
    return false;
  }
}

async function getTelegramTopicUnreadIconCustomEmojiId(tokenValue) {
  const token = String(tokenValue || "").trim();
  if (!token) return "";
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.topicReadMarkerIconId]: "" });
  if (stored[TELEGRAM_KEYS.topicReadMarkerIconId]) {
    return String(stored[TELEGRAM_KEYS.topicReadMarkerIconId]);
  }

  try {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/getForumTopicIconStickers`);
    const result = await response.json();
    if (!response.ok || result?.ok !== true || !Array.isArray(result.result)) {
      await chrome.storage.local.set({
        [TELEGRAM_KEYS.lastError]: `获取 Telegram 主题图标失败：${String(result?.description || `HTTP ${response.status}`).slice(0, 220)}`
      });
      return "";
    }
    const normalizeEmoji = (value) => String(value || "").replace(/\uFE0F/g, "");
    const preferredEmojis = ["👀"];
    for (const emoji of preferredEmojis) {
      const sticker = result.result.find((item) => normalizeEmoji(item?.emoji) === normalizeEmoji(emoji)
        && item?.custom_emoji_id);
      if (!sticker) continue;
      const iconId = String(sticker.custom_emoji_id);
      await chrome.storage.local.set({ [TELEGRAM_KEYS.topicReadMarkerIconId]: iconId });
      return iconId;
    }
  } catch (_error) {
    // Keep the topic unchanged when Telegram cannot provide an allowed icon.
  }
  return "";
}

async function recordTelegramOutgoingReadStatus(token, echo, message) {
  const chatId = String(echo?.originChatId || "").trim();
  const topicId = String(echo?.originTopicId || "").trim();
  const userId = String(echo?.userId || "").trim();
  if (!chatId || !topicId || !userId || message?.id == null) return;

  const key = getTelegramTopicReadStatusKey(chatId, topicId);
  const [statusState, topicState] = await Promise.all([
    chrome.storage.local.get({ [TELEGRAM_KEYS.outgoingReadStatuses]: {} }),
    chrome.storage.local.get({ [TELEGRAM_KEYS.managedTopics]: [] })
  ]);
  const statuses = { ...(statusState[TELEGRAM_KEYS.outgoingReadStatuses] || {}) };
  const previous = statuses[key];
  const topic = (Array.isArray(topicState[TELEGRAM_KEYS.managedTopics])
    ? topicState[TELEGRAM_KEYS.managedTopics] : [])
    .find((item) => item.kind === "dm"
      && String(item.chatId) === chatId
      && String(item.topicId) === topicId
      && String(item.nsUserId) === userId);
  const topicName = stripTelegramTopicUnreadPrefix(previous?.topicName || topic?.name || echo?.originTopicName || "");
  if (!topicName) return;

  const status = {
    chatId,
    topicId,
    userId,
    messageId: String(message.id),
    topicName,
    topicIconBeforeMarker: String(previous?.topicIconBeforeMarker || topic?.iconCustomEmojiId || ""),
    readState: isViewedMessage(message) ? "read" : isUnviewedMessage(message) ? "unread" : "unknown",
    markerType: previous?.messageId === String(message.id) ? previous?.markerType || "" : "",
    markerApplied: previous?.messageId === String(message.id) && previous?.markerApplied === true,
    updatedAt: Date.now()
  };
  statuses[key] = status;
  await chrome.storage.local.set({ [TELEGRAM_KEYS.outgoingReadStatuses]: statuses });

  if (status.readState === "read") {
    if (!previous) {
      delete statuses[key];
      await chrome.storage.local.set({ [TELEGRAM_KEYS.outgoingReadStatuses]: statuses });
      return;
    }
    const restored = await editTelegramTopicReadMarker(token, status, false);
    if (restored) {
      delete statuses[key];
      await chrome.storage.local.set({ [TELEGRAM_KEYS.outgoingReadStatuses]: statuses });
    }
  } else if (status.readState === "unread"
      && (status.markerType !== TELEGRAM_TOPIC_UNREAD_MARKER_TYPE || !status.markerApplied)) {
    const marked = await editTelegramTopicReadMarker(token, status, true);
    if (marked) {
      statuses[key] = {
        ...status,
        markerType: TELEGRAM_TOPIC_UNREAD_MARKER_TYPE,
        markerApplied: true
      };
      await chrome.storage.local.set({ [TELEGRAM_KEYS.outgoingReadStatuses]: statuses });
    }
  }
}

async function checkPendingTelegramOutgoingEchoes(tokenValue) {
  const token = String(tokenValue || "").trim();
  if (!token) return;
  const [echoState, currentUser] = await Promise.all([
    chrome.storage.local.get({ [TELEGRAM_KEYS.outgoingMessageEchoes]: [] }),
    fetchLuckyCurrentUser("https://www.nodeseek.com/").catch(() => null)
  ]);
  const currentUserId = String(currentUser?.member_id || "").trim();
  if (!currentUserId) return;

  const now = Date.now();
  const echoes = Array.isArray(echoState[TELEGRAM_KEYS.outgoingMessageEchoes])
    ? echoState[TELEGRAM_KEYS.outgoingMessageEchoes] : [];
  const pending = echoes.filter((echo) => echo?.status === "sent"
    && echo?.originChatId && echo?.originTopicId && echo?.userId
    && now - Number(echo.createdAt) <= TELEGRAM_OUTGOING_ECHO_TTL_MS
    && echo.baselineMessageId !== "");
  const userIds = [...new Set(pending.map((echo) => String(echo.userId)))];

  for (const userId of userIds) {
    let conversation;
    try {
      conversation = await fetchNodeSeekConversationMessages(userId);
    } catch (_error) {
      continue;
    }
    const outgoingMessages = conversation.msgArray
      .filter((message) => String(message?.sender_id || "") === currentUserId
        && String(message?.receiver_id || "") === userId)
      .sort((a, b) => Number(a.id) - Number(b.id));
    for (const message of outgoingMessages) {
      const candidates = pending.filter((echo) => String(echo.userId) === userId
        && Number(message.id) > Number(echo.baselineMessageId || 0));
      if (candidates.length === 0) continue;
      const matched = await consumeTelegramOutgoingEcho(userId, message.content, message.id);
      if (matched?.record) {
        await recordTelegramOutgoingReadStatus(token, matched.record, message).catch(() => {});
      }
    }
  }
}

async function checkPendingTelegramOutgoingReadStatuses(tokenValue) {
  const token = String(tokenValue || "").trim();
  if (!token) return false;
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.outgoingReadStatuses]: {} });
  const statuses = { ...(stored[TELEGRAM_KEYS.outgoingReadStatuses] || {}) };
  const grouped = new Map();
  for (const [key, status] of Object.entries(statuses)) {
    if (!status?.userId || !status?.messageId) continue;
    if (!grouped.has(String(status.userId))) grouped.set(String(status.userId), []);
    grouped.get(String(status.userId)).push([key, status]);
  }

  let resolved = false;
  for (const [userId, entries] of grouped) {
    let conversation;
    try {
      conversation = await fetchNodeSeekConversationMessages(userId);
    } catch (_error) {
      continue;
    }
    for (const [key, status] of entries) {
      const message = conversation.msgArray.find((item) => String(item?.id) === String(status.messageId));
      if (!message) continue;
      if (isViewedMessage(message)) {
        const restored = await editTelegramTopicReadMarker(token, status, false);
        if (restored) {
          delete statuses[key];
          resolved = true;
        }
      } else if (isUnviewedMessage(message)) {
        if (status.readState !== "unread"
            || status.markerType !== TELEGRAM_TOPIC_UNREAD_MARKER_TYPE
            || status.markerApplied !== true) {
          const marked = await editTelegramTopicReadMarker(token, status, true);
          statuses[key] = {
            ...status,
            markerType: TELEGRAM_TOPIC_UNREAD_MARKER_TYPE,
            readState: "unread",
            markerApplied: marked,
            updatedAt: Date.now()
          };
        }
      }
    }
  }
  await chrome.storage.local.set({ [TELEGRAM_KEYS.outgoingReadStatuses]: statuses });
  return resolved;
}

function normalizeTelegramMessageBody(value) {
  return String(value || "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/\s*\n\s*/g, "\n").trim().slice(0, 3300);
}

function extractNodeSeekSystemPostReference(value) {
  const candidates = String(value || "").match(/https?:\/\/[^\s)<>"']+/gi) || [];
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate.replace(/[.,!?;]+$/, ""));
      if (url.hostname !== "www.nodeseek.com" && url.hostname !== "nodeseek.com") continue;
      const match = url.pathname.match(/^\/post-(\d+)(?:-(\d+))?\/?$/);
      if (!match) continue;
      return { postId: match[1], pageNumber: Number(match[2] || 1) };
    } catch (_error) {
      // Ignore malformed and non-NodeSeek links.
    }
  }
  return null;
}

async function fetchTelegramSystemNotificationPostContent(value) {
  const reference = extractNodeSeekSystemPostReference(value);
  if (!reference) throw new Error("无法识别关注帖链接，稍后重试");
  const html = await fetchTelegramPostPageHtml(reference, "关注帖");
  const result = await parseTelegramPostHtmlInOffscreen("parse-system-post", html);
  const title = normalizeTelegramMessageBody(result?.title || "").slice(0, 300);
  const body = typeof result?.body === "string"
    ? normalizeTelegramMessageBody(result.body).slice(0, 2400)
    : null;
  if (!title || body === null) throw new Error("NodeSeek 关注帖标题或正文暂时无法读取，稍后重试");
  return { title, body };
}

function formatTelegramSystemPostNotificationBody(messageBody, post) {
  const original = String(messageBody || "")
    .replace(/^\s*\[主题\]\s*:\s*$/gm, "")
    .replace(/^\s*\[正文\]\s*:\s*$/gm, "")
    .trim();
  const lines = original ? [original, ""] : [];
  if (post.title) lines.push(`主题：${post.title}`);
  lines.push(`正文：${post.body || "（无文字正文）"}`);
  return normalizeTelegramMessageBody(lines.join("\n"));
}

function extractTelegramMessageMedia(value) {
  const imageUrls = [];
  const addImageUrl = (value) => {
    const url = String(value || "").replace(/&amp;/g, "&").trim();
    if (/^https?:\/\//i.test(url) && !imageUrls.includes(url)) imageUrls.push(url);
  };
  let text = String(value || "")
    .replace(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)(?:\s+[^)]*)?\)/gi, (_match, url) => {
      addImageUrl(url);
      return "";
    })
    .replace(/<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi, (_match, doubleQuoted, singleQuoted, unquoted) => {
      addImageUrl(doubleQuoted || singleQuoted || unquoted);
      return "";
    });

  text = text.replace(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)(?:\s+[^)]*)?\)/gi, (match, _label, url) => {
    let isImage = false;
    try {
      const parsedUrl = new URL(url);
      isImage = /\.(?:avif|bmp|gif|jpe?g|png|webp)$/i.test(parsedUrl.pathname)
        || /(^|\.)nodeimage\.com$/i.test(parsedUrl.hostname);
    } catch (_error) {
      // Keep malformed or unsupported links as text.
    }
    if (!isImage) return match;
    addImageUrl(url);
    return "";
  });

  return { text: normalizeTelegramMessageBody(text), imageUrls };
}

function getTelegramDeliveryTargetKey(target) {
  return [String(target?.chatId || "").trim(), String(target?.topicId || "").trim(), String(target?.type || "")].join(":");
}

async function sendTelegramWithDeliveryReceipt(token, target, deliveryKey, partKey, send) {
  const eventKey = String(deliveryKey || "").trim();
  if (!eventKey) {
    await send();
    return;
  }
  const receiptKey = `${eventKey}:${getTelegramDeliveryTargetKey(target)}:${String(partKey || "message")}`;
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.deliveryReceipts]: {} });
  const receipts = { ...(stored[TELEGRAM_KEYS.deliveryReceipts] || {}) };
  if (receipts[receiptKey]) return;
  await send();
  receipts[receiptKey] = Date.now();
  const retainedReceipts = Object.fromEntries(Object.entries(receipts)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 1000));
  await chrome.storage.local.set({ [TELEGRAM_KEYS.deliveryReceipts]: retainedReceipts });
}

async function sendTelegramToTargets(config, text, deliveryKey = "") {
  const targetKeys = new Set();
  const targets = (Array.isArray(config[TELEGRAM_KEYS.targets]) ? config[TELEGRAM_KEYS.targets] : [])
    .filter((target) => {
      if (target?.enabled === false || !target?.chatId) return false;
      const key = `${String(target.chatId).trim()}:${String(target.topicId || "").trim()}`;
      if (targetKeys.has(key)) return false;
      targetKeys.add(key);
      return true;
    });
  if (targets.length === 0) throw new Error("没有启用的 Telegram 推送目标");
  for (const target of targets) {
    await sendTelegramWithDeliveryReceipt(
      config[TELEGRAM_KEYS.token], target, deliveryKey, "message",
      () => sendTelegramMessage(config[TELEGRAM_KEYS.token], target, text)
    );
  }
}

async function sendTelegramPrivateMessageToTopics(
  config,
  userId,
  userName,
  topicText,
  fallbackText,
  topicKind = "dm",
  imageUrls = [],
  { includeDirectTargets = true, deliveryKey = "" } = {}
) {
  const deliveredTopics = [];
  const targets = (Array.isArray(config[TELEGRAM_KEYS.targets]) ? config[TELEGRAM_KEYS.targets] : [])
    .filter((target) => target?.enabled !== false && target?.chatId);
  if (targets.length === 0) throw new Error("没有启用的 Telegram 推送目标");
  const personalTargets = targets.filter((target) => target.type !== "direct");
  const otherTargets = includeDirectTargets ? targets.filter((target) => target.type === "direct") : [];

  if (personalTargets.length === 0) {
    if (!includeDirectTargets) return deliveredTopics;
    if (imageUrls.length === 0) {
      await sendTelegramToTargets(config, fallbackText, deliveryKey);
      return deliveredTopics;
    }
    const targetKeys = new Set();
    for (const target of targets) {
      const key = `${String(target.chatId).trim()}:${String(target.topicId || "").trim()}`;
      if (targetKeys.has(key)) continue;
      targetKeys.add(key);
      await sendTelegramPrivateMessageContent(
        config[TELEGRAM_KEYS.token], target, fallbackText, imageUrls, deliveryKey
      );
    }
    return deliveredTopics;
  }

  for (const target of personalTargets) {
    const topic = await getOrCreateManagedTelegramTopic(config[TELEGRAM_KEYS.token], target.chatId, topicKind, {
      userId,
      userName
    });
    await sendTelegramPrivateMessageContent(
      config[TELEGRAM_KEYS.token],
      { ...target, topicId: topic.topicId },
      topicText,
      imageUrls,
      deliveryKey
    );
    deliveredTopics.push({ chatId: String(target.chatId), topicId: String(topic.topicId), name: topic.name });
  }
  for (const target of otherTargets) {
    await sendTelegramPrivateMessageContent(
      config[TELEGRAM_KEYS.token], target, fallbackText, imageUrls, deliveryKey
    );
  }
  return deliveredTopics;
}

async function sendTelegramPrivateMessageContent(token, target, text, imageUrls = [], deliveryKey = "") {
  const urls = [...new Set((Array.isArray(imageUrls) ? imageUrls : []).map((url) => String(url || "").trim()).filter(Boolean))];
  if (urls.length === 0) {
    await sendTelegramWithDeliveryReceipt(
      token, target, deliveryKey, "message", () => sendTelegramMessage(token, target, text)
    );
    return;
  }

  const messageText = String(text || "").trim();
  const canUseCaption = messageText.length > 0 && messageText.length <= 1024;
  let textSent = false;
  for (const [index, url] of urls.entries()) {
    const caption = index === 0 && canUseCaption ? messageText : "";
    const partKey = `image:${index}`;
    try {
      await sendTelegramWithDeliveryReceipt(
        token, target, deliveryKey, partKey, () => sendTelegramPhoto(token, target, url, caption)
      );
      if (caption) textSent = true;
    } catch (error) {
      if (!error?.telegramResponseReceived || Number(error.httpStatus) !== 400 || error.retryAfterSeconds) throw error;
      const fallbackText = [caption, `图片链接：${url}`].filter(Boolean).join("\n");
      await sendTelegramWithDeliveryReceipt(
        token, target, deliveryKey, partKey, () => sendTelegramMessage(token, target, fallbackText)
      );
      if (caption) textSent = true;
    }
  }
  if (messageText && !textSent) {
    await sendTelegramWithDeliveryReceipt(
      token, target, deliveryKey, "caption", () => sendTelegramMessage(token, target, messageText)
    );
  }
}

async function sendTelegramActivityNotification(config, kind, text, deliveryKey = "") {
  const targets = (Array.isArray(config[TELEGRAM_KEYS.targets]) ? config[TELEGRAM_KEYS.targets] : [])
    .filter((target) => target?.enabled !== false && target?.chatId);
  if (targets.length === 0) throw new Error("没有启用的 Telegram 推送目标");
  const personalTargets = targets.filter((target) => target.type !== "direct");
  const otherTargets = targets.filter((target) => target.type === "direct");

  if (personalTargets.length === 0) {
    await sendTelegramToTargets(config, text, deliveryKey);
    return;
  }

  for (const target of personalTargets) {
    const topicKind = kind === "at" ? "mention" : kind;
    const topic = await getOrCreateManagedTelegramTopic(config[TELEGRAM_KEYS.token], target.chatId, topicKind);
    const topicTarget = { ...target, topicId: topic.topicId };
    await sendTelegramWithDeliveryReceipt(
      config[TELEGRAM_KEYS.token], topicTarget, deliveryKey, "message",
      () => sendTelegramMessage(config[TELEGRAM_KEYS.token], topicTarget, text)
    );
  }
  for (const target of otherTargets) {
    await sendTelegramWithDeliveryReceipt(
      config[TELEGRAM_KEYS.token], target, deliveryKey, "message",
      () => sendTelegramMessage(config[TELEGRAM_KEYS.token], target, text)
    );
  }
}

async function normalizeManagedSystemTopics(tokenValue, systemUserIdValue) {
  const token = String(tokenValue || "").trim();
  const systemUserId = String(systemUserIdValue || "").trim();
  if (!systemUserId) return;
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.managedTopics]: [] });
  const topics = Array.isArray(stored[TELEGRAM_KEYS.managedTopics]) ? stored[TELEGRAM_KEYS.managedTopics] : [];
  const chatIds = new Set(topics
    .filter((topic) => topic.kind === "system"
      || (topic.kind === "dm" && String(topic.nsUserId) === systemUserId))
    .map((topic) => String(topic.chatId || "").trim())
    .filter(Boolean));
  for (const chatId of chatIds) await normalizeManagedSystemTopic(chatId, systemUserId, token);
}

function getManagedTelegramTopicStyle(topic) {
  const baseStyle = TELEGRAM_TOPIC_STYLES[topic?.kind];
  if (!baseStyle || topic.kind !== "dm") return baseStyle;

  const currentIconId = String(topic.iconCustomEmojiId || "");
  const storedIconStyle = topic.dmAnimalIconVersion === 1
    ? TELEGRAM_DM_TOPIC_ICONS.find((icon) => icon.customEmojiId === currentIconId)
    : null;
  const icon = storedIconStyle || TELEGRAM_DM_TOPIC_ICONS[
    Math.floor(Math.random() * TELEGRAM_DM_TOPIC_ICONS.length)
  ];
  return { ...baseStyle, iconCustomEmojiId: icon.customEmojiId, dmAnimalIconVersion: 1 };
}

async function applyManagedTelegramTopicStyle(tokenValue, topic, nameValue) {
  const token = String(tokenValue || "").trim();
  const style = getManagedTelegramTopicStyle(topic);
  if (!token || !style || !topic?.chatId || !topic?.topicId) return topic;

  const name = stripTelegramTopicUnreadPrefix(String(nameValue ?? topic.name ?? "").trim()).slice(0, 128);
  const nameChanged = name && stripTelegramTopicUnreadPrefix(topic.name) !== name;
  const iconChanged = String(topic.iconCustomEmojiId || "") !== style.iconCustomEmojiId;
  const animalVersionChanged = topic.kind === "dm" && topic.dmAnimalIconVersion !== 1;
  if (!nameChanged && !iconChanged && !animalVersionChanged) return topic;

  try {
    const payload = {
      chat_id: topic.chatId,
      message_thread_id: Number(topic.topicId),
      ...(nameChanged ? { name } : {}),
      ...(iconChanged ? { icon_custom_emoji_id: style.iconCustomEmojiId } : {})
    };
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/editForumTopic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result?.ok) return topic;

    const updated = {
      ...topic,
      ...(nameChanged ? { name } : {}),
      ...(iconChanged ? { iconCustomEmojiId: style.iconCustomEmojiId } : {}),
      ...(topic.kind === "dm" ? { dmAnimalIconVersion: 1 } : {})
    };
    const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.managedTopics]: [] });
    const topics = Array.isArray(stored[TELEGRAM_KEYS.managedTopics]) ? stored[TELEGRAM_KEYS.managedTopics] : [];
    await chrome.storage.local.set({
      [TELEGRAM_KEYS.managedTopics]: topics.map((item) => item.id === topic.id ? updated : item)
    });
    return updated;
  } catch (_error) {
    // Keep the topic usable if Telegram cannot update its icon or name.
    return topic;
  }
}

async function sendPendingTelegramUsernameCopyNotice(tokenValue, topic) {
  if (topic?.kind !== "dm" || topic.usernameCopyNoticePending !== true) return topic;
  const userName = String(topic.name || "").trim();
  if (!userName) return topic;

  try {
    await sendTelegramMessage(
      tokenValue,
      { type: "personal", chatId: topic.chatId, topicId: topic.topicId },
      `${userName} 开启了和你的私聊`,
      [{ type: "code", offset: 0, length: userName.length }]
    );
    const updated = { ...topic, usernameCopyNoticePending: false };
    const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.managedTopics]: [] });
    const topics = Array.isArray(stored[TELEGRAM_KEYS.managedTopics]) ? stored[TELEGRAM_KEYS.managedTopics] : [];
    await chrome.storage.local.set({
      [TELEGRAM_KEYS.managedTopics]: topics.map((item) => item.id === topic.id ? updated : item)
    });
    return updated;
  } catch (_error) {
    // Retry the copy notice on the next message if Telegram is temporarily unavailable.
    return topic;
  }
}

async function normalizeManagedSystemTopic(chatIdValue, systemUserIdValue, tokenValue = "") {
  const chatId = String(chatIdValue || "").trim();
  const systemUserId = String(systemUserIdValue || "").trim();
  const token = String(tokenValue || "").trim();
  if (!chatId) return null;
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.managedTopics]: [] });
  const topics = Array.isArray(stored[TELEGRAM_KEYS.managedTopics]) ? stored[TELEGRAM_KEYS.managedTopics] : [];
  const systemTopics = topics.filter((topic) => topic.kind === "system" && String(topic.chatId) === chatId);
  const legacySystemTopics = systemUserId
    ? topics.filter((topic) => topic.kind === "dm"
      && String(topic.chatId) === chatId
      && String(topic.nsUserId) === systemUserId)
    : [];
  const candidates = [...systemTopics, ...legacySystemTopics];
  const reusedTopic = candidates[0];
  if (!reusedTopic) return null;

  const styledTopic = token
    ? await applyManagedTelegramTopicStyle(token, { ...reusedTopic, kind: "system" }, "系统")
    : reusedTopic;
  let canonicalName = String(styledTopic.name || "");
  if (!canonicalName) canonicalName = "系统";
  const canonicalTopic = { ...styledTopic, kind: "system", nsUserId: "", name: canonicalName };
  const needsWrite = candidates.length !== 1
    || reusedTopic.kind !== "system"
    || String(reusedTopic.nsUserId || "") !== ""
    || reusedTopic.name !== canonicalName
    || reusedTopic.iconCustomEmojiId !== canonicalTopic.iconCustomEmojiId;
  if (needsWrite) {
    const firstCandidateIndex = topics.findIndex((topic) => candidates.includes(topic));
    const normalizedTopics = topics.filter((topic) => !candidates.includes(topic));
    normalizedTopics.splice(Math.min(firstCandidateIndex, normalizedTopics.length), 0, canonicalTopic);
    await chrome.storage.local.set({ [TELEGRAM_KEYS.managedTopics]: normalizedTopics });
  }
  return canonicalTopic;
}

async function getOrCreateManagedTelegramTopic(tokenValue, chatIdValue, kind, { userId = "", userName = "" } = {}) {
  const token = String(tokenValue || "").trim();
  const chatId = String(chatIdValue || "").trim();
  const nsUserId = kind === "dm" ? String(userId || "").trim() : "";
  const dmTopicName = String(userName || "").trim().replace(/\s+/g, " ") || "NodeSeek 用户";
  const baseStyle = TELEGRAM_TOPIC_STYLES[kind];
  const topicName = baseStyle?.name || dmTopicName;
  if (!token || !chatId || !topicName || !baseStyle || (kind === "dm" && !nsUserId)) {
    throw new Error("创建 Telegram 对话缺少必要信息");
  }

  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.managedTopics]: [] });
  const topics = Array.isArray(stored[TELEGRAM_KEYS.managedTopics]) ? stored[TELEGRAM_KEYS.managedTopics] : [];
  if (kind === "system") {
    const storedSystemUser = await chrome.storage.local.get({ [TELEGRAM_KEYS.systemNotificationUserId]: "" });
    const existingSystemTopic = await normalizeManagedSystemTopic(
      chatId,
      storedSystemUser[TELEGRAM_KEYS.systemNotificationUserId],
      token
    );
    if (existingSystemTopic) return existingSystemTopic;
  }
  const existing = topics.find((topic) => topic.kind === kind
    && String(topic.chatId) === chatId
    && (kind !== "dm" || String(topic.nsUserId) === nsUserId));
  if (existing) {
    const styledTopic = await applyManagedTelegramTopicStyle(token, existing, topicName);
    return sendPendingTelegramUsernameCopyNotice(token, styledTopic);
  }

  const style = getManagedTelegramTopicStyle({ kind });
  const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/createForumTopic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      name: topicName.slice(0, 128),
      icon_color: style.iconColor,
      ...(style.iconCustomEmojiId ? { icon_custom_emoji_id: style.iconCustomEmojiId } : {})
    })
  });
  const result = await response.json();
  const topicId = String(result?.result?.message_thread_id || "");
  if (!response.ok || !result?.ok || !topicId) {
    throw new Error(result?.description || `创建 Telegram Topic 失败（HTTP ${response.status}）`);
  }

  const topic = {
    id: crypto.randomUUID(),
    kind,
    chatId,
    topicId,
    name: topicName.slice(0, 128),
    iconCustomEmojiId: style.iconCustomEmojiId,
    iconColor: style.iconColor,
    ...(kind === "dm" ? { dmAnimalIconVersion: 1 } : {}),
    nsUserId,
    ...(kind === "dm" && String(userName || "").trim() ? { usernameCopyNoticePending: true } : {}),
    createdAt: Date.now()
  };
  await chrome.storage.local.set({ [TELEGRAM_KEYS.managedTopics]: [...topics, topic] });
  return sendPendingTelegramUsernameCopyNotice(token, topic);
}

async function getTelegramUpdatesAndProcess(
  tokenValue,
  requestedOffsetValue = null,
  timeoutSeconds = 0,
  signal = undefined,
  settingsContext = {}
) {
  if (telegramUpdatesCheckInFlight) throw new Error("Telegram 更新正在读取，请稍后重试");
  const token = String(tokenValue || "").trim();
  if (!token) throw new Error("请先填写 Bot Token");
  telegramUpdatesCheckInFlight = true;
  try {
    const state = await chrome.storage.local.get({
      [TELEGRAM_KEYS.token]: token,
      [TELEGRAM_PERSONAL_START_OFFSET_KEY]: 0,
      [TELEGRAM_KEYS.targets]: [],
      [TELEGRAM_KEYS.messagesEnabled]: true,
      [TELEGRAM_KEYS.postsEnabled]: true,
      [TELEGRAM_KEYS.mentionEnabled]: false,
      [TELEGRAM_KEYS.replyEnabled]: false,
      [TELEGRAM_KEYS.managedTopics]: [],
      [TELEGRAM_KEYS.paused]: false,
      telegramMentionReplyNotificationsEnabled: false
    });
    const storedOffset = Number(state[TELEGRAM_PERSONAL_START_OFFSET_KEY]) || 0;
    const requestedOffset = Number.isSafeInteger(Number(requestedOffsetValue)) ? Number(requestedOffsetValue) : 0;
    const offset = Math.max(storedOffset, requestedOffset);
    const offsetParam = offset > 0 ? `&offset=${offset}` : "";
    const allowedUpdates = encodeURIComponent(JSON.stringify(["message", "channel_post", "callback_query"]));
    const response = await fetchWithTimeout(
      `https://api.telegram.org/bot${token}/getUpdates?limit=100&timeout=${Math.max(0, Math.floor(Number(timeoutSeconds) || 0))}&allowed_updates=${allowedUpdates}${offsetParam}`,
      signal ? { signal } : {},
      Number(timeoutSeconds) > 0
        ? (Math.floor(Number(timeoutSeconds)) + 5) * 1000
        : TELEGRAM_REQUEST_TIMEOUT_MS
    );
    const result = await response.json();
    if (!response.ok || !result?.ok) {
      if (response.status === 409) {
        const error = new Error(await getTelegramUpdateConflictMessage(token));
        error.code = "TELEGRAM_UPDATES_CONFLICT";
        throw error;
      }
      const error = new Error(result?.description || `Telegram 返回 HTTP ${response.status}`);
      error.retryAfterSeconds = Number(result?.parameters?.retry_after) || 0;
      throw error;
    }
    const updates = Array.isArray(result.result) ? result.result : [];
    await cacheTelegramDirectTopicUpdates(updates);
    const lastUpdateId = updates.reduce((last, update) => Math.max(last, Number(update.update_id) || 0), 0);
    const nextOffset = lastUpdateId > 0 ? lastUpdateId + 1 : null;
    resolveTelegramUpdateBatchWaiters({ updates, nextOffset });
    await processTelegramDeletedTopicUpdates(updates);
    if (isTelegramMonitorReady(state)) await processTelegramManagedTopicUpdates(token, updates);
    await processTelegramPersonalStartUpdateIfWatching(token, updates, settingsContext.settingsSessionStartedAt || 0);
    await processTelegramSettingsUpdates(token, updates, {
      ...settingsContext,
      allowSettingsCallbacks: settingsContext.allowSettingsCallbacks === true || telegramSettingsCallbacksReady
    });
    if (lastUpdateId > 0) {
      await chrome.storage.local.set({ [TELEGRAM_PERSONAL_START_OFFSET_KEY]: Math.max(offset, lastUpdateId + 1) });
    }
    return { updates, nextOffset };
  } finally {
    telegramUpdatesCheckInFlight = false;
  }
}

function waitForTelegramUpdateBatch(timeoutMs = 22_000) {
  let waiter;
  const promise = new Promise((resolve) => {
    waiter = { resolve, timeoutId: 0 };
    waiter.timeoutId = setTimeout(() => {
      telegramUpdateBatchWaiters.delete(waiter);
      resolve(null);
    }, timeoutMs);
    telegramUpdateBatchWaiters.add(waiter);
  });
  return {
    promise,
    cancel() {
      if (!waiter || !telegramUpdateBatchWaiters.delete(waiter)) return;
      clearTimeout(waiter.timeoutId);
      waiter.resolve(null);
    }
  };
}

function resolveTelegramUpdateBatchWaiters(batch) {
  for (const waiter of telegramUpdateBatchWaiters) {
    clearTimeout(waiter.timeoutId);
    waiter.resolve(batch);
  }
  telegramUpdateBatchWaiters.clear();
}

async function processTelegramPersonalStartUpdateIfWatching(token, updates, sessionStartedAt = 0) {
  const watch = await chrome.storage.local.get({
    [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0,
    [TELEGRAM_PERSONAL_START_WATCH_SINCE_KEY]: 0,
    [TELEGRAM_KEYS.pendingStartUpdates]: []
  });
  const pending = Array.isArray(watch[TELEGRAM_KEYS.pendingStartUpdates])
    ? [...watch[TELEGRAM_KEYS.pendingStartUpdates]] : [];
  const minimumStartDate = Math.max(
    Number(watch[TELEGRAM_PERSONAL_START_WATCH_SINCE_KEY]) || 0,
    Number(sessionStartedAt) || 0
  );
  if (Number(watch[TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]) > Date.now()) {
    const update = findTelegramPersonalStartUpdate(updates, minimumStartDate);
    const updateId = Number(update?.update_id) || 0;
    if (update && updateId > 0 && !pending.some((item) => Number(item?.updateId) === updateId)) {
      pending.push({ updateId, update, attempts: 0, nextRetryAt: 0 });
      await chrome.storage.local.set({ [TELEGRAM_KEYS.pendingStartUpdates]: pending });
    }
  }

  for (const item of [...pending].sort((a, b) => Number(a.updateId) - Number(b.updateId))) {
    const messageDate = Number(item.update?.message?.date) || 0;
    if (minimumStartDate && messageDate && messageDate < minimumStartDate) {
      const remaining = pending.filter((candidate) => Number(candidate?.updateId) !== Number(item.updateId));
      pending.splice(0, pending.length, ...remaining);
      await chrome.storage.local.set({ [TELEGRAM_KEYS.pendingStartUpdates]: pending });
      continue;
    }
    if (Number(item.nextRetryAt) > Date.now()) continue;
    try {
      await registerTelegramPersonalStartUpdate(token, item.update);
      const remaining = pending.filter((candidate) => Number(candidate?.updateId) !== Number(item.updateId));
      pending.splice(0, pending.length, ...remaining);
      await chrome.storage.local.set({ [TELEGRAM_KEYS.pendingStartUpdates]: pending });
    } catch (error) {
      item.attempts = (Number(item.attempts) || 0) + 1;
      item.nextRetryAt = Date.now() + getTelegramUpdatesRetryDelayMs(item.attempts, error?.retryAfterSeconds);
      item.lastError = String(error?.message || error || "接收目标添加失败").slice(0, 300);
      await chrome.storage.local.set({
        [TELEGRAM_KEYS.pendingStartUpdates]: pending,
        [TELEGRAM_KEYS.lastError]: `Telegram /start 待重试：${item.lastError}`
      });
    }
  }
}

async function processTelegramSettingsUpdates(token, updates, settingsContext = {}) {
  const state = await chrome.storage.local.get({
    [TELEGRAM_KEYS.targets]: [],
    [TELEGRAM_KEYS.managedTopics]: [],
    [TELEGRAM_KEYS.settingsTopics]: [],
    [TELEGRAM_PERSONAL_START_REPLIED_UPDATE_ID_KEY]: 0,
    telegramSilentPushEnabled: false
  });
  let lastStartUpdateId = Number(state[TELEGRAM_PERSONAL_START_REPLIED_UPDATE_ID_KEY]) || 0;
  const targets = Array.isArray(state[TELEGRAM_KEYS.targets]) ? state[TELEGRAM_KEYS.targets] : [];
  const orderedUpdates = [...updates].sort((a, b) => Number(a.update_id) - Number(b.update_id));
  const sessionStartedAt = Number(settingsContext.settingsSessionStartedAt) || 0;

  for (const update of orderedUpdates) {
    const message = update?.message;
    const updateId = Number(update?.update_id) || 0;
    if (!message || updateId <= lastStartUpdateId || message.chat?.type !== "private") continue;
    const messageText = String(message.text || "").trim();
    const isStartCommand = /^\/start(?:@\w+)?(?:\s+[^\s]+)?$/i.test(messageText);
    const normalizedButtonText = messageText.replace(/[\uFE0E\uFE0F\u200D]/g, "").replace(/\s+/g, "");
    const isSettingsButton = normalizedButtonText === "打开设置" || normalizedButtonText === "⚙打开设置";
    const isHideKeyboardButton = normalizedButtonText === "收起键盘";
    if (!isStartCommand && !isSettingsButton && !isHideKeyboardButton) continue;
    const messageDate = Number(message.date) || 0;
    if (sessionStartedAt && (!messageDate || messageDate < sessionStartedAt)) continue;
    const chatId = String(message.chat.id || "");
    const isConfiguredTarget = targets.some((target) => target?.type !== "direct"
      && String(target?.chatId || "") === chatId);
    if (!isConfiguredTarget) continue;

    try {
      if (isHideKeyboardButton) {
        const configuredSettingsTopic = (Array.isArray(state[TELEGRAM_KEYS.settingsTopics])
          ? state[TELEGRAM_KEYS.settingsTopics] : [])
          .find((topic) => String(topic.chatId) === chatId);
        await removeTelegramSettingsReplyKeyboard(token, chatId, configuredSettingsTopic, message.message_thread_id);
      } else if (isStartCommand) {
        await ensureTelegramSettingsEntry(token, chatId);
      } else {
        await showTelegramSettingsHome(token, chatId);
      }
      lastStartUpdateId = updateId;
      await chrome.storage.local.set({ [TELEGRAM_PERSONAL_START_REPLIED_UPDATE_ID_KEY]: updateId });
    } catch (error) {
      await chrome.storage.local.set({
        [TELEGRAM_KEYS.lastError]: `Telegram 设置菜单发送失败：${String(error?.message || error).slice(0, 260)}`
      });
    }
  }

  if (settingsContext.allowSettingsCallbacks !== true) return;
  for (const update of orderedUpdates) {
    if (!update?.callback_query) continue;
    try {
      await processTelegramSettingsCallback(token, update.callback_query);
    } catch (error) {
      await answerTelegramCallbackQuery(token, update.callback_query.id, String(error?.message || "设置操作失败").slice(0, 180), true);
    }
  }
}

async function processTelegramDeletedTopicUpdates(updates) {
  const deleted = updates.map((update) => {
    const message = update?.message;
    if (!message?.forum_topic_deleted) return null;
    const chatId = String(message.chat?.id || "");
    const topicId = String(message.message_thread_id || "");
    return chatId && topicId ? `${chatId}:${topicId}` : null;
  }).filter(Boolean);
  if (deleted.length === 0) return;

  const deletedKeys = new Set(deleted);
  const stored = await chrome.storage.local.get({
    [TELEGRAM_KEYS.managedTopics]: [],
    [TELEGRAM_KEYS.settingsTopics]: []
  });
  const managedTopics = Array.isArray(stored[TELEGRAM_KEYS.managedTopics]) ? stored[TELEGRAM_KEYS.managedTopics] : [];
  const settingsTopics = Array.isArray(stored[TELEGRAM_KEYS.settingsTopics]) ? stored[TELEGRAM_KEYS.settingsTopics] : [];
  const retainedManaged = managedTopics.filter((topic) => !deletedKeys.has(`${String(topic.chatId)}:${String(topic.topicId)}`));
  const retainedSettings = settingsTopics.filter((topic) => !deletedKeys.has(`${String(topic.chatId)}:${String(topic.topicId)}`));
  if (retainedManaged.length !== managedTopics.length || retainedSettings.length !== settingsTopics.length) {
    await chrome.storage.local.set({
      [TELEGRAM_KEYS.managedTopics]: retainedManaged,
      [TELEGRAM_KEYS.settingsTopics]: retainedSettings
    });
  }
}

async function getOrCreateTelegramSettingsTopic(tokenValue, chatIdValue) {
  const token = String(tokenValue || "").trim();
  const chatId = String(chatIdValue || "").trim();
  if (!token || !chatId) throw new Error("无法识别 Telegram 私聊目标");
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.settingsTopics]: [] });
  const settingsTopics = Array.isArray(stored[TELEGRAM_KEYS.settingsTopics]) ? stored[TELEGRAM_KEYS.settingsTopics] : [];
  const existing = settingsTopics.find((topic) => String(topic.chatId) === chatId);
  const style = TELEGRAM_TOPIC_STYLES.settings;
  const iconCustomEmojiId = await getTelegramSettingsTopicIconCustomEmojiId();
  if (existing) {
    const nameChanged = String(existing.name || "") !== style.name;
    const iconChanged = String(existing.iconCustomEmojiId || "") !== iconCustomEmojiId;
    if (nameChanged || iconChanged) {
      try {
        await callTelegramSettingsApi(token, "editForumTopic", {
          chat_id: chatId,
          message_thread_id: Number(existing.topicId),
          ...(nameChanged ? { name: style.name } : {}),
          ...(iconChanged ? { icon_custom_emoji_id: iconCustomEmojiId } : {})
        });
        const updated = { ...existing, name: style.name, iconCustomEmojiId };
        await chrome.storage.local.set({
          [TELEGRAM_KEYS.settingsTopics]: settingsTopics.map((topic) => topic.id === existing.id ? updated : topic)
        });
        return updated;
      } catch (error) {
        await chrome.storage.local.set({
          [TELEGRAM_KEYS.lastError]: `设置主题名称或图标更新失败：${String(error?.message || error).slice(0, 220)}`
        });
        // Keep using the existing settings topic if Telegram rejects the update.
      }
    }
    return existing;
  }

  const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/createForumTopic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      name: style.name,
      icon_color: style.iconColor,
      ...(iconCustomEmojiId ? { icon_custom_emoji_id: iconCustomEmojiId } : {})
    })
  });
  const result = await response.json();
  const topicId = String(result?.result?.message_thread_id || "");
  if (!response.ok || result?.ok !== true || !topicId) {
    throw new Error(result?.description || `创建 Telegram ${style.name} 主题失败（HTTP ${response.status}）`);
  }

  const topic = {
    id: crypto.randomUUID(),
    kind: "settings",
    chatId,
    topicId,
    name: style.name,
    iconCustomEmojiId,
    iconColor: style.iconColor,
    menuMessageId: 0,
    createdAt: Date.now()
  };
  await chrome.storage.local.set({ [TELEGRAM_KEYS.settingsTopics]: [...settingsTopics, topic] });
  return topic;
}

async function getTelegramSettingsTopicIconCustomEmojiId() {
  const iconId = String(TELEGRAM_TOPIC_STYLES.settings.iconCustomEmojiId || "");
  const stored = await chrome.storage.local.get({
    [TELEGRAM_KEYS.settingsTopicIconId]: "",
    [TELEGRAM_KEYS.settingsTopicIconVersion]: 0
  });
  if (String(stored[TELEGRAM_KEYS.settingsTopicIconId] || "") !== iconId
    || Number(stored[TELEGRAM_KEYS.settingsTopicIconVersion]) < 4) {
    await chrome.storage.local.set({
      [TELEGRAM_KEYS.settingsTopicIconId]: iconId,
      [TELEGRAM_KEYS.settingsTopicIconVersion]: 4
    });
  }
  return iconId;
}

function buildTelegramSettingsHomeScreen(silentEnabled) {
  return {
    text: "NodeSeek 设置",
    replyMarkup: {
      inline_keyboard: [[
        { text: silentEnabled ? "✅ 静音设置" : "静音设置", callback_data: `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}mute` },
        { text: "对话管理", callback_data: `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}dialogs:0` }
      ]]
    }
  };
}

function getTelegramManagedTopicListIcon(topic) {
  if (topic?.kind === "dm") {
    return TELEGRAM_DM_TOPIC_ICONS.find((icon) => icon.customEmojiId === String(topic.iconCustomEmojiId || ""))?.emoji || "💬";
  }
  return ({ system: "🟡", rss: "📡", mention: "@", reply: "💬", settings: "💻" })[topic?.kind] || "💬";
}

function getTelegramSettingsDialogTopics(chatIdValue, managedTopicsValue, settingsTopicsValue) {
  const chatId = String(chatIdValue || "");
  const topics = [
    ...(Array.isArray(managedTopicsValue) ? managedTopicsValue : []),
    ...(Array.isArray(settingsTopicsValue) ? settingsTopicsValue : [])
  ];
  const uniqueTopics = new Map();
  for (const topic of topics) {
    if (String(topic?.chatId || "") !== chatId || !topic?.id || !topic?.topicId) continue;
    uniqueTopics.set(`${chatId}:${String(topic.topicId)}`, topic);
  }
  return [...uniqueTopics.values()]
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh-Hans"));
}

function buildTelegramSettingsDialogsScreen(topics, pageValue = 0, selectedIdsValue = [], notice = "") {
  const pageSize = TELEGRAM_SETTINGS_DIALOGS_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(topics.length / pageSize));
  const page = Math.min(Math.max(0, Number(pageValue) || 0), pageCount - 1);
  const pageTopics = topics.slice(page * pageSize, (page + 1) * pageSize);
  const selectedIds = new Set((Array.isArray(selectedIdsValue) ? selectedIdsValue : []).map(String));
  const rows = pageTopics.map((topic) => [{
    text: `${selectedIds.has(String(topic.id)) ? "✅" : "⬜️"} ${getTelegramManagedTopicListIcon(topic)} ${String(topic.name || "未命名对话").slice(0, 42)}`,
    callback_data: `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}toggle:${topic.id}:${page}`
  }]);
  if (topics.length) {
    rows.push([
      { text: `删除已选（${selectedIds.size}）`, callback_data: `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}delete-selected:${page}` },
      { text: "全选", callback_data: `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}select-all:${page}` }
    ]);
    rows.push([
      { text: "清空选择", callback_data: `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}clear-selection:${page}` },
      { text: "返回", callback_data: `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}home` }
    ]);
  } else {
    rows.push([{ text: "返回", callback_data: `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}home` }]);
  }
  const navigation = [];
  if (page > 0) navigation.push({ text: "上一页", callback_data: `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}dialogs:${page - 1}` });
  if (pageCount > 1) navigation.push({ text: `${page + 1}/${pageCount}`, callback_data: `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}dialogs:${page}` });
  if (page + 1 < pageCount) navigation.push({ text: "下一页", callback_data: `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}dialogs:${page + 1}` });
  if (navigation.length) rows.push(navigation);
  const selectedCount = selectedIds.size;
  return {
    text: `${notice ? `${notice}\n` : ""}${topics.length
      ? `对话管理（${topics.length}）\n勾选要删除的对话，可多选；删除前会再次确认。${selectedCount ? `\n已选 ${selectedCount} 个。` : ""}`
      : "对话管理\n当前没有可管理的对话。"}`,
    replyMarkup: { inline_keyboard: rows }
  };
}

function buildTelegramSettingsDeleteConfirmScreen(selectedTopics, page) {
  const preview = selectedTopics.slice(0, 5)
    .map((topic) => `${getTelegramManagedTopicListIcon(topic)} ${String(topic.name || "未命名对话").slice(0, 48)}`)
    .join("\n");
  const remaining = selectedTopics.length > 5 ? `\n另有 ${selectedTopics.length - 5} 个对话` : "";
  return {
    text: `确认删除选中的 ${selectedTopics.length} 个对话及其中的消息？\n${preview}${remaining}`,
    replyMarkup: {
      inline_keyboard: [[
        { text: `确认删除（${selectedTopics.length}）`, callback_data: `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}confirm-delete:${page}` },
        { text: "取消", callback_data: `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}dialogs:${page}` }
      ]]
    }
  };
}

async function updateTelegramSettingsDialogSelection(chatIdValue, topicIdValue, selectedIds) {
  const chatId = String(chatIdValue || "");
  const topicId = String(topicIdValue || "");
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.settingsTopics]: [] });
  const settingsTopics = Array.isArray(stored[TELEGRAM_KEYS.settingsTopics]) ? stored[TELEGRAM_KEYS.settingsTopics] : [];
  await chrome.storage.local.set({
    [TELEGRAM_KEYS.settingsTopics]: settingsTopics.map((topic) => String(topic.chatId) === chatId
      && String(topic.topicId) === topicId
      ? { ...topic, selectedDialogIds: [...new Set((Array.isArray(selectedIds) ? selectedIds : []).map(String))] }
      : topic)
  });
}

async function editTelegramSettingsMessage(tokenValue, topic, messageIdValue, screen) {
  const token = String(tokenValue || "").trim();
  const chatId = String(topic?.chatId || "");
  const topicId = String(topic?.topicId || "");
  const messageId = Number(messageIdValue) || 0;
  if (!token || !chatId || !topicId) throw new Error("设置主题信息不完整");

  if (messageId > 0) {
    try {
      await callTelegramSettingsApi(token, "editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: screen.text,
        reply_markup: screen.replyMarkup
      });
      await updateTelegramSettingsMenuMessageId(chatId, topicId, messageId);
      return messageId;
    } catch (error) {
      if (/message is not modified/i.test(String(error?.message || ""))) return messageId;
    }
  }

  const result = await callTelegramSettingsApi(token, "sendMessage", {
    chat_id: chatId,
    message_thread_id: Number(topicId),
    text: screen.text,
    disable_notification: await shouldSendTelegramSilently(),
    reply_markup: screen.replyMarkup
  });
  const newMessageId = Number(result?.message_id) || 0;
  if (!newMessageId) throw new Error("Telegram 没有返回设置消息编号");
  await updateTelegramSettingsMenuMessageId(chatId, topicId, newMessageId);
  return newMessageId;
}

async function updateTelegramSettingsMenuMessageId(chatId, topicId, messageId) {
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.settingsTopics]: [] });
  const settingsTopics = Array.isArray(stored[TELEGRAM_KEYS.settingsTopics]) ? stored[TELEGRAM_KEYS.settingsTopics] : [];
  const nextTopics = settingsTopics.map((topic) => String(topic.chatId) === String(chatId)
    && String(topic.topicId) === String(topicId) ? { ...topic, menuMessageId: Number(messageId) } : topic);
  await chrome.storage.local.set({ [TELEGRAM_KEYS.settingsTopics]: nextTopics });
}

async function showTelegramSettingsHome(token, chatId) {
  const topic = await ensureTelegramSettingsEntry(token, chatId);
  const settings = await chrome.storage.local.get({ telegramSilentPushEnabled: false });
  if (Number(topic.menuMessageId) > 0) {
    try {
      await callTelegramSettingsApi(token, "editMessageReplyMarkup", {
        chat_id: chatId,
        message_id: Number(topic.menuMessageId),
        reply_markup: { inline_keyboard: [] }
      });
    } catch (_error) {
      // The prior menu may have been deleted; a new menu is still sent below.
    }
  }
  return editTelegramSettingsMessage(
    token,
    topic,
    0,
    buildTelegramSettingsHomeScreen(settings.telegramSilentPushEnabled === true)
  );
}

async function ensureTelegramSettingsEntry(tokenValue, chatIdValue) {
  const token = String(tokenValue || "").trim();
  const chatId = String(chatIdValue || "").trim();
  let topic = await getOrCreateTelegramSettingsTopic(token, chatId);
  topic = await ensureTelegramSettingsCommandMenu(token, chatId, topic);
  return ensureTelegramSettingsReplyKeyboard(token, chatId, topic);
}

async function ensureTelegramSettingsCommandMenu(tokenValue, chatIdValue, topic) {
  const token = String(tokenValue || "").trim();
  const chatId = String(chatIdValue || "").trim();
  if (!token || !chatId || !topic?.topicId) return topic;
  if (Number(topic.commandMenuVersion) >= 1) return topic;

  try {
    const scope = { type: "chat", chat_id: Number(chatId) };
    let commands = await callTelegramSettingsApi(token, "getMyCommands", {
      scope,
      language_code: "zh"
    });
    if (!Array.isArray(commands) || commands.length === 0) {
      commands = await callTelegramSettingsApi(token, "getMyCommands", { language_code: "zh" });
    }
    const preservedCommands = Array.isArray(commands) ? [...commands] : [];
    const startCommand = preservedCommands.find((command) => String(command?.command || "") === "start");
    const nextCommands = preservedCommands.filter((command) => String(command?.command || "") !== "start");
    nextCommands.push({
      command: "start",
      description: "打开 NodeSeek 设置"
    });
    await callTelegramSettingsApi(token, "setMyCommands", {
      commands: nextCommands.slice(0, 100),
      scope,
      language_code: "zh"
    });
    const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.settingsTopics]: [] });
    const settingsTopics = Array.isArray(stored[TELEGRAM_KEYS.settingsTopics]) ? stored[TELEGRAM_KEYS.settingsTopics] : [];
    const updated = { ...topic, commandMenuVersion: 1 };
    await chrome.storage.local.set({
      [TELEGRAM_KEYS.settingsTopics]: settingsTopics.map((item) => item.id === topic.id ? updated : item)
    });
    return updated;
  } catch (error) {
    await chrome.storage.local.set({
      [TELEGRAM_KEYS.lastError]: `Telegram 设置命令菜单更新失败：${String(error?.message || error).slice(0, 240)}`
    });
    return topic;
  }
}

async function ensureTelegramSettingsReplyKeyboard(tokenValue, chatIdValue, topic) {
  const token = String(tokenValue || "").trim();
  const chatId = String(chatIdValue || "").trim();
  if (!token || !chatId || !topic?.topicId) return topic;
  if (Number(topic.replyKeyboardMessageId) > 0 && Number(topic.replyKeyboardVersion) >= 4) return topic;

  const payload = {
    chat_id: chatId,
    message_thread_id: Number(topic.topicId),
    text: "点击下方“打开设置”查看静音和对话管理。",
    disable_notification: await shouldSendTelegramSilently(),
    reply_markup: {
      keyboard: [[{ text: "打开设置" }]],
      resize_keyboard: true,
      one_time_keyboard: false,
      is_persistent: false
    }
  };
  let result;
  try {
    result = await callTelegramSettingsApi(token, "sendMessage", payload);
  } catch (topicError) {
    try {
      const { message_thread_id: _ignoredThreadId, ...rootPayload } = payload;
      result = await callTelegramSettingsApi(token, "sendMessage", rootPayload);
    } catch (rootError) {
      await chrome.storage.local.set({
        [TELEGRAM_KEYS.lastError]: `Telegram 设置按钮发送失败：${String(rootError?.message || topicError?.message || rootError).slice(0, 240)}`
      });
      return topic;
    }
  }

  const messageId = Number(result?.message_id) || 0;
  if (!messageId) return topic;
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.settingsTopics]: [] });
  const settingsTopics = Array.isArray(stored[TELEGRAM_KEYS.settingsTopics]) ? stored[TELEGRAM_KEYS.settingsTopics] : [];
  const updated = { ...topic, replyKeyboardMessageId: messageId, replyKeyboardVersion: 4 };
  await chrome.storage.local.set({
    [TELEGRAM_KEYS.settingsTopics]: settingsTopics.map((item) => item.id === topic.id ? updated : item)
  });
  return updated;
}

async function removeTelegramSettingsReplyKeyboard(tokenValue, chatIdValue, topic, messageThreadIdValue = 0) {
  const token = String(tokenValue || "").trim();
  const chatId = String(chatIdValue || "").trim();
  if (!token || !chatId) return;
  const threadId = String(messageThreadIdValue || topic?.topicId || "").trim();
  const payload = {
    chat_id: chatId,
    text: "设置入口已移到聊天菜单。",
    disable_notification: await shouldSendTelegramSilently(),
    reply_markup: { remove_keyboard: true }
  };
  if (/^\d+$/.test(threadId)) payload.message_thread_id = Number(threadId);
  try {
    await callTelegramSettingsApi(token, "sendMessage", payload);
  } catch (_error) {
    delete payload.message_thread_id;
    await callTelegramSettingsApi(token, "sendMessage", payload);
  }

  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.settingsTopics]: [] });
  const settingsTopics = Array.isArray(stored[TELEGRAM_KEYS.settingsTopics]) ? stored[TELEGRAM_KEYS.settingsTopics] : [];
  await chrome.storage.local.set({
    [TELEGRAM_KEYS.settingsTopics]: settingsTopics.map((item) => String(item.chatId) === chatId
      ? { ...item, replyKeyboardMessageId: 0, replyKeyboardVersion: 0 }
      : item)
  });
}

async function callTelegramSettingsApi(tokenValue, method, payload) {
  const token = String(tokenValue || "").trim();
  const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok || result?.ok !== true) {
    throw new Error(result?.description || `Telegram ${method} 失败（HTTP ${response.status}）`);
  }
  return result.result;
}

async function answerTelegramCallbackQuery(token, callbackQueryId, text = "", showAlert = false) {
  if (!callbackQueryId) return;
  try {
    await callTelegramSettingsApi(token, "answerCallbackQuery", {
      callback_query_id: String(callbackQueryId),
      ...(text ? { text: String(text).slice(0, 180) } : {}),
      ...(showAlert ? { show_alert: true } : {})
    });
  } catch (_error) {
    // A stale callback must not block newer Telegram updates.
  }
}

async function processTelegramSettingsCallback(token, callback) {
  const message = callback?.message;
  const chatId = String(message?.chat?.id || "");
  const topicId = String(message?.message_thread_id || "");
  const callbackUserId = String(callback?.from?.id || "");
  const data = String(callback?.data || "");
  if (!message || !chatId || !topicId || callbackUserId !== chatId || !data.startsWith(TELEGRAM_SETTINGS_CALLBACK_PREFIX)) {
    await answerTelegramCallbackQuery(token, callback?.id, "无效的设置操作", true);
    return;
  }

  const stored = await chrome.storage.local.get({
    [TELEGRAM_KEYS.settingsTopics]: [],
    [TELEGRAM_KEYS.managedTopics]: [],
    telegramSilentPushEnabled: false
  });
  const settingsTopics = Array.isArray(stored[TELEGRAM_KEYS.settingsTopics]) ? stored[TELEGRAM_KEYS.settingsTopics] : [];
  const settingsTopic = settingsTopics.find((topic) => String(topic.chatId) === chatId && String(topic.topicId) === topicId);
  if (!settingsTopic) {
    await answerTelegramCallbackQuery(token, callback.id, "设置主题已失效，请重新发送 /start", true);
    return;
  }

  const messageId = Number(message.message_id) || 0;
  if (data === `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}mute`) {
    const enabled = stored.telegramSilentPushEnabled !== true;
    await chrome.storage.local.set({ telegramSilentPushEnabled: enabled });
    await editTelegramSettingsMessage(token, settingsTopic, messageId, buildTelegramSettingsHomeScreen(enabled));
    await answerTelegramCallbackQuery(token, callback.id, enabled ? "已开启静音通知" : "已关闭静音通知");
    return;
  }

  if (data === `${TELEGRAM_SETTINGS_CALLBACK_PREFIX}home`) {
    await editTelegramSettingsMessage(token, settingsTopic, messageId, buildTelegramSettingsHomeScreen(stored.telegramSilentPushEnabled === true));
    await answerTelegramCallbackQuery(token, callback.id);
    return;
  }

  const dialogsMatch = data.match(/^nsh:dialogs:(\d+)$/);
  if (dialogsMatch) {
    const topics = getTelegramSettingsDialogTopics(
      chatId,
      stored[TELEGRAM_KEYS.managedTopics],
      stored[TELEGRAM_KEYS.settingsTopics]
    );
    const availableIds = new Set(topics.map((topic) => String(topic.id)));
    const selectedIds = (Array.isArray(settingsTopic.selectedDialogIds) ? settingsTopic.selectedDialogIds : [])
      .map(String).filter((id) => availableIds.has(id));
    await editTelegramSettingsMessage(token, settingsTopic, messageId,
      buildTelegramSettingsDialogsScreen(topics, dialogsMatch[1], selectedIds));
    await answerTelegramCallbackQuery(token, callback.id);
    return;
  }

  const dialogTopics = getTelegramSettingsDialogTopics(
    chatId,
    stored[TELEGRAM_KEYS.managedTopics],
    stored[TELEGRAM_KEYS.settingsTopics]
  );
  const availableDialogIds = new Set(dialogTopics.map((topic) => String(topic.id)));
  let selectedDialogIds = (Array.isArray(settingsTopic.selectedDialogIds) ? settingsTopic.selectedDialogIds : [])
    .map(String).filter((id) => availableDialogIds.has(id));

  const toggleMatch = data.match(/^nsh:toggle:([\w-]+):(\d+)$/)
    || data.match(/^nsh:delete:([\w-]+)$/);
  if (toggleMatch) {
    const topic = dialogTopics.find((item) => String(item.id) === toggleMatch[1]);
    if (!topic) {
      await answerTelegramCallbackQuery(token, callback.id, "找不到这个对话", true);
      return;
    }
    const selected = new Set(selectedDialogIds);
    if (selected.has(String(topic.id))) selected.delete(String(topic.id));
    else selected.add(String(topic.id));
    selectedDialogIds = [...selected];
    const page = Number(toggleMatch[2]) || 0;
    await updateTelegramSettingsDialogSelection(chatId, topicId, selectedDialogIds);
    await editTelegramSettingsMessage(token, settingsTopic, messageId,
      buildTelegramSettingsDialogsScreen(dialogTopics, page, selectedDialogIds));
    await answerTelegramCallbackQuery(token, callback.id);
    return;
  }

  const selectAllMatch = data.match(/^nsh:select-all:(\d+)$/);
  if (selectAllMatch) {
    selectedDialogIds = dialogTopics.map((topic) => String(topic.id));
    await updateTelegramSettingsDialogSelection(chatId, topicId, selectedDialogIds);
    await editTelegramSettingsMessage(token, settingsTopic, messageId,
      buildTelegramSettingsDialogsScreen(dialogTopics, selectAllMatch[1], selectedDialogIds));
    await answerTelegramCallbackQuery(token, callback.id, `已选中 ${selectedDialogIds.length} 个对话`);
    return;
  }

  const clearSelectionMatch = data.match(/^nsh:clear-selection:(\d+)$/);
  if (clearSelectionMatch) {
    selectedDialogIds = [];
    await updateTelegramSettingsDialogSelection(chatId, topicId, selectedDialogIds);
    await editTelegramSettingsMessage(token, settingsTopic, messageId,
      buildTelegramSettingsDialogsScreen(dialogTopics, clearSelectionMatch[1], selectedDialogIds));
    await answerTelegramCallbackQuery(token, callback.id, "已清空选择");
    return;
  }

  const deleteSelectedMatch = data.match(/^nsh:delete-selected:(\d+)$/);
  if (deleteSelectedMatch) {
    const selectedTopics = dialogTopics.filter((topic) => selectedDialogIds.includes(String(topic.id)));
    if (!selectedTopics.length) {
      await answerTelegramCallbackQuery(token, callback.id, "请先勾选要删除的对话", true);
      return;
    }
    await editTelegramSettingsMessage(token, settingsTopic, messageId,
      buildTelegramSettingsDeleteConfirmScreen(selectedTopics, Number(deleteSelectedMatch[1]) || 0));
    await answerTelegramCallbackQuery(token, callback.id);
    return;
  }

  const confirmDeleteMatch = data.match(/^nsh:confirm-delete:(\d+)$/);
  if (confirmDeleteMatch) {
    const selectedTopics = dialogTopics.filter((topic) => selectedDialogIds.includes(String(topic.id)));
    if (!selectedTopics.length) {
      await answerTelegramCallbackQuery(token, callback.id, "没有可删除的已选对话", true);
      return;
    }
    const result = await deleteTelegramManagedTopics(selectedTopics.map((topic) => topic.id));
    const failedIds = result.failed.map((item) => String(item.id));
    const settingsTopicDeleted = selectedTopics.some((topic) => String(topic.id) === String(settingsTopic.id))
      && !failedIds.includes(String(settingsTopic.id));
    if (settingsTopicDeleted) {
      const status = result.failed.length
        ? `已删除 ${result.deleted} 个；${result.failed.length} 个失败。`
        : `已删除 ${result.deleted} 个对话。`;
      await answerTelegramCallbackQuery(token, callback.id, `${status}设置主题已删除，发送 /start 可重新创建。`, result.failed.length > 0);
      return;
    }
    await updateTelegramSettingsDialogSelection(chatId, topicId, failedIds);
    const refreshed = await chrome.storage.local.get({
      [TELEGRAM_KEYS.managedTopics]: [],
      [TELEGRAM_KEYS.settingsTopics]: []
    });
    const remainingTopics = getTelegramSettingsDialogTopics(
      chatId,
      refreshed[TELEGRAM_KEYS.managedTopics],
      refreshed[TELEGRAM_KEYS.settingsTopics]
    );
    const notice = result.failed.length
      ? `已删除 ${result.deleted} 个，${result.failed.length} 个删除失败。`
      : `已删除 ${result.deleted} 个对话。`;
    await editTelegramSettingsMessage(token, settingsTopic, messageId,
      buildTelegramSettingsDialogsScreen(remainingTopics, confirmDeleteMatch[1], failedIds, notice));
    await answerTelegramCallbackQuery(token, callback.id, result.failed.length ? notice : "对话已删除");
    return;
  }

  await answerTelegramCallbackQuery(token, callback.id, "不支持的设置操作", true);
}

async function processTelegramManagedTopicUpdates(token, updates) {
  const stored = await chrome.storage.local.get({
    [TELEGRAM_KEYS.managedTopics]: [],
    [TELEGRAM_KEYS.processedTopicUpdates]: [],
    [TELEGRAM_KEYS.pendingTopicUpdates]: [],
    [TELEGRAM_KEYS.pendingTopicImageMarkdowns]: {},
    [TELEGRAM_KEYS.pendingTopicReadUserIds]: []
  });
  const topics = Array.isArray(stored[TELEGRAM_KEYS.managedTopics]) ? stored[TELEGRAM_KEYS.managedTopics] : [];
  const topicByKey = new Map(topics
    .filter((topic) => topic.kind === "dm" && topic.chatId && topic.topicId && topic.nsUserId)
    .map((topic) => [`${String(topic.chatId)}:${String(topic.topicId)}`, topic]));
  const processedUpdateIds = new Set((Array.isArray(stored[TELEGRAM_KEYS.processedTopicUpdates])
    ? stored[TELEGRAM_KEYS.processedTopicUpdates] : []).map(String));
  let pendingQueue = (Array.isArray(stored[TELEGRAM_KEYS.pendingTopicUpdates])
    ? stored[TELEGRAM_KEYS.pendingTopicUpdates] : []).filter((item) =>
    Array.isArray(item?.updates) && item.updates.length > 0 && item?.key
      && item?.topic?.chatId && item?.topic?.topicId && item?.topic?.nsUserId);
  const pendingImageMarkdowns = { ...(stored[TELEGRAM_KEYS.pendingTopicImageMarkdowns] || {}) };
  const pendingReads = new Set((Array.isArray(stored[TELEGRAM_KEYS.pendingTopicReadUserIds])
    ? stored[TELEGRAM_KEYS.pendingTopicReadUserIds] : []).map(String));

  const orderedUpdates = [...updates].sort((a, b) => Number(a.update_id) - Number(b.update_id));
  const queuedKeys = new Set(pendingQueue.map((item) => String(item.key)));
  for (const updateGroup of groupTelegramManagedTopicUpdates(orderedUpdates)) {
    const pendingUpdates = updateGroup.filter((update) => {
      const updateId = String(Number(update?.update_id) || "");
      return updateId && !processedUpdateIds.has(updateId);
    });
    if (pendingUpdates.length === 0) continue;
    const message = pendingUpdates.map((update) => update?.message).find(Boolean);
    const topicId = String(message?.message_thread_id || "");
    const chatId = String(message?.chat?.id || "");
    const topic = topicByKey.get(`${chatId}:${topicId}`);
    if (!topic || message?.chat?.type !== "private" || !message?.from || message.from.is_bot === true) continue;

    const updateIds = pendingUpdates.map((update) => String(Number(update?.update_id) || "")).filter(Boolean);
    const key = updateIds.join(":");
    if (queuedKeys.has(key)) continue;
    queuedKeys.add(key);
    pendingQueue.push({
      key,
      updateIds,
      updates: pendingUpdates,
      topic: {
        chatId: String(topic.chatId),
        topicId: String(topic.topicId),
        nsUserId: String(topic.nsUserId),
        name: String(topic.name || "NodeSeek 用户")
      },
      attempts: 0,
      nextRetryAt: 0,
      failureNotified: false,
      createdAt: Date.now()
    });
  }
  pendingQueue.sort((a, b) => Number(a.updateIds?.[0]) - Number(b.updateIds?.[0]));
  await chrome.storage.local.set({ [TELEGRAM_KEYS.pendingTopicUpdates]: pendingQueue });

  const blockedTopics = new Set();
  for (const queueItem of [...pendingQueue]) {
    const pendingUpdates = queueItem.updates.filter((update) => {
      const updateId = String(Number(update?.update_id) || "");
      return updateId && !processedUpdateIds.has(updateId);
    });
    if (pendingUpdates.length === 0) {
      pendingQueue = pendingQueue.filter((item) => item.key !== queueItem.key);
      continue;
    }
    const messages = pendingUpdates.map((update) => update?.message).filter(Boolean);
    const message = messages[0];
    const { chatId, topicId, nsUserId, name: topicName } = queueItem.topic;
    const topicKey = `${chatId}:${topicId}`;
    if (blockedTopics.has(topicKey) || Number(queueItem.nextRetryAt) > Date.now()) {
      blockedTopics.add(topicKey);
      continue;
    }
    try {

    const text = [...new Set(messages
      .map((item) => String(item.text || item.caption || "").trim())
      .filter(Boolean))].join("\n\n");
    const images = pendingUpdates.map((update) => ({
      updateId: String(Number(update?.update_id) || ""),
      image: getTelegramMessageImage(update?.message)
    })).filter((item) => item.updateId && item.image);
    if (!text && images.length === 0) {
      await sendTelegramMessage(token, { type: "personal", chatId, topicId }, "目前支持文字和图片私信；这条消息类型暂不支持。");
    } else {
      const imageMarkdowns = [];
      if (images.length > 0) {
        try {
          for (const item of images) {
            let imageMarkdown = pendingImageMarkdowns[item.updateId] || "";
            if (!imageMarkdown) {
              const uploaded = await uploadTelegramMessageImage(token, item.image);
              imageMarkdown = uploaded.markdown;
              pendingImageMarkdowns[item.updateId] = imageMarkdown;
              await chrome.storage.local.set({
                [TELEGRAM_KEYS.pendingTopicImageMarkdowns]: pendingImageMarkdowns
              });
            }
            imageMarkdowns.push(imageMarkdown);
          }
        } catch (error) {
          if (!queueItem.failureNotified) {
            const reason = String(error?.message || error || "图片上传失败").slice(0, 300);
            const failureMessage = error?.code === "TELEGRAM_IMAGE_UPLOAD_DISABLED"
              ? "图片未发送到 NodeSeek：请在扩展设置的「图床配置」中开启图床上传，并登录 NodeImage 完成授权：https://www.nodeimage.com/。完成后插件会自动重试。"
              : `图片上传失败，插件会自动重试：${reason}`;
            await sendTelegramMessage(token, { type: "personal", chatId, topicId }, failureMessage);
            queueItem.failureNotified = true;
          }
          throw error;
        }
      }

      const content = [text, ...imageMarkdowns].filter(Boolean).join("\n\n");
      let echoId = String(queueItem.echoId || "");
      let baselineMessageId = queueItem.baselineMessageId;
      if (!echoId) {
        echoId = `telegram-update:${queueItem.key}`;
        baselineMessageId = await getNodeSeekTelegramSendBaselineMessageId(nsUserId);
        queueItem.echoId = echoId;
        queueItem.baselineMessageId = baselineMessageId;
        pendingQueue = pendingQueue.map((item) => item.key === queueItem.key ? queueItem : item);
        await chrome.storage.local.set({ [TELEGRAM_KEYS.pendingTopicUpdates]: pendingQueue });
      }

      await rememberTelegramOutgoingEcho(nsUserId, content, {
        chatId,
        topicId,
        topicName,
        echoId,
        ...(baselineMessageId != null ? { baselineMessageId } : {})
      });

      let alreadySent = false;
      if (baselineMessageId != null && String(baselineMessageId).trim()) {
        const matchingMessage = await findNodeSeekOutgoingMessageForTelegramEcho(
          nsUserId,
          content,
          baselineMessageId
        );
        if (matchingMessage) {
          alreadySent = true;
          await updateTelegramOutgoingEchoStatus(echoId, "sent");
        }
      }

      if (!alreadySent) {
        await sendNodeSeekPrivateMessage(nsUserId, content, imageMarkdowns.length > 0);
        await updateTelegramOutgoingEchoStatus(echoId, "sent");
      }
      scheduleTelegramMonitorAlarm({ checkImmediately: true }).catch(() => {});
    }

    for (const update of pendingUpdates) {
      const updateId = String(Number(update?.update_id) || "");
      if (updateId) {
        processedUpdateIds.add(updateId);
        delete pendingImageMarkdowns[updateId];
      }
    }
    pendingQueue = pendingQueue.filter((item) => item.key !== queueItem.key);
    await chrome.storage.local.set({
      [TELEGRAM_KEYS.processedTopicUpdates]: [...processedUpdateIds].slice(-500),
      [TELEGRAM_KEYS.pendingTopicUpdates]: pendingQueue,
      [TELEGRAM_KEYS.pendingTopicImageMarkdowns]: pendingImageMarkdowns,
      [TELEGRAM_KEYS.pendingTopicReadUserIds]: [...pendingReads]
    });
    pendingReads.add(nsUserId);
    await chrome.storage.local.set({ [TELEGRAM_KEYS.pendingTopicReadUserIds]: [...pendingReads] });
    } catch (error) {
      queueItem.attempts = (Number(queueItem.attempts) || 0) + 1;
      const delayMs = getTelegramUpdatesRetryDelayMs(queueItem.attempts, error?.retryAfterSeconds);
      queueItem.nextRetryAt = Date.now() + delayMs;
      queueItem.lastError = String(error?.message || error || "发送失败").slice(0, 300);
      pendingQueue = pendingQueue.map((item) => item.key === queueItem.key ? queueItem : item);
      await chrome.storage.local.set({
        [TELEGRAM_KEYS.pendingTopicUpdates]: pendingQueue,
        [TELEGRAM_KEYS.lastError]: `TG 私信待重试：${queueItem.lastError}`
      });
      blockedTopics.add(topicKey);
    }
  }
  await processPendingTelegramTopicReads();
}

async function processPendingTelegramTopicReads() {
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.pendingTopicReadUserIds]: [] });
  const pendingReads = new Set((Array.isArray(stored[TELEGRAM_KEYS.pendingTopicReadUserIds])
    ? stored[TELEGRAM_KEYS.pendingTopicReadUserIds] : []).map(String).filter(Boolean));
  for (const userId of pendingReads) {
    try {
      const completed = await runTelegramRetriableOperation(`nodeseek-mark-read:${userId}`, () =>
        markNodeSeekConversationRead(userId));
      if (completed) pendingReads.delete(userId);
    } catch (error) {
      await chrome.storage.local.set({
        [TELEGRAM_KEYS.lastError]: `NodeSeek 私信已读状态待重试：${String(error?.message || error).slice(0, 300)}`
      });
    }
  }
  await chrome.storage.local.set({ [TELEGRAM_KEYS.pendingTopicReadUserIds]: [...pendingReads] });
}

function groupTelegramManagedTopicUpdates(updates) {
  const groups = [];
  const mediaGroups = new Map();

  for (const update of updates) {
    const message = update?.message;
    const mediaGroupId = String(message?.media_group_id || "");
    if (!mediaGroupId) {
      groups.push([update]);
      continue;
    }

    const key = JSON.stringify([
      String(message?.chat?.id || ""),
      String(message?.message_thread_id || ""),
      mediaGroupId
    ]);
    let group = mediaGroups.get(key);
    if (!group) {
      group = [];
      mediaGroups.set(key, group);
      groups.push(group);
    }
    group.push(update);
  }

  return groups;
}

function getTelegramMessageImage(message) {
  const photoSizes = Array.isArray(message?.photo) ? message.photo.filter((photo) => photo?.file_id) : [];
  if (photoSizes.length > 0) {
    const photo = photoSizes.sort((a, b) =>
      Number(b.file_size || 0) - Number(a.file_size || 0)
      || Number(b.width || 0) * Number(b.height || 0) - Number(a.width || 0) * Number(a.height || 0))[0];
    return { fileId: photo.file_id, fileSize: Number(photo.file_size) || 0, mimeType: "image/jpeg" };
  }

  const document = message?.document;
  if (document?.file_id && String(document.mime_type || "").toLowerCase().startsWith("image/")) {
    return {
      fileId: document.file_id,
      fileSize: Number(document.file_size) || 0,
      fileName: document.file_name,
      mimeType: String(document.mime_type)
    };
  }
  return null;
}

async function uploadTelegramMessageImage(tokenValue, image) {
  const token = String(tokenValue || "").trim();
  if (!token || !image?.fileId) throw new Error("Telegram 图片信息不完整");
  if (image.fileSize > 20 * 1024 * 1024) throw new Error("Telegram 图片超过 20 MB 下载限制");
  const options = await getOptions();
  if (options.imageUploadEnabled === false) {
    const error = new Error("Telegram 图片转发需要图床上传功能");
    error.code = "TELEGRAM_IMAGE_UPLOAD_DISABLED";
    throw error;
  }

  const fileInfoResponse = await fetchWithTimeout(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(image.fileId)}`
  );
  const fileInfo = await fileInfoResponse.json();
  const filePath = String(fileInfo?.result?.file_path || "");
  if (!fileInfoResponse.ok || !fileInfo?.ok || !filePath) {
    throw new Error(fileInfo?.description || `读取 Telegram 图片失败（HTTP ${fileInfoResponse.status}）`);
  }

  const encodedFilePath = filePath.split("/").map(encodeURIComponent).join("/");
  const fileResponse = await fetchWithTimeout(`https://api.telegram.org/file/bot${token}/${encodedFilePath}`, { credentials: "omit" }, TELEGRAM_FILE_REQUEST_TIMEOUT_MS);
  if (!fileResponse.ok) throw new Error(`下载 Telegram 图片失败（HTTP ${fileResponse.status}）`);
  const blob = await fileResponse.blob();
  if (blob.size === 0 || blob.size > 20 * 1024 * 1024) throw new Error("Telegram 图片大小无效或超过 20 MB");
  const responseMimeType = String(blob.type || "").split(";")[0].trim().toLowerCase();
  const declaredMimeType = String(image.mimeType || "").split(";")[0].trim().toLowerCase();
  const genericResponseMime = !responseMimeType
    || responseMimeType === "application/octet-stream"
    || responseMimeType === "binary/octet-stream";
  const mimeType = responseMimeType.startsWith("image/")
    ? responseMimeType
    : genericResponseMime ? declaredMimeType : responseMimeType;
  if (!mimeType.toLowerCase().startsWith("image/")) throw new Error("Telegram 文件不是可识别的图片格式");

  const pathName = String(image.fileName || filePath.split("/").pop() || "telegram-image")
    .split(/[\\/]/).pop().replace(/[^\w.-]+/g, "_");
  const extension = mimeType.toLowerCase() === "image/jpeg" ? "jpg" : mimeType.split("/")[1] || "img";
  const fileName = /\.[a-z\d]{2,5}$/i.test(pathName) ? pathName : `${pathName}.${extension}`;
  const uploadBlob = blob.type === mimeType ? blob : new Blob([blob], { type: mimeType });
  const uploaded = await uploadImage({ blob: uploadBlob, name: fileName, type: mimeType });
  if (!uploaded?.markdown) throw new Error("图床上传成功，但没有生成图片 Markdown 链接");
  return uploaded;
}

async function sendNodeSeekPrivateMessage(receiverUid, content, markdown = false) {
  const recipientId = Number(receiverUid);
  if (!Number.isSafeInteger(recipientId) || recipientId <= 0) throw new Error("NodeSeek 用户 ID 无效");
  await requestNodeSeekTelegramPage("send-private-message", {
    receiverUid: recipientId,
    content: String(content),
    markdown: Boolean(markdown)
  });

}

async function requestNodeSeekTelegramPage(operation, payload = {}, { forceFreshTab = false } = {}) {
  const matchingTabs = forceFreshTab
    ? []
    : await chrome.tabs.query({ url: "https://www.nodeseek.com/*" });
  let tab = matchingTabs.find((candidate) => !candidate.discarded && candidate.status === "complete")
    || matchingTabs.find((candidate) => !candidate.discarded)
    || null;
  let createdTabId = 0;
  if (!tab) {
    tab = await chrome.tabs.create({ url: "https://www.nodeseek.com/notification", active: false });
    createdTabId = Number(tab.id) || 0;
    await waitForNodeSeekTelegramTab(tab);
  }

  try {
    let lastError = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        const response = await promiseWithTimeout(chrome.tabs.sendMessage(tab.id, {
          type: "telegram:nodeSeekPageRequest",
          payload: { operation, ...payload }
        }), 22_000, "NodeSeek 页面请求");
        if (response?.ok === true) return response.result;
        if (response) throw new Error(String(response.error || "NodeSeek 页面请求失败"));
      } catch (error) {
        lastError = error;
        if (!/Receiving end does not exist|Could not establish connection/i.test(String(error?.message || ""))) {
          throw error;
        }
      }
      if (attempt < 11) await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!createdTabId && isTelegramNodeSeekPageReceiverUnavailable(lastError)) {
      return await requestNodeSeekTelegramPage(operation, payload, { forceFreshTab: true });
    }
    throw new Error(lastError?.message || "无法连接 NodeSeek 页面");
  } finally {
    if (createdTabId) await chrome.tabs.remove(createdTabId).catch(() => {});
  }
}

function isTelegramNodeSeekPageReceiverUnavailable(error) {
  return /Receiving end does not exist|Could not establish connection/i.test(String(error?.message || ""));
}

function waitForNodeSeekTelegramTab(tab) {
  if (tab.status === "complete") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error("NodeSeek 页面加载超时")), 20_000);
    const listener = (tabId, changeInfo) => {
      if (tabId === tab.id && changeInfo.status === "complete") finish();
    };
    const finish = (error) => {
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      if (error) reject(error);
      else resolve();
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function markNodeSeekConversationRead(userIdValue) {
  const userId = String(userIdValue || "").trim();
  if (!userId) throw new Error("NodeSeek 用户 ID 缺失，无法标记私信已读");
  const currentUserId = String((await fetchLuckyCurrentUser("https://www.nodeseek.com/"))?.member_id || "").trim();
  if (!currentUserId) throw new Error("无法确认当前 NodeSeek 账号，私信已发送但标记已读失败");
  await requestNodeSeekTelegramPage("mark-conversation-read", {
    userId,
    currentUserId
  });
}

async function sendTelegramTestMessage(targetId = "") {
  const config = await chrome.storage.local.get({
    [TELEGRAM_KEYS.token]: "",
    [TELEGRAM_KEYS.targets]: []
  });
  const targets = (Array.isArray(config[TELEGRAM_KEYS.targets]) ? config[TELEGRAM_KEYS.targets] : [])
    .filter((target) => target?.chatId && (targetId ? target.id === targetId : target.enabled !== false));
  const selectedTargets = targets;
  if (selectedTargets.length === 0) throw new Error("请先添加并保存一个有效的 Telegram 推送目标");
  for (const target of selectedTargets) {
    await sendTelegramMessage(config[TELEGRAM_KEYS.token], target, "NodeSeeker 测试成功");
  }
  return { message: `测试通知已发送到 ${selectedTargets.length} 个目标` };
}

async function deleteTelegramManagedTopics(topicIdsValue) {
  const selectedIds = new Set((Array.isArray(topicIdsValue) ? topicIdsValue : []).map(String));
  if (selectedIds.size === 0) return { deleted: 0, failed: [] };
  const config = await chrome.storage.local.get({
    [TELEGRAM_KEYS.token]: "",
    [TELEGRAM_KEYS.managedTopics]: [],
    [TELEGRAM_KEYS.settingsTopics]: []
  });
  const token = String(config[TELEGRAM_KEYS.token] || "").trim();
  if (!token) throw new Error("请先设置有效的 Bot Token");
  const topics = [
    ...(Array.isArray(config[TELEGRAM_KEYS.managedTopics]) ? config[TELEGRAM_KEYS.managedTopics] : []),
    ...(Array.isArray(config[TELEGRAM_KEYS.settingsTopics]) ? config[TELEGRAM_KEYS.settingsTopics] : [])
  ];
  const deleting = topics.filter((topic) => selectedIds.has(String(topic.id)));
  const failed = [];
  let deleted = 0;

  for (const topic of deleting) {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/deleteForumTopic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: topic.chatId, message_thread_id: Number(topic.topicId) })
    });
    const result = await response.json();
    if (!response.ok || !result?.ok) {
      failed.push({ id: topic.id, name: topic.name, error: result?.description || `HTTP ${response.status}` });
      continue;
    }
    deleted += 1;
  }

  const failedIds = new Set(failed.map((topic) => String(topic.id)));
  const managedTopics = Array.isArray(config[TELEGRAM_KEYS.managedTopics]) ? config[TELEGRAM_KEYS.managedTopics] : [];
  const settingsTopics = Array.isArray(config[TELEGRAM_KEYS.settingsTopics]) ? config[TELEGRAM_KEYS.settingsTopics] : [];
  await chrome.storage.local.set({
    [TELEGRAM_KEYS.managedTopics]: managedTopics.filter((topic) =>
      !selectedIds.has(String(topic.id)) || failedIds.has(String(topic.id))),
    [TELEGRAM_KEYS.settingsTopics]: settingsTopics.filter((topic) =>
      !selectedIds.has(String(topic.id)) || failedIds.has(String(topic.id)))
  });
  return { deleted, failed };
}

async function validateTelegramBotToken(tokenValue) {
  const bot = await getTelegramBotInfo(tokenValue);
  return { username: bot.username, firstName: bot.first_name || "" };
}

async function getTelegramBotInfo(tokenValue) {
  const token = String(tokenValue || "").trim();
  if (!token) throw new Error("请先填写 Bot Token");
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    const error = new Error("Bot Token 格式无效");
    error.invalidToken = true;
    throw error;
  }

  let response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/getMe`, {
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: controller.signal
    });
  } catch (_error) {
    throw new Error("无法连接 Telegram API，请检查网络后重试");
  } finally {
    clearTimeout(timeoutId);
  }

  let result;
  try {
    result = await response.json();
  } catch (_error) {
    throw new Error("Telegram API 响应无效");
  }

  if (!response.ok || !result?.ok || !result.result?.username) {
    const invalidToken = [401, 404].includes(Number(response.status))
      || [401, 404].includes(Number(result?.error_code));
    const error = new Error(invalidToken
      ? "Bot Token 无效"
      : result?.description || `Telegram API 返回 HTTP ${response.status}`);
    error.invalidToken = invalidToken;
    throw error;
  }
  return result.result;
}

async function getTelegramBotLink() {
  const config = await chrome.storage.local.get(TELEGRAM_KEYS.token);
  const token = String(config[TELEGRAM_KEYS.token] || "").trim();
  if (!token) throw new Error("请先填写并保存 Bot Token");
  const bot = await getTelegramBotInfo(token);
  return `https://t.me/${bot.username}?start=nodeseek_helper`;
}

function findTelegramPersonalStartUpdate(updates, sinceSeconds = 0) {
  return [...updates].reverse().find((update) => {
    const message = update.message;
    const messageDate = Number(message?.date) || 0;
    return message?.chat?.type === "private"
      && (!sinceSeconds || !messageDate || messageDate >= sinceSeconds)
      && /^\/start(?:@\w+)?(?:\s+[\w-]+)?$/i.test(String(message.text || "").trim());
  });
}

function extractTelegramDirectTopicUpdates(updates) {
  return updates.map((update) => {
    const message = update.message || update.channel_post;
    const topicId = Number(message?.direct_messages_topic?.topic_id);
    if (message?.chat?.is_direct_messages !== true || !Number.isSafeInteger(topicId) || topicId <= 0) return null;
    const topic = message.direct_messages_topic;
    const user = topic.user || message.from || {};
    return {
      updateId: Number(update.update_id) || 0,
      chatId: String(message.chat.id || ""),
      topicId: String(topicId),
      topicUser: [user.first_name, user.last_name].filter(Boolean).join(" ").trim(),
      topicUsername: user.username || ""
    };
  }).filter((item) => item?.chatId && item.updateId > 0);
}

async function cacheTelegramDirectTopicUpdates(updates) {
  const incoming = extractTelegramDirectTopicUpdates(updates);
  if (incoming.length === 0) return;
  const stored = await chrome.storage.local.get({ [TELEGRAM_PENDING_DIRECT_TOPICS_KEY]: [] });
  const topicsById = new Map();
  for (const topic of [
    ...(Array.isArray(stored[TELEGRAM_PENDING_DIRECT_TOPICS_KEY]) ? stored[TELEGRAM_PENDING_DIRECT_TOPICS_KEY] : []),
    ...incoming
  ]) {
    const key = `${topic.chatId}:${topic.topicId}`;
    const current = topicsById.get(key);
    if (!current || Number(topic.updateId) >= Number(current.updateId)) topicsById.set(key, topic);
  }
  await chrome.storage.local.set({
    [TELEGRAM_PENDING_DIRECT_TOPICS_KEY]: [...topicsById.values()]
      .sort((a, b) => Number(a.updateId) - Number(b.updateId))
      .slice(-500)
  });
}

async function startTelegramPersonalStartWatch() {
  const config = await chrome.storage.local.get(TELEGRAM_KEYS.token);
  const token = String(config[TELEGRAM_KEYS.token] || "").trim();
  if (!token) throw new Error("请先填写并保存 Bot Token");

  const startedAt = Date.now();
  await chrome.storage.local.set({
    [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: startedAt + TELEGRAM_PERSONAL_START_WATCH_DURATION_MS,
    [TELEGRAM_PERSONAL_START_WATCH_SINCE_KEY]: Math.floor(startedAt / 1000)
  });
  await chrome.alarms.create(TELEGRAM_PERSONAL_START_ALARM_NAME, {
    when: startedAt + TELEGRAM_PERSONAL_START_WATCH_DURATION_MS
  });
  await ensureTelegramUpdatesLongPoll();
}

async function stopTelegramPersonalStartWatch() {
  await chrome.alarms.clear(TELEGRAM_PERSONAL_START_ALARM_NAME);
  await chrome.storage.local.set({ [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0 });
  await ensureTelegramUpdatesLongPoll();
}

async function checkTelegramPersonalStartWatch() {
  const config = await chrome.storage.local.get({
    [TELEGRAM_KEYS.token]: "",
    [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0
  });
  const token = String(config[TELEGRAM_KEYS.token] || "").trim();
  const watchUntil = Number(config[TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]) || 0;
  if (!watchUntil) {
    await chrome.alarms.clear(TELEGRAM_PERSONAL_START_ALARM_NAME);
    return;
  }
  if (watchUntil > Date.now()) {
    await chrome.alarms.create(TELEGRAM_PERSONAL_START_ALARM_NAME, { when: watchUntil });
    return;
  }

  await chrome.alarms.clear(TELEGRAM_PERSONAL_START_ALARM_NAME);
  await chrome.storage.local.set({ [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0 });
  if (token) chrome.runtime.sendMessage({ type: "telegram:personalStartWatchTimeout" }).catch(() => {});
  await ensureTelegramUpdatesLongPoll();
}

async function registerTelegramPersonalStartUpdate(token, update) {
  const chatId = String(update.message.chat.id || "");
  const updateId = Number(update.update_id) || 0;
  if (!chatId || !updateId) return;

  const state = await chrome.storage.local.get({
    [TELEGRAM_PERSONAL_START_REPLIED_UPDATE_ID_KEY]: 0,
    [TELEGRAM_KEYS.targets]: [],
    [TELEGRAM_PENDING_PERSONAL_TARGET_NAME_KEY]: "个人聊天"
  });
  const lastRepliedUpdateId = Number(state[TELEGRAM_PERSONAL_START_REPLIED_UPDATE_ID_KEY]) || 0;
  const targets = Array.isArray(state[TELEGRAM_KEYS.targets]) ? [...state[TELEGRAM_KEYS.targets]] : [];
  const existingTarget = targets.find((target) => target?.type !== "direct" && String(target?.chatId || "") === chatId);
  const targetAdded = Boolean(existingTarget) || targets.length < 10;
  const targetName = String(state[TELEGRAM_PENDING_PERSONAL_TARGET_NAME_KEY] || "个人聊天").trim().slice(0, 40) || "个人聊天";
  if (!existingTarget && targetAdded) {
    targets.push({
      id: crypto.randomUUID(),
      name: targetName,
      type: "personal",
      chatId,
      topicId: "",
      channelChatId: "",
      enabled: true
    });
  }
  await chrome.storage.local.set({
    [TELEGRAM_KEYS.targets]: targets,
    telegramPendingPersonalStartUpdateId: updateId,
    [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0
  });
  await chrome.storage.local.remove([TELEGRAM_PENDING_PERSONAL_CHAT_ID_KEY, TELEGRAM_PENDING_PERSONAL_TARGET_NAME_KEY]);
  await chrome.alarms.clear(TELEGRAM_PERSONAL_START_ALARM_NAME);
  chrome.runtime.sendMessage({
    type: "telegram:personalChatIdDetected",
    chatId,
    targetAdded: !existingTarget && targetAdded,
    alreadyExists: Boolean(existingTarget),
    error: targetAdded ? "" : "推送目标已满，无法添加这个聊天"
  }).catch(() => {});

  if (updateId <= lastRepliedUpdateId) return;
  try {
    if (targetAdded) {
      await ensureTelegramSettingsEntry(token, chatId);
    } else {
      await sendTelegramMessage(token, { type: "personal", chatId }, "推送目标已满，请返回插件移除一个目标后重试。");
    }
    await chrome.storage.local.set({ [TELEGRAM_PERSONAL_START_REPLIED_UPDATE_ID_KEY]: updateId });
  } catch (error) {
    chrome.runtime.sendMessage({
      type: "telegram:personalChatIdReplyFailed",
      error: error?.message || "机器人回复失败"
    }).catch(() => {});
  }
}

async function getTelegramDirectTopicId(channelChatIdValue, updateOffsetValue = null) {
  const config = await chrome.storage.local.get(TELEGRAM_KEYS.token);
  const token = String(config[TELEGRAM_KEYS.token] || "").trim();
  const channelChatId = String(channelChatIdValue || "").trim();
  if (!token) throw new Error("请先填写并保存 Bot Token");
  if (!channelChatId) throw new Error("请先填写频道公开分享链接或 Direct Chat ID");

  const channelLookupId = /^-?\d+$/.test(channelChatId)
    ? channelChatId
    : `@${channelChatId.replace(/^@/, "")}`;
  const channelResponse = await fetchWithTimeout(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(channelLookupId)}`);
  const channelResult = await channelResponse.json();
  if (!channelResponse.ok || !channelResult?.ok || !channelResult.result?.id) {
    throw new Error(channelResult?.description || "无法识别该频道；请检查公开分享链接或 Chat ID");
  }
  const channel = channelResult.result;
  const parentChannelId = channel.is_direct_messages
    ? String(channel.parent_chat?.id || "")
    : String(channel.id);
  if (!parentChannelId) throw new Error("无法从 Direct Chat ID 识别所属频道");
  const selectedDirectChatId = channel.is_direct_messages ? String(channel.id) : "";

  const batchWaiter = waitForTelegramUpdateBatch();
  await chrome.storage.local.set({
    [TELEGRAM_DIRECT_TOPIC_SCAN_UNTIL_KEY]: Date.now() + TELEGRAM_DIRECT_TOPIC_SCAN_DURATION_MS
  });
  await ensureTelegramUpdatesLongPoll();
  let cachedTopics = await chrome.storage.local.get({ [TELEGRAM_PENDING_DIRECT_TOPICS_KEY]: [] });
  if (!Array.isArray(cachedTopics[TELEGRAM_PENDING_DIRECT_TOPICS_KEY])
      || cachedTopics[TELEGRAM_PENDING_DIRECT_TOPICS_KEY].length === 0) {
    await batchWaiter.promise;
    cachedTopics = await chrome.storage.local.get({ [TELEGRAM_PENDING_DIRECT_TOPICS_KEY]: [] });
  } else {
    batchWaiter.cancel();
  }
  const requestedOffset = Number.isSafeInteger(Number(updateOffsetValue)) ? Number(updateOffsetValue) : 0;
  const cachedDirectTopics = (Array.isArray(cachedTopics[TELEGRAM_PENDING_DIRECT_TOPICS_KEY])
    ? cachedTopics[TELEGRAM_PENDING_DIRECT_TOPICS_KEY] : [])
    .filter((topic) => !requestedOffset || Number(topic.updateId) >= requestedOffset);
  const latestUpdateId = cachedDirectTopics.reduce((max, topic) => Math.max(max, Number(topic.updateId) || 0), 0);
  const nextOffset = latestUpdateId > 0 ? latestUpdateId + 1 : null;
  const directMessagesById = new Map();
  for (const topic of cachedDirectTopics) {
    const key = `${topic.chatId}:${topic.topicId}`;
    const current = directMessagesById.get(key);
    if (!current || Number(topic.updateId) >= Number(current.updateId)) directMessagesById.set(key, topic);
  }
  const directMessages = [...directMessagesById.values()];
  const directChatIds = [...new Set(directMessages.map(({ chatId }) => String(chatId)))];
  const matchingDirectChatIds = new Set();
  for (const directChatId of directChatIds) {
    if (directChatId === selectedDirectChatId) {
      matchingDirectChatIds.add(directChatId);
      continue;
    }
    const directChatResponse = await fetchWithTimeout(
      `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(directChatId)}`
    );
    const directChatResult = await directChatResponse.json();
    if (directChatResponse.ok && directChatResult?.ok
      && directChatResult.result?.is_direct_messages === true
      && String(directChatResult.result.parent_chat?.id || "") === parentChannelId) {
      matchingDirectChatIds.add(directChatId);
    }
  }
  const matchingMessages = directMessages
    .filter(({ chatId }) => matchingDirectChatIds.has(String(chatId)))
    .sort((a, b) => a.updateId - b.updateId);

  if (matchingMessages.length === 0) {
    return {
      topics: [],
      nextOffset,
      updatesRead: cachedDirectTopics.length,
      message: "本批没有接收对话；请使用频道创建者以外的 Telegram 账号打开频道分享链接，向频道 Direct 发一条消息后重新读取"
    };
  }

  const topicsById = new Map();
  for (const directMessage of matchingMessages) {
    const { updateId, topicId, chatId, topicUser, topicUsername } = directMessage;
    const key = `${chatId}:${topicId}`;
    const current = topicsById.get(key);
    if (!current || updateId >= current.lastUpdateId) {
      topicsById.set(key, {
        chatId,
        topicId,
        topicUser,
        topicUsername,
        lastUpdateId: updateId
      });
    }
  }
  const topics = [...topicsById.values()]
    .sort((a, b) => b.lastUpdateId - a.lastUpdateId)
    .map(({ chatId, topicId, topicUser, topicUsername }) => ({
      chatId,
      topicId,
      topicUser,
      topicUsername
    }));
  return { topics, nextOffset, updatesRead: cachedDirectTopics.length };
}

function addTelegramTargetTopic(payload, target) {
  if (target.type === "direct") {
    if (!target.topicId) throw new Error("频道 Direct 目标缺少主题 ID");
    if (!/^-?\d+$/.test(String(target.chatId))) {
      throw new Error("Direct 目标缺少 Direct Chat ID；请重新读取 Direct 主题并添加目标");
    }
    payload.direct_messages_topic_id = Number(target.topicId);
  } else if (target.topicId) {
    payload.message_thread_id = Number(target.topicId);
  }
  return payload;
}

async function shouldSendTelegramSilently() {
  try {
    const settings = await chrome.storage.local.get({ telegramSilentPushEnabled: false });
    if (settings.telegramSilentPushEnabled === true) return true;
    const window = await chrome.windows.getLastFocused({
      windowTypes: ["normal"]
    });
    if (!window?.focused) return false;
    const [activeTab] = await chrome.tabs.query({ active: true, windowId: window.id });
    const url = new URL(String(activeTab?.url || ""));
    return url.protocol === "https:"
      && (url.hostname === "nodeseek.com" || url.hostname.endsWith(".nodeseek.com"));
  } catch (_error) {
    return false;
  }
}

async function sendTelegramPhoto(tokenValue, target, photoUrl, caption = "") {
  const token = String(tokenValue || "").trim();
  const url = String(photoUrl || "").trim();
  if (!token || !target?.chatId) throw new Error("请填写 Bot Token 和目标 Chat ID");
  if (!/^https?:\/\//i.test(url)) throw new Error("NodeSeek 图片链接无效");
  const payload = addTelegramTargetTopic({
    chat_id: target.chatId,
    photo: url,
    disable_notification: await shouldSendTelegramSilently(),
    ...(caption ? { caption: String(caption).slice(0, 1024) } : {})
  }, target);
  const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok || !result?.ok) {
    const error = new Error(result?.description || `Telegram 图片发送失败（HTTP ${response.status}）`);
    error.telegramResponseReceived = true;
    error.httpStatus = response.status;
    error.retryAfterSeconds = Number(result?.parameters?.retry_after) || 0;
    throw error;
  }
}

async function sendTelegramMessage(tokenValue, target, text, entities = null) {
  const token = String(tokenValue || "").trim();
  if (!token || !target?.chatId) throw new Error("请填写 Bot Token 和目标 Chat ID");
  const payload = addTelegramTargetTopic({
    chat_id: target.chatId,
    text: String(text || "").slice(0, 4000),
    disable_web_page_preview: true,
    disable_notification: await shouldSendTelegramSilently(),
    ...(Array.isArray(entities) && entities.length ? { entities } : {})
  }, target);
  const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok || !result?.ok) {
    const error = new Error(result?.description || `Telegram 返回 HTTP ${response.status}`);
    error.telegramResponseReceived = true;
    error.httpStatus = response.status;
    error.retryAfterSeconds = Number(result?.parameters?.retry_after) || 0;
    throw error;
  }
}
