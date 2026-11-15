const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/background/telegram-notifications.js"), "utf8");

function createSandbox(fetch = global.fetch) {
  const sandbox = vm.createContext({
    crypto: webcrypto,
    TextEncoder,
    URL,
    Set,
    Object,
    String,
    Number,
    encodeURIComponent,
    setTimeout,
    clearTimeout,
    AbortController,
    TELEGRAM_MESSAGE_ALARM_NAME: "nshTelegram:monitor",
    TELEGRAM_FAST_MONITOR_ALARM_NAMES: [
      "nshTelegram:monitor-10s-1",
      "nshTelegram:monitor-10s-2",
      "nshTelegram:monitor-10s-3"
    ],
    TELEGRAM_RSS_ALARM_NAME: "nshTelegram:rss",
    TELEGRAM_UPDATES_WATCHDOG_ALARM_NAME: "nshTelegram:updates-watchdog",
    TELEGRAM_PERSONAL_START_ALARM_NAME: "nshTelegram:personal-start",
    fetch
  });
  vm.runInContext(source, sandbox);
  return sandbox;
}

test("Telegram baselines reset for a re-enabled child or a newly ready monitor", () => {
  const sandbox = createSandbox();
  const target = { type: "personal", chatId: "333", enabled: true };
  const config = {
    telegramBotToken: "123456:secret",
    telegramTargets: [target],
    telegramMessageNotificationsEnabled: true,
    telegramPostNotificationsEnabled: true,
    telegramMentionNotificationsEnabled: true,
    telegramReplyNotificationsEnabled: true,
    telegramMonitorPaused: false
  };
  const replyEnabled = vm.runInContext(`getTelegramBaselineResetOptions(
    ${JSON.stringify({ telegramReplyNotificationsEnabled: { oldValue: false, newValue: true } })},
    ${JSON.stringify(config)}
  )`, sandbox);
  expect(replyEnabled).toEqual({
    resetMessageBaseline: false,
    resetPostBaseline: false,
    resetMentionBaseline: false,
    resetReplyBaseline: true
  });

  const postsEnabled = vm.runInContext(`getTelegramBaselineResetOptions(
    ${JSON.stringify({ telegramPostNotificationsEnabled: { oldValue: false, newValue: true } })},
    ${JSON.stringify(config)}
  )`, sandbox);
  expect(postsEnabled).toEqual({
    resetMessageBaseline: false,
    resetPostBaseline: true,
    resetMentionBaseline: false,
    resetReplyBaseline: false
  });

  const monitorResumed = vm.runInContext(`getTelegramBaselineResetOptions(
    ${JSON.stringify({ telegramMonitorPaused: { oldValue: true, newValue: false } })},
    ${JSON.stringify(config)}
  )`, sandbox);
  expect(monitorResumed).toEqual({
    resetMessageBaseline: true,
    resetPostBaseline: true,
    resetMentionBaseline: true,
    resetReplyBaseline: true
  });

  const targetRestored = vm.runInContext(`getTelegramBaselineResetOptions(
    ${JSON.stringify({ telegramTargets: { oldValue: [], newValue: [target] } })},
    ${JSON.stringify(config)}
  )`, sandbox);
  expect(targetRestored).toEqual({
    resetMessageBaseline: true,
    resetPostBaseline: true,
    resetMentionBaseline: true,
    resetReplyBaseline: true
  });
});

test("Telegram monitor rebaseline clears RSS seen IDs and immediately checks", async () => {
  const stored = {
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }],
    telegramMessageNotificationsEnabled: false,
    telegramPostNotificationsEnabled: true,
    telegramMentionNotificationsEnabled: false,
    telegramReplyNotificationsEnabled: false,
    telegramMonitorIntervalSeconds: 30,
    telegramMonitorPaused: false,
    telegramRssSeenIds: ["old-post"],
    telegramRssInitialized: true,
    telegramRssHistory: [{ id: "preserved-history" }]
  };
  let rssChecks = 0;
  const alarms = [];
  const sandbox = createSandbox();
  sandbox.checkTelegramRssNotifications = () => {
    rssChecks += 1;
    return Promise.resolve();
  };
  sandbox.chrome = {
    storage: { local: {
      get: async (defaults) => ({ ...defaults, ...stored }),
      set: async (values) => Object.assign(stored, values),
      remove: async () => {}
    } },
    alarms: {
      clear: async () => {},
      create: async (...args) => { alarms.push(args); }
    }
  };

  await vm.runInContext("scheduleTelegramMonitorAlarm({ resetPostBaseline: true })", sandbox);

  expect(stored.telegramRssSeenIds).toEqual([]);
  expect(stored.telegramRssInitialized).toBe(false);
  expect(stored.telegramRssHistory).toEqual([{ id: "preserved-history" }]);
  expect(rssChecks).toBe(1);
  expect(alarms).toContainEqual(["nshTelegram:rss", { delayInMinutes: 0.5, periodInMinutes: 0.5 }]);
});

