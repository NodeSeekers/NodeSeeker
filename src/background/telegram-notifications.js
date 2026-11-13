const TELEGRAM_KEYS = {
  token: "telegramBotToken",
  targets: "telegramTargets",
  messagesEnabled: "telegramMessageNotificationsEnabled",
  postsEnabled: "telegramPostNotificationsEnabled",
  keywords: "telegramKeywordRules",
  blockedKeywords: "telegramBlockedKeywords",
  boards: "telegramBoardSlugs",
  messageCursors: "telegramMessageCursors",
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
const TELEGRAM_PERSONAL_START_WATCH_DURATION_MS = 5 * 60 * 1000;
const TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY = "telegramPersonalStartWatchUntil";
const TELEGRAM_PERSONAL_START_WATCH_SINCE_KEY = "telegramPersonalStartWatchSince";
const TELEGRAM_PERSONAL_START_REPLIED_UPDATE_ID_KEY = "telegramPersonalStartRepliedUpdateId";
const TELEGRAM_PERSONAL_START_OFFSET_KEY = "telegramPersonalStartOffset";
const TELEGRAM_PENDING_DIRECT_TOPICS_KEY = "telegramPendingDirectTopics";
const TELEGRAM_PENDING_PERSONAL_CHAT_ID_KEY = "telegramPendingPersonalChatId";
const TELEGRAM_PENDING_PERSONAL_TARGET_NAME_KEY = "telegramPendingPersonalTargetName";
let telegramPersonalStartCheckInFlight = false;
let telegramMonitorCheckInFlight = false;
const TELEGRAM_DIRECT_MESSAGE_URL = "https://www.nodeseek.com/notification#/message?mode=list";
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
      return "该机器人已配置 Webhook。插件可以直接发送通知；自动读取 ID 使用 getUpdates，Telegram 不允许它与 Webhook 同时接收更新。";
    }
  } catch (_error) {
    // Keep the fallback message useful if Telegram cannot return webhook status.
  }
  return "Telegram 暂时检测到另一个 getUpdates 请求。这个冲突只影响自动读取 ID，不影响插件直接发送通知；稍后重试即可。";
}

async function scheduleTelegramMonitorAlarm(resetMessageBaseline = false) {
  const config = await chrome.storage.local.get({
    [TELEGRAM_KEYS.token]: "",
    [TELEGRAM_KEYS.targets]: [],
    [TELEGRAM_KEYS.messagesEnabled]: true,
    [TELEGRAM_KEYS.postsEnabled]: true,
    [TELEGRAM_KEYS.paused]: false
  });
  const targets = Array.isArray(config[TELEGRAM_KEYS.targets]) ? config[TELEGRAM_KEYS.targets] : [];
  const hasTarget = targets.some((target) => target?.enabled !== false && target?.chatId);
  const ready = config[TELEGRAM_KEYS.token].trim() && hasTarget
    && !config[TELEGRAM_KEYS.paused]
    && (config[TELEGRAM_KEYS.messagesEnabled] || config[TELEGRAM_KEYS.postsEnabled]);

  if (!ready) {
    await chrome.alarms.clear(TELEGRAM_MESSAGE_ALARM_NAME);
    return;
  }

  if (resetMessageBaseline) {
    await chrome.storage.local.remove(TELEGRAM_KEYS.messageCursors);
  }
  chrome.alarms.create(TELEGRAM_MESSAGE_ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: 1
  });
  if (resetMessageBaseline) {
    checkTelegramNotifications().catch((error) => {
      console.warn("Telegram baseline failed:", error?.message || "unknown error");
    });
  }
}

