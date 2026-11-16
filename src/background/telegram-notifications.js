const TELEGRAM_KEYS = {
  token: "telegramBotToken",
  targets: "telegramTargets",
  messagesEnabled: "telegramMessageNotificationsEnabled",
  postsEnabled: "telegramPostNotificationsEnabled",
  mentionEnabled: "telegramMentionNotificationsEnabled",
  replyEnabled: "telegramReplyNotificationsEnabled",
  keywords: "telegramKeywordRules",
  blockedKeywords: "telegramBlockedKeywords",
  boards: "telegramBoardSlugs",
  messageCursors: "telegramMessageCursors",
  outgoingMessageEchoes: "telegramOutgoingMessageEchoes",
  outgoingReadStatuses: "telegramOutgoingMessageReadStatuses",
  topicReadMarkerIconId: "telegramTopicUnreadDistortedFaceIconCustomEmojiId",
  systemNotificationUserId: "telegramSystemNotificationUserId",
  managedTopics: "telegramManagedTopics",
  processedTopicUpdates: "telegramProcessedTopicUpdateIds",
  pendingTopicImageMarkdowns: "telegramPendingTopicImageMarkdowns",
  pendingTopicReadUserIds: "telegramPendingTopicReadUserIds",
  mentionReplyCursors: "telegramMentionReplyCursors",
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
const TELEGRAM_ACTIVITY_PAGE_LIMIT = 20;
const TELEGRAM_ACTIVITY_PAGE_SIZE = 10;
const TELEGRAM_OUTGOING_ECHO_LIMIT = 200;
const TELEGRAM_OUTGOING_ECHO_TTL_MS = 2 * 60 * 60 * 1000;
const TELEGRAM_TOPIC_UNREAD_MARKER_TYPE = "topic-icon-eyes";
const TELEGRAM_TOPIC_STYLES = Object.freeze({
  system: Object.freeze({ name: "系统", iconCustomEmojiId: "5309984423003823246", iconColor: 16766590 }),
  rss: Object.freeze({ name: "监控", iconCustomEmojiId: "5309965701241379366", iconColor: 9367192 }),
  mention: Object.freeze({ name: "提及", iconCustomEmojiId: "5379748062124056162", iconColor: 16478047 }),
  reply: Object.freeze({ name: "回复", iconCustomEmojiId: "5417915203100613993", iconColor: 13338331 }),
  dm: Object.freeze({ name: "", iconColor: 7322096 })
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
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const result = await response.json();
    if (response.ok && result?.ok && result.result?.url) {
      return "该机器人已配置 Webhook。插件可以发送通知，但无法通过 getUpdates 接收 Topic 回信或自动读取 /start、频道 Direct 会话。";
    }
  } catch (_error) {
    // Keep the fallback message useful if Telegram cannot return webhook status.
  }
  return "另一个实例正在使用 getUpdates。插件仍可发送通知，但自动读取 /start、频道 Direct 会话和转发 Topic 回信会受影响。";
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
      || (Array.isArray(config[TELEGRAM_KEYS.managedTopics]) && config[TELEGRAM_KEYS.managedTopics].length > 0));
}