test("Telegram update check preserves established baselines", async () => {
  const stored = {
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }],
    telegramMessageNotificationsEnabled: false,
    telegramPostNotificationsEnabled: true,
    telegramMentionNotificationsEnabled: false,
    telegramReplyNotificationsEnabled: false,
    telegramMonitorPaused: false,
    telegramMonitorIntervalSeconds: 60,
    telegramMessageCursors: { "conversation": "last-message" },
    telegramRssSeenIds: ["known-post"],
    telegramRssInitialized: true
  };
  let rssChecks = 0;
  const removedKeys = [];
  const sandbox = createSandbox();
  sandbox.checkTelegramRssNotifications = () => {
    rssChecks += 1;
    return Promise.resolve();
  };
  sandbox.chrome = {
    storage: { local: {
      get: async (defaults) => ({ ...defaults, ...stored }),
      set: async (values) => Object.assign(stored, values),
      remove: async (keys) => { removedKeys.push(keys); }
    } },
    alarms: { clear: async () => {}, create: async () => {} }
  };

  await vm.runInContext("scheduleTelegramMonitorAlarm({ checkImmediately: true })", sandbox);

  expect(rssChecks).toBe(1);
  expect(removedKeys).toEqual([]);
  expect(stored.telegramMessageCursors).toEqual({ conversation: "last-message" });
  expect(stored.telegramRssSeenIds).toEqual(["known-post"]);
  expect(stored.telegramRssInitialized).toBe(true);
});

test("first reply check establishes baseline without sending existing unread replies", async () => {
  const entry = { id: 321, viewed: 0, commenter_id: 123, post_id: 456, title: "existing reply" };
  const stored = { telegramMentionReplyCursors: {} };
  const requestedUrls = [];
  let sentCount = 0;
  const sandbox = createSandbox(async (url) => {
    requestedUrls.push(url);
    return { ok: true, json: async () => ({ success: true, data: [entry] }) };
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  sandbox.sendTelegramToTargets = async () => { sentCount += 1; };

  await vm.runInContext('checkForNewNodeSeekActivity({ telegramBotToken: "token", telegramTargets: [] }, "reply")', sandbox);

  expect(requestedUrls).toEqual(["https://www.nodeseek.com/api/notification/reply-to-me/list?page=1"]);
  expect(sentCount).toBe(0);
  expect(stored.telegramMentionReplyCursors.reply).toEqual({ initialized: true, ids: ["321"] });
});

test("RSS parser extracts NodeSeek post IDs, links, titles, and board names", () => {
  const sandbox = createSandbox();
  const xml = `<rss><channel><item><title><![CDATA[v.ps with gen2]]></title>
    <link>https://www.nodeseek.com/post-12345-1</link>
    <guid>https://www.nodeseek.com/post-12345-1</guid><category>日常</category></item></channel></rss>`;
  const posts = vm.runInContext(`parseNodeSeekRss(${JSON.stringify(xml)})`, sandbox);

  expect(posts).toEqual([{
    id: "12345",
    title: "v.ps with gen2",
    link: "https://www.nodeseek.com/post-12345-1",
    categories: ["日常"]
  }]);
});

test("RSS filters support AND terms, blocked words, and board scopes", () => {
  const sandbox = createSandbox();
  const post = { title: "v.ps gen2 家人", categories: ["日常"] };
  const config = {
    telegramKeywordRules: [
      { terms: ["v.ps", "gen2"], mode: "all" },
      { terms: ["家人"], mode: "any" }
    ],
    telegramBlockedKeywords: [],
    telegramBoardSlugs: ["daily"]
  };
  const matches = vm.runInContext(`matchTelegramRssPost(${JSON.stringify(post)}, ${JSON.stringify(config)})`, sandbox);
  expect(matches).toEqual(["v.ps", "gen2", "家人"]);

  const blocked = { ...config, telegramBlockedKeywords: ["家人"] };
  expect(vm.runInContext(`matchTelegramRssPost(${JSON.stringify(post)}, ${JSON.stringify(blocked)})`, sandbox)).toEqual([]);
  const otherBoard = { ...config, telegramBoardSlugs: ["trade"] };
  expect(vm.runInContext(`matchTelegramRssPost(${JSON.stringify(post)}, ${JSON.stringify(otherBoard)})`, sandbox)).toEqual([]);
});

test("RSS keyword rules support any/all matches and rule-specific excluded terms", () => {
  const sandbox = createSandbox();
  const post = { title: "v.ps gen2 家人 促销", categories: ["日常"] };
  const config = {
    telegramKeywordRules: [
      { terms: ["v.ps", "gen2"], mode: "all", excludeTerms: ["已出"] },
      { terms: ["家人", "求购"], mode: "any", excludeTerms: ["促销"] },
      { terms: ["促销"], mode: "any", excludeTerms: ["v.ps"] },
      { terms: ["缺失", "gen2"], mode: "all" }
    ],
    telegramBlockedKeywords: [],
    telegramBoardSlugs: []
  };

  expect(vm.runInContext(`matchTelegramRssPost(${JSON.stringify(post)}, ${JSON.stringify(config)})`, sandbox))
    .toEqual(["v.ps", "gen2"]);
});

test("RSS does not send new posts when no keyword rule matches", async () => {
  const sentMessages = [];
  const stored = [];
  const xml = `<rss><channel><item><title><![CDATA[完全无关的帖子]]></title>
    <link>https://www.nodeseek.com/post-12345-1</link>
    <guid>https://www.nodeseek.com/post-12345-1</guid><category>日常</category></item></channel></rss>`;
  const sandbox = createSandbox(async (url, options) => {
    if (url === "https://rss.nodeseek.com/") return { ok: true, text: async () => xml };
    sentMessages.push({ url, payload: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ ok: true, result: { message_id: 1 } }) };
  });
  sandbox.chrome = { storage: { local: { set: async (value) => stored.push(value) } } };
  const config = {
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "123" }],
    telegramRssSeenIds: [],
    telegramRssInitialized: true,
    telegramRssHistory: [],
    telegramKeywordRules: [{ terms: ["台湾"], mode: "any", enabled: true }],
    telegramBlockedKeywords: [],
    telegramBoardSlugs: ["daily"]
  };

  await vm.runInContext(`checkRssPosts(${JSON.stringify(config)})`, sandbox);

  expect(sentMessages).toEqual([]);
  expect(stored.at(-1).telegramRssSeenIds).toEqual(["12345"]);
});