async function checkTelegramNotifications() {
  if (telegramMonitorCheckInFlight) return;
  telegramMonitorCheckInFlight = true;
  try {
    const config = await chrome.storage.local.get({
      [TELEGRAM_KEYS.token]: "",
      [TELEGRAM_KEYS.targets]: [],
      [TELEGRAM_KEYS.messagesEnabled]: true,
      [TELEGRAM_KEYS.postsEnabled]: true,
      [TELEGRAM_KEYS.keywords]: [],
      [TELEGRAM_KEYS.blockedKeywords]: [],
      [TELEGRAM_KEYS.boards]: [],
      [TELEGRAM_KEYS.messageCursors]: null,
      [TELEGRAM_KEYS.rssSeenIds]: [],
      [TELEGRAM_KEYS.rssInitialized]: false,
      [TELEGRAM_KEYS.rssHistory]: [],
      [TELEGRAM_KEYS.paused]: false
    });
    const hasEnabledTarget = Array.isArray(config[TELEGRAM_KEYS.targets])
      && config[TELEGRAM_KEYS.targets].some((target) => target?.enabled !== false && target?.chatId);
    if (!config[TELEGRAM_KEYS.token].trim() || config[TELEGRAM_KEYS.paused] || !hasEnabledTarget) return;

    const errors = [];
    if (config[TELEGRAM_KEYS.messagesEnabled]) {
      try {
        await checkForNewNodeSeekMessages(config);
      } catch (error) {
        errors.push(`私信：${error?.message || "检查失败"}`);
      }
    }
    if (config[TELEGRAM_KEYS.postsEnabled]) {
      try {
        await checkRssPosts(config);
      } catch (error) {
        errors.push(`RSS：${error?.message || "检查失败"}`);
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

async function checkForNewNodeSeekMessages(config) {
  const response = await fetch("https://www.nodeseek.com/api/notification/message/list", {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`NodeSeek 私信接口返回 HTTP ${response.status}`);
  const data = await response.json();
  if (data?.success !== true || !Array.isArray(data.msgArray)) {
    throw new Error("NodeSeek 私信接口响应格式异常");
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
  const currentUserId = changedMessages.some(isUnviewedMessage)
    ? String((await fetchLuckyCurrentUser("https://www.nodeseek.com/"))?.member_id || "").trim()
    : "";
  if (changedMessages.some(isUnviewedMessage) && !currentUserId) {
    throw new Error("无法确认当前 NodeSeek 账号，已跳过私信通知以避免误报");
  }

  let changed = false;
  for (const message of changedMessages) {
    const conversationId = getConversationId(message);
    const messageId = String(message.max_id);

    const senderId = String(message.sender_id || "").trim();
    if (isUnviewedMessage(message) && senderId && senderId !== currentUserId) {
      const sender = String(message.sender_name || "NodeSeek 用户").trim();
      const body = normalizeTelegramMessageBody(message.content);
      const chatUrl = `${TELEGRAM_DIRECT_MESSAGE_URL}&to=${encodeURIComponent(String(message.sender_id || ""))}`;
      const text = `NodeSeek 新私信\n发件人：${sender}\n\n${body || "（消息没有文本内容）"}\n\n${chatUrl}`;
      await sendTelegramToTargets(config, text);
    }

    nextCursors[conversationId] = messageId;
    changed = true;
  }

  if (changed) await chrome.storage.local.set({ [TELEGRAM_KEYS.messageCursors]: nextCursors });
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
      await sendTelegramToTargets(config, `NodeSeek 新帖\n板块：${board}\n${post.title}\n命中：${matched.join("、")}\n${post.link}`);
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

function isUnviewedMessage(message) {
  return message?.viewed === false || message?.viewed === 0;
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
    delayInMinutes: 0.5,
    periodInMinutes: 0.5
  });
}

async function stopTelegramPersonalStartWatch() {
  await chrome.alarms.clear(TELEGRAM_PERSONAL_START_ALARM_NAME);
  await chrome.storage.local.set({ [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0 });
}

async function checkTelegramPersonalStartWatch() {
  if (telegramPersonalStartCheckInFlight) return;
  telegramPersonalStartCheckInFlight = true;
  try {
    const config = await chrome.storage.local.get({
      [TELEGRAM_KEYS.token]: "",
      [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0
    });
    const token = String(config[TELEGRAM_KEYS.token] || "").trim();
    const watchUntil = Number(config[TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]) || 0;
    if (!watchUntil) return;
    if (!token || Date.now() >= watchUntil) {
      await chrome.alarms.clear(TELEGRAM_PERSONAL_START_ALARM_NAME);
      await chrome.storage.local.set({ [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0 });
      if (token) chrome.runtime.sendMessage({ type: "telegram:personalStartWatchTimeout" }).catch(() => {});
      return;
    }

    for (let batchIndex = 0; batchIndex < 5; batchIndex += 1) {
      const state = await chrome.storage.local.get({
        [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0,
        [TELEGRAM_PERSONAL_START_WATCH_SINCE_KEY]: 0,
        [TELEGRAM_PERSONAL_START_OFFSET_KEY]: 0
      });
      if (Number(state[TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]) <= Date.now()) return;
      const offset = Number(state[TELEGRAM_PERSONAL_START_OFFSET_KEY]) || 0;
      const offsetParam = offset > 0 ? `&offset=${offset}` : "";
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100&timeout=0&allowed_updates=%5B%22message%22%5D${offsetParam}`);
      const result = await response.json();
      if (!response.ok || !result?.ok) {
        if (response.status === 409) {
          const error = await getTelegramUpdateConflictMessage(token);
          await chrome.alarms.clear(TELEGRAM_PERSONAL_START_ALARM_NAME);
          await chrome.storage.local.set({ [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0 });
          chrome.runtime.sendMessage({ type: "telegram:personalStartWatchError", error }).catch(() => {});
          return;
        }
        throw new Error(result?.description || `Telegram 返回 HTTP ${response.status}`);
      }
      const updates = Array.isArray(result.result) ? result.result : [];
      await cacheTelegramDirectTopicUpdates(updates);
      const lastUpdateId = updates.reduce((last, item) => Math.max(last, Number(item.update_id) || 0), 0);
      if (lastUpdateId > 0) {
        await chrome.storage.local.set({ [TELEGRAM_PERSONAL_START_OFFSET_KEY]: lastUpdateId + 1 });
      }
      const update = findTelegramPersonalStartUpdate(
        updates,
        Number(state[TELEGRAM_PERSONAL_START_WATCH_SINCE_KEY]) || 0
      );
      if (update) {
        await registerTelegramPersonalStartUpdate(token, update);
        return;
      }
      if (updates.length < 100) return;
    }
  } finally {
    telegramPersonalStartCheckInFlight = false;
  }
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

  const allowedUpdates = encodeURIComponent(JSON.stringify(["message", "channel_post"]));
  const cursor = await chrome.storage.local.get({ [TELEGRAM_PERSONAL_START_OFFSET_KEY]: 0 });
  const offset = Math.max(
    Number.isSafeInteger(Number(updateOffsetValue)) ? Number(updateOffsetValue) : 0,
    Number(cursor[TELEGRAM_PERSONAL_START_OFFSET_KEY]) || 0
  );
  const offsetParam = offset > 0 ? `&offset=${offset}` : "";
  const updatesResponse = await fetch(
    `https://api.telegram.org/bot${token}/getUpdates?limit=100&timeout=0&allowed_updates=${allowedUpdates}${offsetParam}`
  );
  const updatesResult = await updatesResponse.json();
  if (!updatesResponse.ok || !updatesResult?.ok) {
    if (updatesResponse.status === 409) {
      throw new Error(await getTelegramUpdateConflictMessage(token));
    }
    throw new Error(updatesResult?.description || `Telegram 返回 HTTP ${updatesResponse.status}`);
  }
  const updates = Array.isArray(updatesResult.result) ? updatesResult.result : [];
  await cacheTelegramDirectTopicUpdates(updates);
  const personalWatch = await chrome.storage.local.get({
    [TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]: 0,
    [TELEGRAM_PERSONAL_START_WATCH_SINCE_KEY]: 0
  });
  if (Number(personalWatch[TELEGRAM_PERSONAL_START_WATCH_UNTIL_KEY]) > Date.now()) {
    const personalStartUpdate = findTelegramPersonalStartUpdate(
      updates,
      Number(personalWatch[TELEGRAM_PERSONAL_START_WATCH_SINCE_KEY]) || 0
    );
    if (personalStartUpdate) await registerTelegramPersonalStartUpdate(token, personalStartUpdate);
  }
  const lastUpdateId = updates.length > 0
    ? Math.max(...updates.map((update) => Number(update.update_id) || 0))
    : 0;
  const nextOffset = lastUpdateId > 0 ? lastUpdateId + 1 : null;
  if (lastUpdateId > 0) {
    await chrome.storage.local.set({
      [TELEGRAM_PERSONAL_START_OFFSET_KEY]: Math.max(offset, lastUpdateId + 1)
    });
  }

  const cachedTopics = await chrome.storage.local.get({ [TELEGRAM_PENDING_DIRECT_TOPICS_KEY]: [] });
  const directMessagesById = new Map();
  for (const topic of [
    ...extractTelegramDirectTopicUpdates(updates),
    ...(Array.isArray(cachedTopics[TELEGRAM_PENDING_DIRECT_TOPICS_KEY]) ? cachedTopics[TELEGRAM_PENDING_DIRECT_TOPICS_KEY] : [])
  ]) {
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
      updatesRead: updates.length,
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
  return { topics, nextOffset, updatesRead: updates.length };
}

async function sendTelegramMessage(tokenValue, target, text) {
  const token = String(tokenValue || "").trim();
  if (!token || !target?.chatId) throw new Error("请填写 Bot Token 和目标 Chat ID");
  const payload = {
    chat_id: target.chatId,
    text: String(text || "").slice(0, 4000),
    disable_web_page_preview: true
  };
  if (target.type === "direct") {
    if (!target.topicId) throw new Error("频道 Direct 目标缺少主题 ID");
    if (!/^-?\d+$/.test(String(target.chatId))) {
      throw new Error("Direct 目标缺少 Direct Chat ID；请重新读取 Direct 主题并添加目标");
    }
    payload.direct_messages_topic_id = Number(target.topicId);
  }
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