function isTelegramNodeSeekMonitorReady(config) {
  return isTelegramMonitorReady(config)
    && (config[TELEGRAM_KEYS.messagesEnabled]
      || config[TELEGRAM_KEYS.mentionEnabled]
      || config[TELEGRAM_KEYS.replyEnabled]
      || hasPendingTelegramOutgoingReadTracking(config));
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

  if (!isTelegramMonitorReady(config)) return false;
  const targets = Array.isArray(config[TELEGRAM_KEYS.targets]) ? config[TELEGRAM_KEYS.targets] : [];
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
  try {
    while (true) {
      const config = await chrome.storage.local.get({
        [TELEGRAM_KEYS.token]: "",
        [TELEGRAM_KEYS.targets]: [],
        [TELEGRAM_KEYS.messagesEnabled]: true,
        [TELEGRAM_KEYS.postsEnabled]: true,
        [TELEGRAM_KEYS.mentionEnabled]: false,
        [TELEGRAM_KEYS.replyEnabled]: false,
        [TELEGRAM_KEYS.managedTopics]: [],
        telegramMentionReplyNotificationsEnabled: false,
        [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0,
        [TELEGRAM_DIRECT_TOPIC_SCAN_UNTIL_KEY]: 0,
        [TELEGRAM_KEYS.paused]: false
      });
      if (!isTelegramUpdateLongPollNeeded(config)) break;

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
          controller.signal
        );
        telegramUpdatesFailureCount = 0;
      } catch (error) {
        if (controller.signal.aborted && controller.signal.reason !== "timeout") continue;
        telegramUpdatesFailureCount += 1;
        const delayMs = Number(error?.retryAfterSeconds) > 0
          ? Math.max(1000, Number(error.retryAfterSeconds) * 1000)
          : Math.min(1000 * (2 ** Math.min(telegramUpdatesFailureCount - 1, 5)), TELEGRAM_UPDATES_RETRY_MAX_MS);
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

function getTelegramBaselineResetOptions(changes, currentConfig) {
  const defaults = {
    [TELEGRAM_KEYS.token]: "",
    [TELEGRAM_KEYS.targets]: [],
    [TELEGRAM_KEYS.messagesEnabled]: true,
    [TELEGRAM_KEYS.postsEnabled]: true,
    [TELEGRAM_KEYS.managedTopics]: [],
    [TELEGRAM_KEYS.mentionEnabled]: false,
    [TELEGRAM_KEYS.replyEnabled]: false,
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
  return {
    resetMessageBaseline: monitorBecameReady || changes[TELEGRAM_KEYS.messagesEnabled]?.newValue === true,
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
    if (config[TELEGRAM_KEYS.messagesEnabled] || hasPendingReadTracking) {
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
          await checkForNewNodeSeekActivity(config, kind);
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
      await checkRssPosts(config);
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
  const response = await fetch("https://www.nodeseek.com/api/notification/message/list", {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`NodeSeek 私信接口返回 HTTP ${response.status}`);
  const data = await response.json();
  if (data?.success !== true || !Array.isArray(data.msgArray)) {
    throw new Error("NodeSeek 私信接口响应格式异常");
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
  for (const message of changedMessages) {
    const conversationId = getConversationId(message);
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
        if (isIncoming && !allowIncoming) {
          nextCursors[conversationId] = String(incomingMessage.id);
          await chrome.storage.local.set({ [TELEGRAM_KEYS.messageCursors]: nextCursors });
          continue;
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
        const messageContent = extractTelegramMessageMedia(incomingMessage.content);
        const messageBody = messageContent.text || (messageContent.imageUrls.length ? "" : "（消息没有文本内容）");
        const isFollowedUserPost = isSystemNotification && isIncoming
          && String(incomingMessage.content || "").includes("关注的用户");
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
          { includeDirectTargets: !isOutgoing }
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

    if (waitingForTelegramSend) continue;

    nextCursors[conversationId] = latestMessageId;
    changed = true;
  }

  if (changed) await chrome.storage.local.set({ [TELEGRAM_KEYS.messageCursors]: nextCursors });
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
    const response = await fetch(`https://www.nodeseek.com${endpoint}?page=${page}`, {
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

  const unreadEntries = candidates.filter(isUnviewedMessage);
  let currentUserId = "";
  if (unreadEntries.length > 0) {
    currentUserId = String((await fetchLuckyCurrentUser("https://www.nodeseek.com/"))?.member_id || "").trim();
    if (!currentUserId) {
      throw new Error("无法确认当前 NodeSeek 账号，已跳过通知以避免误报");
    }
    if (unreadEntries.some((entry) => !normalizeTelegramActivityId(entry?.commenter_id))) {
      throw new Error("通知缺少作者 ID，已跳过发送以避免误报");
    }
  }

  // Entries from the API are newest-first; send oldest-first when a poll finds several.
  const notificationEntries = unreadEntries.reverse().filter((entry) => {
    return normalizeTelegramActivityId(entry.commenter_id) !== currentUserId;
  });
  const activityContents = await fetchTelegramActivityCommentContents(notificationEntries);
  for (const entry of notificationEntries) {
    const commentId = normalizeTelegramActivityId(entry.comment_id);
    const extracted = activityContents.get(commentId);
    const content = String(extracted?.reply || entry.content || "");
    await sendTelegramActivityNotification(config, kind, formatTelegramActivityNotification(kind, {
      ...entry,
      quote: extracted?.quote || "",
      content
    }));
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

  const result = await requestNodeSeekTelegramPage("fetch-activity-comment-contents", { comments });
  const contents = new Map((Array.isArray(result?.contents) ? result.contents : [])
    .filter((item) => normalizeTelegramActivityId(item?.commentId)
      && (typeof item?.quote === "string" || typeof item?.reply === "string"))
    .map((item) => [normalizeTelegramActivityId(item.commentId), {
      quote: String(item.quote || ""),
      reply: String(item.reply || "")
    }]));
  const missingComment = comments.find((comment) => !contents.has(comment.commentId));
  if (missingComment) throw new Error("NodeSeek 通知楼层正文缺失，稍后重试");
  return contents;
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
  const response = await fetch(TELEGRAM_RSS_URL, {
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
  for (const post of newPosts) {
    const matched = matchTelegramRssPost(post, config);
    if (matched.length > 0) {
      const board = post.categories.length > 0 ? post.categories.join("、") : "未标注";
      await sendTelegramActivityNotification(
        config,
        "rss",
        `NodeSeek 新帖\n板块：${board}\n${post.title}\n命中：${matched.join("、")}\n${post.link}`
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
      return { id, title, link, categories: categoryValues };
    })
    .filter((post) => post.id && post.title && isSafeNodeSeekPostUrl(post.link));
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
    const terms = rule.terms.map((term) => String(term || "").trim()).filter(Boolean);
    const excludedTerms = Array.isArray(rule.excludeTerms)
      ? rule.excludeTerms.map((term) => String(term || "").trim()).filter(Boolean)
      : [];
    if (excludedTerms.some((term) => text.includes(term.toLocaleLowerCase()))) continue;
    const checks = terms.map((term) => text.includes(term.toLocaleLowerCase()));
    const hit = terms.length > 0 && (rule.mode === "all" ? checks.every(Boolean) : checks.some(Boolean));
    if (hit) terms.forEach((term, index) => { if (checks[index]) matched.add(term); });
  }
  return [...matched];
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
  const conversationCursor = Object.entries(cursorState[TELEGRAM_KEYS.messageCursors] || {})
    .find(([conversationId]) => conversationId.split(":").includes(userId))?.[1];
  const stored = await chrome.storage.local.get({ [TELEGRAM_KEYS.outgoingMessageEchoes]: [] });
  const echoes = (Array.isArray(stored[TELEGRAM_KEYS.outgoingMessageEchoes])
    ? stored[TELEGRAM_KEYS.outgoingMessageEchoes] : [])
    .filter((echo) => echo?.userId && echo?.fingerprint
      && now - Number(echo.createdAt) <= TELEGRAM_OUTGOING_ECHO_TTL_MS);
  const id = crypto.randomUUID();
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
    if (match.status === "sending") return { pending: true };
    echoes.splice(matchIndex, 1);
    await chrome.storage.local.set({ [TELEGRAM_KEYS.outgoingMessageEchoes]: echoes });
    return { record: match };
  } catch (_error) {
    return null;
  }
}

async function fetchNodeSeekConversationMessages(userIdValue) {
  const userId = String(userIdValue || "").trim();
  const response = await fetch(
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
    const response = await fetch(`https://api.telegram.org/bot${token}/editForumTopic`, {
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
    const response = await fetch(`https://api.telegram.org/bot${token}/getForumTopicIconStickers`);
    const result = await response.json();
    if (!response.ok || result?.ok !== true || !Array.isArray(result.result)) return "";
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
  const result = await requestNodeSeekTelegramPage("fetch-system-post-content", reference);
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

async function sendTelegramToTargets(config, text) {
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
  for (const target of targets) await sendTelegramMessage(config[TELEGRAM_KEYS.token], target, text);
}

async function sendTelegramPrivateMessageToTopics(
  config,
  userId,
  userName,
  topicText,
  fallbackText,
  topicKind = "dm",
  imageUrls = [],
  { includeDirectTargets = true } = {}
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
      await sendTelegramToTargets(config, fallbackText);
      return deliveredTopics;
    }
    const targetKeys = new Set();
    for (const target of targets) {
      const key = `${String(target.chatId).trim()}:${String(target.topicId || "").trim()}`;
      if (targetKeys.has(key)) continue;
      targetKeys.add(key);
      await sendTelegramPrivateMessageContent(config[TELEGRAM_KEYS.token], target, fallbackText, imageUrls);
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
      imageUrls
    );
    deliveredTopics.push({ chatId: String(target.chatId), topicId: String(topic.topicId), name: topic.name });
  }
  for (const target of otherTargets) {
    await sendTelegramPrivateMessageContent(config[TELEGRAM_KEYS.token], target, fallbackText, imageUrls);
  }
  return deliveredTopics;
}

async function sendTelegramPrivateMessageContent(token, target, text, imageUrls = []) {
  const urls = [...new Set((Array.isArray(imageUrls) ? imageUrls : []).map((url) => String(url || "").trim()).filter(Boolean))];
  if (urls.length === 0) {
    await sendTelegramMessage(token, target, text);
    return;
  }

  const messageText = String(text || "").trim();
  const canUseCaption = messageText.length > 0 && messageText.length <= 1024;
  let textSent = false;
  for (const [index, url] of urls.entries()) {
    const caption = index === 0 && canUseCaption ? messageText : "";
    try {
      await sendTelegramPhoto(token, target, url, caption);
      if (caption) textSent = true;
    } catch (_error) {
      const fallbackText = [caption, `图片链接：${url}`].filter(Boolean).join("\n");
      await sendTelegramMessage(token, target, fallbackText);
      if (caption) textSent = true;
    }
  }
  if (messageText && !textSent) await sendTelegramMessage(token, target, messageText);
}

async function sendTelegramActivityNotification(config, kind, text) {
  const targets = (Array.isArray(config[TELEGRAM_KEYS.targets]) ? config[TELEGRAM_KEYS.targets] : [])
    .filter((target) => target?.enabled !== false && target?.chatId);
  if (targets.length === 0) throw new Error("没有启用的 Telegram 推送目标");
  const personalTargets = targets.filter((target) => target.type !== "direct");
  const otherTargets = targets.filter((target) => target.type === "direct");

  if (personalTargets.length === 0) {
    await sendTelegramToTargets(config, text);
    return;
  }

  for (const target of personalTargets) {
    const topicKind = kind === "at" ? "mention" : kind;
    const topic = await getOrCreateManagedTelegramTopic(config[TELEGRAM_KEYS.token], target.chatId, topicKind);
    await sendTelegramMessage(config[TELEGRAM_KEYS.token], { ...target, topicId: topic.topicId }, text);
  }
  for (const target of otherTargets) await sendTelegramMessage(config[TELEGRAM_KEYS.token], target, text);
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
    const response = await fetch(`https://api.telegram.org/bot${token}/editForumTopic`, {
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
  const response = await fetch(`https://api.telegram.org/bot${token}/createForumTopic`, {
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
  signal = undefined
) {
  if (telegramUpdatesCheckInFlight) throw new Error("Telegram 更新正在读取，请稍后重试");
  const token = String(tokenValue || "").trim();
  if (!token) throw new Error("请先填写 Bot Token");
  telegramUpdatesCheckInFlight = true;
  try {
    const state = await chrome.storage.local.get({ [TELEGRAM_PERSONAL_START_OFFSET_KEY]: 0 });
    const storedOffset = Number(state[TELEGRAM_PERSONAL_START_OFFSET_KEY]) || 0;
    const requestedOffset = Number.isSafeInteger(Number(requestedOffsetValue)) ? Number(requestedOffsetValue) : 0;
    const offset = Math.max(storedOffset, requestedOffset);
    const offsetParam = offset > 0 ? `&offset=${offset}` : "";
    const allowedUpdates = encodeURIComponent(JSON.stringify(["message", "channel_post"]));
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?limit=100&timeout=${Math.max(0, Math.floor(Number(timeoutSeconds) || 0))}&allowed_updates=${allowedUpdates}${offsetParam}`,
      signal ? { signal } : undefined
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
    await processTelegramPersonalStartUpdateIfWatching(token, updates);
    await processTelegramManagedTopicUpdates(token, updates);
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

async function processTelegramPersonalStartUpdateIfWatching(token, updates) {
  const watch = await chrome.storage.local.get({
    [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0,
    [TELEGRAM_PERSONAL_START_WATCH_SINCE_KEY]: 0
  });
  if (Number(watch[TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]) <= Date.now()) return;
  const update = findTelegramPersonalStartUpdate(
    updates,
    Number(watch[TELEGRAM_PERSONAL_START_WATCH_SINCE_KEY]) || 0
  );
  if (update) await registerTelegramPersonalStartUpdate(token, update);
}

async function processTelegramManagedTopicUpdates(token, updates) {
  const stored = await chrome.storage.local.get({
    [TELEGRAM_KEYS.managedTopics]: [],
    [TELEGRAM_KEYS.processedTopicUpdates]: [],
    [TELEGRAM_KEYS.pendingTopicImageMarkdowns]: {},
    [TELEGRAM_KEYS.pendingTopicReadUserIds]: []
  });
  const topics = Array.isArray(stored[TELEGRAM_KEYS.managedTopics]) ? stored[TELEGRAM_KEYS.managedTopics] : [];
  const topicByKey = new Map(topics
    .filter((topic) => topic.kind === "dm" && topic.chatId && topic.topicId && topic.nsUserId)
    .map((topic) => [`${String(topic.chatId)}:${String(topic.topicId)}`, topic]));
  const processedUpdateIds = new Set((Array.isArray(stored[TELEGRAM_KEYS.processedTopicUpdates])
    ? stored[TELEGRAM_KEYS.processedTopicUpdates] : []).map(String));
  const pendingImageMarkdowns = { ...(stored[TELEGRAM_KEYS.pendingTopicImageMarkdowns] || {}) };
  const pendingReads = new Set((Array.isArray(stored[TELEGRAM_KEYS.pendingTopicReadUserIds])
    ? stored[TELEGRAM_KEYS.pendingTopicReadUserIds] : []).map(String));

  for (const userId of [...pendingReads]) {
    await markNodeSeekConversationRead(userId);
    pendingReads.delete(userId);
    await chrome.storage.local.set({ [TELEGRAM_KEYS.pendingTopicReadUserIds]: [...pendingReads] });
  }

  const orderedUpdates = [...updates].sort((a, b) => Number(a.update_id) - Number(b.update_id));
  for (const updateGroup of groupTelegramManagedTopicUpdates(orderedUpdates)) {
    const pendingUpdates = updateGroup.filter((update) => {
      const updateId = String(Number(update?.update_id) || "");
      return updateId && !processedUpdateIds.has(updateId);
    });
    if (pendingUpdates.length === 0) continue;

    const messages = pendingUpdates.map((update) => update?.message).filter(Boolean);
    const message = messages[0];
    const topicId = String(message?.message_thread_id || "");
    const chatId = String(message?.chat?.id || "");
    const topic = topicByKey.get(`${chatId}:${topicId}`);
    if (!topic || message?.chat?.type !== "private" || !message?.from || message.from.is_bot === true) continue;

    const text = [...new Set(messages
      .map((item) => String(item.text || item.caption || "").trim())
      .filter(Boolean))].join("\n\n");
    const images = pendingUpdates.map((update) => ({
      updateId: String(Number(update?.update_id) || ""),
      image: getTelegramMessageImage(update?.message)
    })).filter((item) => item.updateId && item.image);
    if (!text && images.length === 0) {
      await sendTelegramMessage(token, { type: "personal", chatId, topicId }, "目前支持文字和图片私信；这条消息类型暂不支持。");
      for (const update of pendingUpdates) {
        processedUpdateIds.add(String(Number(update?.update_id) || ""));
      }
      await chrome.storage.local.set({
        [TELEGRAM_KEYS.processedTopicUpdates]: [...processedUpdateIds].slice(-500)
      });
      continue;
    }

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
        const reason = String(error?.message || error || "图片上传失败").slice(0, 300);
        const failureMessage = error?.code === "TELEGRAM_IMAGE_UPLOAD_DISABLED"
          ? "图片未发送到 NodeSeek：请在扩展设置的「图床配置」中开启图床上传，然后重新发送图片。"
          : `图片上传失败，未发送到 NodeSeek：${reason}`;
        await sendTelegramMessage(
          token,
          { type: "personal", chatId, topicId },
          failureMessage
        );
        for (const update of pendingUpdates) {
          const updateId = String(Number(update?.update_id) || "");
          if (updateId) {
            processedUpdateIds.add(updateId);
            delete pendingImageMarkdowns[updateId];
          }
        }
        await chrome.storage.local.set({
          [TELEGRAM_KEYS.processedTopicUpdates]: [...processedUpdateIds].slice(-500),
          [TELEGRAM_KEYS.pendingTopicImageMarkdowns]: pendingImageMarkdowns
        });
        continue;
      }
    }

    const content = [text, ...imageMarkdowns].filter(Boolean).join("\n\n");
    const echoId = await rememberTelegramOutgoingEcho(topic.nsUserId, content, {
      chatId,
      topicId,
      topicName: topic.name
    });
    try {
      await sendNodeSeekPrivateMessage(topic.nsUserId, content, imageMarkdowns.length > 0);
      await updateTelegramOutgoingEchoStatus(echoId, "sent");
    } catch (error) {
      await discardTelegramOutgoingEcho(echoId);
      throw error;
    }
    scheduleTelegramMonitorAlarm({ checkImmediately: true }).catch(() => {});
    for (const update of pendingUpdates) {
      const updateId = String(Number(update?.update_id) || "");
      if (updateId) {
        processedUpdateIds.add(updateId);
        delete pendingImageMarkdowns[updateId];
      }
    }
    pendingReads.add(String(topic.nsUserId));
    await chrome.storage.local.set({
      [TELEGRAM_KEYS.processedTopicUpdates]: [...processedUpdateIds].slice(-500),
      [TELEGRAM_KEYS.pendingTopicImageMarkdowns]: pendingImageMarkdowns,
      [TELEGRAM_KEYS.pendingTopicReadUserIds]: [...pendingReads]
    });
    await markNodeSeekConversationRead(topic.nsUserId);
    pendingReads.delete(String(topic.nsUserId));
    await chrome.storage.local.set({ [TELEGRAM_KEYS.pendingTopicReadUserIds]: [...pendingReads] });
  }
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

  const fileInfoResponse = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(image.fileId)}`
  );
  const fileInfo = await fileInfoResponse.json();
  const filePath = String(fileInfo?.result?.file_path || "");
  if (!fileInfoResponse.ok || !fileInfo?.ok || !filePath) {
    throw new Error(fileInfo?.description || `读取 Telegram 图片失败（HTTP ${fileInfoResponse.status}）`);
  }

  const encodedFilePath = filePath.split("/").map(encodeURIComponent).join("/");
  const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${encodedFilePath}`, { credentials: "omit" });
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

async function requestNodeSeekTelegramPage(operation, payload = {}) {
  const matchingTabs = await chrome.tabs.query({ url: "https://www.nodeseek.com/*" });
  let tab = matchingTabs.find((candidate) => candidate.status === "complete") || matchingTabs[0] || null;
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
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: "telegram:nodeSeekPageRequest",
          payload: { operation, ...payload }
        });
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
    throw new Error(lastError?.message || "无法连接 NodeSeek 页面");
  } finally {
    if (createdTabId) await chrome.tabs.remove(createdTabId).catch(() => {});
  }
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
    [TELEGRAM_KEYS.managedTopics]: []
  });
  const token = String(config[TELEGRAM_KEYS.token] || "").trim();
  if (!token) throw new Error("请先设置有效的 Bot Token");
  const topics = Array.isArray(config[TELEGRAM_KEYS.managedTopics]) ? config[TELEGRAM_KEYS.managedTopics] : [];
  const deleting = topics.filter((topic) => selectedIds.has(String(topic.id)));
  const retained = topics.filter((topic) => !selectedIds.has(String(topic.id)));
  const failed = [];
  let deleted = 0;

  for (const topic of deleting) {
    const response = await fetch(`https://api.telegram.org/bot${token}/deleteForumTopic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: topic.chatId, message_thread_id: Number(topic.topicId) })
    });
    const result = await response.json();
    if (!response.ok || !result?.ok) {
      failed.push({ id: topic.id, name: topic.name, error: result?.description || `HTTP ${response.status}` });
      retained.push(topic);
      continue;
    }
    deleted += 1;
  }

  await chrome.storage.local.set({ [TELEGRAM_KEYS.managedTopics]: retained });
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
    response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
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
    const reply = targetAdded
      ? existingTarget ? "这个聊天已在插件的推送目标中。" : "设置成功，请返回插件查看"
      : "推送目标已满，请返回插件移除一个目标后重试。";
    await sendTelegramMessage(token, { type: "personal", chatId }, reply);
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
  const channelResponse = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(channelLookupId)}`);
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
    const directChatResponse = await fetch(
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

async function sendTelegramPhoto(tokenValue, target, photoUrl, caption = "") {
  const token = String(tokenValue || "").trim();
  const url = String(photoUrl || "").trim();
  if (!token || !target?.chatId) throw new Error("请填写 Bot Token 和目标 Chat ID");
  if (!/^https?:\/\//i.test(url)) throw new Error("NodeSeek 图片链接无效");
  const payload = addTelegramTargetTopic({
    chat_id: target.chatId,
    photo: url,
    ...(caption ? { caption: String(caption).slice(0, 1024) } : {})
  }, target);
  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok || !result?.ok) {
    throw new Error(result?.description || `Telegram 图片发送失败（HTTP ${response.status}）`);
  }
}

async function sendTelegramMessage(tokenValue, target, text, entities = null) {
  const token = String(tokenValue || "").trim();
  if (!token || !target?.chatId) throw new Error("请填写 Bot Token 和目标 Chat ID");
  const payload = addTelegramTargetTopic({
    chat_id: target.chatId,
    text: String(text || "").slice(0, 4000),
    disable_web_page_preview: true,
    ...(Array.isArray(entities) && entities.length ? { entities } : {})
  }, target);
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok || !result?.ok) {
    throw new Error(result?.description || `Telegram 返回 HTTP ${response.status}`);
  }
}