test("RSS notifications include the post board", async () => {
  const sentMessages = [];
  const stored = { telegramManagedTopics: [] };
  const xml = `<rss><channel><item><title><![CDATA[关键字云服务器]]></title>
    <link>https://www.nodeseek.com/post-54321-1</link>
    <guid>https://www.nodeseek.com/post-54321-1</guid><category>日常</category></item></channel></rss>`;
  const sandbox = createSandbox(async (url, options = {}) => {
    if (url === "https://rss.nodeseek.com/") return { ok: true, text: async () => xml };
    const payload = JSON.parse(options.body);
    if (url.endsWith("/createForumTopic")) {
      return { ok: true, json: async () => ({ ok: true, result: { message_thread_id: 456 } }) };
    }
    if (url.endsWith("/sendMessage")) {
      sentMessages.push(payload);
      return { ok: true, json: async () => ({ ok: true }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  const config = {
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "123" }],
    telegramRssSeenIds: [],
    telegramRssInitialized: true,
    telegramRssHistory: [],
    telegramKeywordRules: [{ terms: ["关键字"], mode: "any", enabled: true }],
    telegramBlockedKeywords: [],
    telegramBoardSlugs: ["daily"]
  };

  await vm.runInContext(`checkRssPosts(${JSON.stringify(config)})`, sandbox);

  expect(sentMessages).toHaveLength(1);
  expect(sentMessages[0].text).toContain("板块：日常");
  expect(sentMessages[0].message_thread_id).toBe(456);
});

test("Telegram Direct target sends the required topic identifier", async () => {
  let captured;
  const sandbox = createSandbox(async (url, options) => {
    captured = { url, payload: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ ok: true }) };
  });
  await vm.runInContext(
    `sendTelegramMessage("123456:secret", { type: "direct", chatId: "-100123", topicId: "456" }, "test")`,
    sandbox
  );
  expect(captured).toEqual({
    url: "https://api.telegram.org/bot123456:secret/sendMessage",
    payload: {
      chat_id: "-100123",
      text: "test",
      disable_web_page_preview: true,
      direct_messages_topic_id: 456
    }
  });
});

test("opening the bot starts a five-minute personal /start listener", async () => {
  const stored = { telegramBotToken: "123456:secret" };
  let alarm;
  const sandbox = createSandbox();
  let pollerEnsured = false;
  sandbox.ensureTelegramUpdatesLongPoll = async () => { pollerEnsured = true; };
  sandbox.chrome = {
    storage: { local: {
      get: async () => ({ telegramBotToken: stored.telegramBotToken }),
      set: async (values) => Object.assign(stored, values)
    } },
    alarms: { create: async (...args) => { alarm = args; } }
  };

  const startedAt = Date.now();
  await vm.runInContext("startTelegramPersonalStartWatch()", sandbox);

  expect(alarm[0]).toBe("nshTelegram:personal-start");
  expect(alarm[1].when).toBeGreaterThanOrEqual(startedAt + 5 * 60 * 1000);
  expect(pollerEnsured).toBe(true);
  expect(stored.telegramPersonalStartWatchUntil).toBeGreaterThanOrEqual(startedAt + 5 * 60 * 1000);
  expect(stored.telegramPersonalStartWatchSince).toBeGreaterThanOrEqual(Math.floor(startedAt / 1000));
});

test("long-poll /start update fills Chat ID, replies, and stops its alarm", async () => {
  const startTime = Math.floor(Date.now() / 1000) - 1;
  const stored = {
    telegramBotToken: "123456:secret",
    telegramPersonalStartWatchUntil: Date.now() + 5 * 60 * 1000,
    telegramPersonalStartWatchSince: startTime
  };
  const sentReplies = [];
  const runtimeMessages = [];
  let clearedAlarm = "";
  const sandbox = createSandbox();
  sandbox.chrome = {
    storage: { local: {
      get: async (query) => typeof query === "string"
        ? { [query]: stored[query] }
        : { ...query, ...stored },
      set: async (values) => Object.assign(stored, values),
      remove: async (keys) => {
        for (const key of [].concat(keys)) delete stored[key];
      }
    } },
    alarms: {
      clear: async (name) => { clearedAlarm = name; },
      create: async () => {}
    },
    runtime: { sendMessage: async (message) => runtimeMessages.push(message) }
  };
  sandbox.sendTelegramMessage = async (...args) => sentReplies.push(args);

  await vm.runInContext(`processTelegramPersonalStartUpdateIfWatching("123456:secret", [{
    update_id: 91,
    message: { date: Date.now() / 1000, chat: { type: "private", id: 222 }, text: "/start" }
  }])`, sandbox);

  expect(stored.telegramTargets).toEqual([expect.objectContaining({
    name: "个人聊天",
    type: "personal",
    chatId: "222",
    enabled: true
  })]);
  expect(stored.telegramPendingPersonalChatId).toBeUndefined();
  expect(stored.telegramPersonalStartWatchUntil).toBe(0);
  expect(clearedAlarm).toBe("nshTelegram:personal-start");
  expect(sentReplies[0].slice(0, 2)).toEqual(["123456:secret", { type: "personal", chatId: "222" }]);
  expect(sentReplies[0][2]).toBe("设置成功，请返回插件查看");
  expect(runtimeMessages).toContainEqual(expect.objectContaining({
    type: "telegram:personalChatIdDetected",
    chatId: "222",
    targetAdded: true
  }));
});

test("long polling advances its offset across full batches before a new /start update", async () => {
  const startTime = Math.floor(Date.now() / 1000) - 1;
  const stored = {
    telegramBotToken: "123456:secret",
    telegramPersonalStartWatchUntil: Date.now() + 5 * 60 * 1000,
    telegramPersonalStartWatchSince: startTime
  };
  const requests = [];
  const replies = [];
  const sandbox = createSandbox(async (url) => {
    requests.push(url);
    const updates = requests.length === 1
      ? Array.from({ length: 100 }, (_, index) => ({
        update_id: index + 1,
        message: { date: startTime - 3600, chat: { type: "supergroup", id: -123 }, text: "old group message" }
      }))
      : [{
        update_id: 101,
        message: { date: Date.now() / 1000, chat: { type: "private", id: 222 }, text: "/start" }
      }];
    return { ok: true, status: 200, json: async () => ({ ok: true, result: updates }) };
  });
  sandbox.cacheTelegramDirectTopicUpdates = async () => {};
  sandbox.processTelegramManagedTopicUpdates = async () => {};
  sandbox.chrome = {
    storage: { local: {
      get: async (query) => typeof query === "string"
        ? { [query]: stored[query] }
        : { ...query, ...stored },
      set: async (values) => Object.assign(stored, values),
      remove: async (keys) => {
        for (const key of [].concat(keys)) delete stored[key];
      }
    } },
    alarms: { clear: async () => {}, create: async () => {} },
    runtime: { sendMessage: async () => {} }
  };
  sandbox.sendTelegramMessage = async (...args) => replies.push(args);

  await vm.runInContext('getTelegramUpdatesAndProcess("123456:secret")', sandbox);
  await vm.runInContext('getTelegramUpdatesAndProcess("123456:secret")', sandbox);

  expect(requests).toHaveLength(2);
  expect(requests[1]).toContain("offset=101");
  expect(stored.telegramTargets).toEqual([expect.objectContaining({
    type: "personal",
    chatId: "222",
    enabled: true
  })]);
  expect(stored.telegramPendingPersonalChatId).toBeUndefined();
  expect(stored.telegramPersonalStartOffset).toBe(102);
  expect(replies).toHaveLength(1);
});

test("personal /start queue scanning preserves Direct topic metadata without message text", async () => {
  const stored = {};
  const sandbox = createSandbox();
  sandbox.ensureTelegramUpdatesLongPoll = async () => {};
  sandbox.chrome = { storage: { local: {
    get: async (query) => ({ ...query, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };

  await vm.runInContext(`cacheTelegramDirectTopicUpdates([{
    update_id: 21,
    message: {
      chat: { id: "-100123", is_direct_messages: true },
      direct_messages_topic: { topic_id: 456, user: { first_name: "Receiver", username: "receiver" } },
      text: "private content must not be cached"
    }
  }])`, sandbox);

  expect(stored.telegramPendingDirectTopics).toEqual([{
    updateId: 21,
    chatId: "-100123",
    topicId: "456",
    topicUser: "Receiver",
    topicUsername: "receiver"
  }]);
  expect(JSON.stringify(stored)).not.toContain("private content");
});

test("Direct topic lookup can recover metadata cached while the personal listener advances the queue", async () => {
  const stored = {
    telegramBotToken: "123456:secret",
    telegramPersonalStartOffset: 102,
    telegramPendingDirectTopics: [{
      updateId: 101,
      chatId: "-100123",
      topicId: "456",
      topicUser: "Receiver",
      topicUsername: "receiver"
    }]
  };
  const requests = [];
  const sandbox = createSandbox(async (url) => {
    requests.push(url);
    if (url.includes("getChat?chat_id=%40parent")) {
      return { ok: true, json: async () => ({ ok: true, result: { id: "77" } }) };
    }
    if (url.includes("getUpdates")) {
      return { ok: true, json: async () => ({ ok: true, result: [] }) };
    }
    if (url.includes("getChat?chat_id=-100123")) {
      return {
        ok: true,
        json: async () => ({ ok: true, result: { is_direct_messages: true, parent_chat: { id: "77" } } })
      };
    }
    throw new Error(`Unexpected Telegram API request: ${url}`);
  });
  sandbox.ensureTelegramUpdatesLongPoll = async () => {};
  sandbox.chrome = { storage: { local: {
    get: async (query) => typeof query === "string"
      ? { [query]: stored[query] }
      : { ...query, ...stored },
    set: async (values) => Object.assign(stored, values)
  } } };

  const result = await vm.runInContext('getTelegramDirectTopicId("parent")', sandbox);

  expect(requests.filter((url) => url.includes("getUpdates"))).toHaveLength(0);
  expect(result.topics).toEqual([{
    chatId: "-100123",
    topicId: "456",
    topicUser: "Receiver",
    topicUsername: "receiver"
  }]);
});

test("personal /start listener stops after its timeout", async () => {
  const stored = {
    telegramBotToken: "123456:secret",
    telegramPersonalStartWatchUntil: Date.now() - 1,
    telegramPersonalStartWatchSince: 0
  };
  let fetchCalled = false;
  let clearedAlarm = "";
  const runtimeMessages = [];
  const sandbox = createSandbox(async () => { fetchCalled = true; });
  sandbox.ensureTelegramUpdatesLongPoll = async () => {};
  sandbox.chrome = {
    storage: { local: {
      get: async (query) => ({ ...query, ...stored }),
      set: async (values) => Object.assign(stored, values)
    } },
    alarms: { clear: async (name) => { clearedAlarm = name; } },
    runtime: { sendMessage: async (message) => runtimeMessages.push(message) }
  };

  await vm.runInContext("checkTelegramPersonalStartWatch()", sandbox);

  expect(fetchCalled).toBe(false);
  expect(clearedAlarm).toBe("nshTelegram:personal-start");
  expect(stored.telegramPersonalStartWatchUntil).toBe(0);
  expect(runtimeMessages).toContainEqual({ type: "telegram:personalStartWatchTimeout" });
});

test("activity notification places the post link before mention or reply content", () => {
  const sandbox = createSandbox();
  const text = vm.runInContext(`formatTelegramActivityNotification("reply", ${JSON.stringify({
    id: 12,
    post_id: 1054082,
    floor_id: 9,
    commenter_name: "Alice",
    title: "主题标题",
    content: "回复正文"
  })})`, sandbox);

  expect(text.indexOf("https://www.nodeseek.com/post-1054082-1")).toBeGreaterThan(-1);
  expect(text.indexOf("内容：回复正文")).toBeGreaterThan(text.indexOf("https://www.nodeseek.com/post-1054082-1"));
});

test("Telegram-originated private reply is not mirrored back to its Telegram topic", async () => {
  const stored = {
    telegramManagedTopics: [{ id: "dm-1", kind: "dm", chatId: "333", topicId: "456", nsUserId: "222", name: "Alice" }],
    telegramSystemNotificationUserId: "",
    telegramMessageCursors: { "222:777": "1" },
    telegramOutgoingMessageEchoes: []
  };
  const telegramSends = [];
  const sandbox = createSandbox(async (url, options = {}) => {
    if (url === "https://www.nodeseek.com/api/notification/message/list") {
      return { ok: true, json: async () => ({ success: true, msgArray: [{ sender_id: "777", receiver_id: "222", max_id: 2 }] }) };
    }
    if (url === "https://www.nodeseek.com/api/notification/message/with/222") {
      return { ok: true, json: async () => ({ success: true, msgArray: [{
        id: 2, sender_id: "777", receiver_id: "222", content: "TG 回信"
      }] }) };
    }
    if (url.endsWith("/sendMessage")) {
      telegramSends.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  sandbox.fetchLuckyCurrentUser = async () => ({ member_id: "777" });
  stored.telegramOutgoingMessageEchoes.push({
    userId: "222",
    fingerprint: await vm.runInContext('getTelegramOutgoingEchoFingerprint("222", "TG 回信")', sandbox),
    createdAt: Date.now()
  });

  await vm.runInContext(`checkForNewNodeSeekMessages(${JSON.stringify({
    telegramMessageCursors: stored.telegramMessageCursors,
    telegramManagedTopics: stored.telegramManagedTopics,
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }],
    telegramBotToken: "123456:secret"
  })})`, sandbox);

  expect(telegramSends).toHaveLength(0);
  expect(stored.telegramOutgoingMessageEchoes).toHaveLength(0);
  expect(stored.telegramMessageCursors["222:777"]).toBe("2");
});

test("outgoing system notification reuses its system topic instead of creating a DM topic", async () => {
  const stored = {
    telegramManagedTopics: [{ id: "legacy-system", kind: "dm", chatId: "333", topicId: "456", nsUserId: "999", name: "系统通知" }],
    telegramSystemNotificationUserId: "",
    telegramMessageCursors: { "777:999": "1" },
    telegramOutgoingMessageEchoes: []
  };
  const telegramSends = [];
  const sandbox = createSandbox(async (url, options = {}) => {
    if (url === "https://www.nodeseek.com/api/notification/message/list") {
      return { ok: true, json: async () => ({ success: true, msgArray: [{
        sender_id: "777", receiver_id: "999", sender_name: "me", receiver_name: "系统通知", max_id: 2
      }] }) };
    }
    if (url === "https://www.nodeseek.com/api/notification/message/with/999") {
      return { ok: true, json: async () => ({ success: true, msgArray: [{
        id: 2, sender_id: "777", receiver_id: "999", sender_name: "me", receiver_name: "系统通知", content: "测试回信"
      }] }) };
    }
    if (url.endsWith("/createForumTopic")) throw new Error("Should reuse the legacy system topic");
    if (url.endsWith("/sendMessage")) {
      telegramSends.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  sandbox.fetchLuckyCurrentUser = async () => ({ member_id: "777" });

  await vm.runInContext(`checkForNewNodeSeekMessages(${JSON.stringify({
    telegramMessageCursors: stored.telegramMessageCursors,
    telegramManagedTopics: stored.telegramManagedTopics,
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }],
    telegramBotToken: "123456:secret"
  })})`, sandbox);

  expect(stored.telegramSystemNotificationUserId).toBe("999");
  expect(stored.telegramManagedTopics).toEqual([{
    id: "legacy-system", kind: "system", chatId: "333", topicId: "456", nsUserId: "", name: "系统通知"
  }]);
  expect(telegramSends).toHaveLength(1);
  expect(telegramSends[0]).toMatchObject({ message_thread_id: 456, text: "我：测试回信" });
});

test("system topic normalization keeps one local mapping and reuses the existing system topic", async () => {
  const stored = {
    telegramManagedTopics: [
      { id: "system-topic", kind: "system", chatId: "333", topicId: "789", nsUserId: "", name: "系统通知" },
      { id: "legacy-dm", kind: "dm", chatId: "333", topicId: "456", nsUserId: "999", name: "系统通知" }
    ],
    telegramSystemNotificationUserId: "999"
  };
  const sandbox = createSandbox(async () => { throw new Error("No Telegram API request expected"); });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };

  const topic = await vm.runInContext('getOrCreateManagedTelegramTopic("token", "333", "system")', sandbox);

  expect(topic).toMatchObject({ id: "system-topic", topicId: "789", kind: "system" });
  expect(stored.telegramManagedTopics).toEqual([{
    id: "system-topic", kind: "system", chatId: "333", topicId: "789", nsUserId: "", name: "系统通知"
  }]);
});

test("private message sync mirrors both directions into one mapped user topic", async () => {
  const stored = {
    telegramManagedTopics: [],
    telegramSystemNotificationUserId: "",
    telegramMessageCursors: { "222:777": "1" }
  };
  const telegramSends = [];
  const requestedUrls = [];
  const sandbox = createSandbox(async (url, options = {}) => {
    requestedUrls.push(url);
    if (url === "https://www.nodeseek.com/api/notification/message/list") {
      return {
        ok: true,
        json: async () => ({
          success: true,
          msgArray: [{
            sender_id: "777",
            receiver_id: "222",
            sender_name: "me",
            receiver_name: "Anderlille",
            max_id: 3
          }]
        })
      };
    }
    if (url === "https://www.nodeseek.com/api/notification/message/with/222") {
      return {
        ok: true,
        json: async () => ({
          success: true,
          msgArray: [
            {
              id: 2,
              sender_id: "777",
              receiver_id: "222",
              sender_name: "me",
              receiver_name: "Anderlille",
              content: "我主动发出的消息"
            },
            {
              id: 3,
              sender_id: "222",
              receiver_id: "777",
              sender_name: "Anderlille",
              receiver_name: "me",
              content: "对方回复的消息"
            }
          ]
        })
      };
    }
    if (url.endsWith("/createForumTopic")) {
      const body = JSON.parse(options.body);
      expect(body).toEqual({ chat_id: "333", name: "Anderlille" });
      return {
        ok: true,
        json: async () => ({ ok: true, result: { message_thread_id: 456 } })
      };
    }
    if (url.endsWith("/sendMessage")) {
      telegramSends.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true, result: { message_id: telegramSends.length } }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  sandbox.fetchLuckyCurrentUser = async () => ({ member_id: "777" });
  const config = {
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }],
    telegramMessageCursors: stored.telegramMessageCursors,
    telegramManagedTopics: []
  };

  await vm.runInContext(`checkForNewNodeSeekMessages(${JSON.stringify(config)})`, sandbox);

  expect(requestedUrls).toContain("https://www.nodeseek.com/api/notification/message/with/222");
  expect(telegramSends).toHaveLength(2);
  expect(telegramSends.map((message) => message.message_thread_id)).toEqual([456, 456]);
  expect(telegramSends.map((message) => message.text)).toEqual(["我：我主动发出的消息", "对方回复的消息"]);
  expect(stored.telegramManagedTopics).toHaveLength(1);
  expect(stored.telegramManagedTopics[0]).toMatchObject({
    kind: "dm",
    chatId: "333",
    topicId: "456",
    name: "Anderlille",
    nsUserId: "222"
  });
  expect(stored.telegramMessageCursors["222:777"]).toBe("3");
});

test("overlapping Telegram monitor checks process a new private message once", async () => {
  const message = {
    sender_id: "222",
    receiver_id: "777",
    sender_name: "other-user",
    max_id: 2
  };
  const stored = {
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333" }],
    telegramMessageNotificationsEnabled: true,
    telegramPostNotificationsEnabled: false,
    telegramKeywordRules: [],
    telegramBlockedKeywords: [],
    telegramBoardSlugs: [],
    telegramMessageCursors: { "222:777": "1" },
    telegramManagedTopics: [],
    telegramRssSeenIds: [],
    telegramRssInitialized: true,
    telegramRssHistory: [],
    telegramMonitorPaused: false
  };
  let releaseFetch;
  const fetchGate = new Promise((resolve) => { releaseFetch = resolve; });
  let listRequestCount = 0;
  let sentCount = 0;
  const sandbox = createSandbox(async (url, options = {}) => {
    if (url === "https://www.nodeseek.com/api/notification/message/list") {
      listRequestCount += 1;
      await fetchGate;
      return { ok: true, json: async () => ({ success: true, msgArray: [message] }) };
    }
    if (url === "https://www.nodeseek.com/api/notification/message/with/222") {
      return {
        ok: true,
        json: async () => ({
          success: true,
          msgArray: [{
            id: 2,
            sender_id: "222",
            receiver_id: "777",
            sender_name: "other-user",
            content: "new message"
          }]
        })
      };
    }
    if (url.endsWith("/createForumTopic")) {
      return { ok: true, json: async () => ({ ok: true, result: { message_thread_id: 456 } }) };
    }
    if (url.endsWith("/sendMessage")) {
      sentCount += 1;
      return { ok: true, json: async () => ({ ok: true }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  sandbox.fetchLuckyCurrentUser = async () => ({ member_id: "777" });

  const firstCheck = vm.runInContext("checkTelegramNotifications()", sandbox);
  const overlappingCheck = vm.runInContext("checkTelegramNotifications()", sandbox);
  releaseFetch();
  await Promise.all([firstCheck, overlappingCheck]);

  expect(listRequestCount).toBe(1);
  expect(sentCount).toBe(1);
  expect(stored.telegramMessageCursors["222:777"]).toBe("2");
});

test("Telegram sends only once to duplicate saved destination entries", async () => {
  const target = { type: "personal", chatId: "333", enabled: true };
  const sends = [];
  const sandbox = createSandbox();
  sandbox.sendTelegramMessage = async (...args) => { sends.push(args); };

  await vm.runInContext(`sendTelegramToTargets({
    telegramBotToken: "123456:secret",
    telegramTargets: ${JSON.stringify([target, { ...target, id: "duplicate", name: "Duplicate" }])}
  }, "notification")`, sandbox);

  expect(sends).toHaveLength(1);
});

test("Telegram monitor skips checks when every destination is disabled", async () => {
  const stored = {
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333", enabled: false }],
    telegramMessageNotificationsEnabled: true,
    telegramPostNotificationsEnabled: false,
    telegramMonitorPaused: false
  };
  let fetchCalled = false;
  const sandbox = createSandbox(async () => { fetchCalled = true; });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async () => {}
  } } };

  await vm.runInContext("checkTelegramNotifications()", sandbox);

  expect(fetchCalled).toBe(false);
});

test("Telegram photo upload uses the Telegram image MIME when the file endpoint is generic", async () => {
  const uploads = [];
  const sandbox = createSandbox(async (url) => {
    if (String(url).includes("/getFile?")) {
      return new Response(JSON.stringify({ ok: true, result: { file_path: "photos/file_1.jpg" } }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (String(url).includes("/file/bot")) {
      return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), {
        headers: { "Content-Type": "application/octet-stream" }
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  sandbox.Blob = Blob;
  sandbox.getOptions = async () => ({ imageUploadEnabled: true });
  sandbox.uploadImage = async (payload) => {
    uploads.push(payload);
    return { markdown: "![image](https://images.example/test.jpg)" };
  };

  const result = await vm.runInContext(`uploadTelegramMessageImage("123456:secret", {
    fileId: "telegram-file-id",
    fileSize: 4,
    mimeType: "image/jpeg"
  })`, sandbox);

  expect(result.markdown).toContain("images.example/test.jpg");
  expect(uploads).toHaveLength(1);
  expect(uploads[0].blob.type).toBe("image/jpeg");
  expect(uploads[0].type).toBe("image/jpeg");
});

test("Telegram tells the topic user to enable image hosting when it is disabled", async () => {
  const stored = {
    telegramManagedTopics: [{ kind: "dm", chatId: "-1001", topicId: "456", nsUserId: "222", name: "Alice" }],
    telegramProcessedTopicUpdateIds: [],
    telegramPendingTopicImageMarkdowns: {},
    telegramPendingTopicReadUserIds: []
  };
  const telegramMessages = [];
  let fileDownloadRequested = false;
  const sandbox = createSandbox(async (url, options = {}) => {
    if (String(url).includes("/getFile?") || String(url).includes("/file/bot/")) {
      fileDownloadRequested = true;
      throw new Error("Image upload should stop before downloading the Telegram file");
    }
    if (String(url).endsWith("/sendMessage")) {
      telegramMessages.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  sandbox.getOptions = async () => ({ imageUploadEnabled: false });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };

  await vm.runInContext(`processTelegramManagedTopicUpdates("123456:secret", [{
    update_id: 789,
    message: {
      message_thread_id: 456,
      chat: { id: -1001, type: "private" },
      from: { id: 555, is_bot: false },
      photo: [{ file_id: "telegram-photo", file_size: 12, width: 2, height: 2 }]
    }
  }])`, sandbox);

  expect(fileDownloadRequested).toBe(false);
  expect(telegramMessages).toHaveLength(1);
  expect(telegramMessages[0].chat_id).toBe("-1001");
  expect(telegramMessages[0].message_thread_id).toBe(456);
  expect(telegramMessages[0].text).toContain("图床配置");
  expect(telegramMessages[0].text).toContain("开启图床上传");
  expect(stored.telegramProcessedTopicUpdateIds).toContain("789");
});

test("Telegram photo caption and uploaded image Markdown are sent as one NodeSeek message", async () => {
  const stored = {
    telegramManagedTopics: [{ kind: "dm", chatId: "-1001", topicId: "456", nsUserId: "222", name: "Alice" }],
    telegramProcessedTopicUpdateIds: [],
    telegramPendingTopicImageMarkdowns: {},
    telegramPendingTopicReadUserIds: []
  };
  const nodeSeekSends = [];
  const telegramErrors = [];
  const sandbox = createSandbox(async (url, options = {}) => {
    if (String(url).includes("/getFile?")) {
      return { ok: true, json: async () => ({ ok: true, result: { file_path: "photos/photo.jpg" } }) };
    }
    if (String(url).includes("/file/bot")) {
      return { ok: true, blob: async () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" }) };
    }
    if (String(url).endsWith("/sendMessage")) {
      telegramErrors.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  sandbox.Blob = Blob;
  sandbox.getOptions = async () => ({ imageUploadEnabled: true });
  sandbox.uploadImage = async () => ({ markdown: "![image](https://cdn.nodeimage.com/test.jpg)" });
  sandbox.fetchLuckyCurrentUser = async () => ({ member_id: "999" });
  sandbox.chrome = {
    storage: { local: {
      get: async (defaults) => ({ ...defaults, ...stored }),
      set: async (values) => Object.assign(stored, values)
    } },
    tabs: {
      query: async () => [{ id: 1, status: "complete" }],
      sendMessage: async (_tabId, message) => {
        if (message.payload.operation === "send-private-message") {
          nodeSeekSends.push(message.payload);
          return { ok: true, result: { success: true } };
        }
        return { ok: true, result: { marked: 0 } };
      }
    }
  };

  await vm.runInContext(`processTelegramManagedTopicUpdates("123456:secret", [{
    update_id: 790,
    message: {
      message_thread_id: 456,
      chat: { id: -1001, type: "private" },
      from: { id: 555, is_bot: false },
      caption: "发个图试试",
      photo: [{ file_id: "telegram-photo", file_size: 12, width: 2, height: 2 }]
    }
  }])`, sandbox);

  expect(telegramErrors).toEqual([]);
  expect(nodeSeekSends).toHaveLength(1);
  expect(nodeSeekSends[0].content).toBe("发个图试试\n\n![image](https://cdn.nodeimage.com/test.jpg)");
  expect(nodeSeekSends[0].markdown).toBe(true);
  expect(stored.telegramOutgoingMessageEchoes).toHaveLength(1);
  expect(stored.telegramOutgoingMessageEchoes[0].userId).toBe("222");
});
