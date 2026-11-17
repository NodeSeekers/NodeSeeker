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

test("disabled offline-message sync resets the private-message cursor before startup catch-up", async () => {
  const stored = {
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }],
    telegramMessageNotificationsEnabled: true,
    telegramPostNotificationsEnabled: false,
    telegramMentionNotificationsEnabled: false,
    telegramReplyNotificationsEnabled: false,
    telegramMonitorPaused: false,
    telegramMonitorIntervalSeconds: 30,
    telegramMessageCursors: { "777:222": "900" }
  };
  let monitorChecks = 0;
  const sandbox = createSandbox();
  sandbox.checkTelegramNotifications = async () => { monitorChecks += 1; };
  sandbox.chrome = {
    storage: { local: {
      get: async (defaults) => ({ ...defaults, ...stored }),
      set: async (values) => Object.assign(stored, values),
      remove: async (key) => { delete stored[key]; }
    } },
    alarms: {
      clear: async () => {},
      create: async () => {}
    }
  };

  await vm.runInContext(
    "scheduleTelegramMonitorAlarm({ resetMessageBaseline: true, checkImmediately: true })",
    sandbox
  );

  expect(stored.telegramMessageCursors).toBeUndefined();
  expect(monitorChecks).toBe(1);
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
      disable_notification: false,
      direct_messages_topic_id: 456
    }
  });
});

test("Telegram messages are silent only when the focused Chrome window shows NodeSeek", async () => {
  const cases = [
    { name: "foreground NodeSeek", focused: true, url: "https://www.nodeseek.com/post-1", expected: true },
    { name: "background NodeSeek", focused: false, url: "https://www.nodeseek.com/post-1", expected: false },
    { name: "foreground Google", focused: true, url: "https://www.google.com/", expected: false },
    { name: "background Google", focused: false, url: "https://www.google.com/", expected: false },
    { name: "forced silent push overrides browser state", focused: false, url: "https://www.google.com/", silentEnabled: true, expected: true }
  ];

  for (const scenario of cases) {
    let capturedPayload;
    const sandbox = createSandbox(async (_url, options) => {
      capturedPayload = JSON.parse(options.body);
      return { ok: true, json: async () => ({ ok: true }) };
    });
    sandbox.chrome = {
      storage: { local: {
        get: async (defaults) => ({
          ...defaults,
          telegramSilentPushEnabled: scenario.silentEnabled === true
        })
      } },
      windows: {
        getLastFocused: async () => ({ focused: scenario.focused, id: 17 })
      },
      tabs: {
        query: async () => [{ active: true, url: scenario.url }]
      }
    };

    await vm.runInContext(
      'sendTelegramMessage("123456:secret", { type: "personal", chatId: "333" }, "test")',
      sandbox
    );

    expect(capturedPayload.disable_notification, scenario.name).toBe(scenario.expected);
  }
});

test("Telegram photo sends use the same conditional and forced silent-push settings", async () => {
  let capturedPayload;
  const sandbox = createSandbox(async (_url, options) => {
    capturedPayload = JSON.parse(options.body);
    return { ok: true, json: async () => ({ ok: true }) };
  });
  sandbox.chrome = {
    storage: { local: { get: async (defaults) => ({ ...defaults, telegramSilentPushEnabled: true }) } },
    windows: { getLastFocused: async () => ({ focused: false, id: 17 }) },
    tabs: { query: async () => [{ active: true, url: "https://www.google.com/" }] }
  };

  await vm.runInContext(
    'sendTelegramPhoto("123456:secret", { type: "personal", chatId: "333" }, "https://cdn.example/image.png", "caption")',
    sandbox
  );

  expect(capturedPayload.disable_notification).toBe(true);
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
  const settingsEntries = [];
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
  sandbox.ensureTelegramSettingsEntry = async (...args) => settingsEntries.push(args);

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
  expect(settingsEntries).toEqual([["123456:secret", "222"]]);
  expect(sentReplies).toHaveLength(0);
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
  const settingsEntries = [];
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
  sandbox.processTelegramSettingsUpdates = async () => {};
  sandbox.ensureTelegramSettingsEntry = async (...args) => settingsEntries.push(args);
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
  sandbox.processTelegramPersonalStartUpdateIfWatching = async (token, updates) => {
    const update = updates.find((item) => item.message?.text === "/start");
    if (update) await sandbox.registerTelegramPersonalStartUpdate(token, update);
  };

  await vm.runInContext('getTelegramUpdatesAndProcess("123456:secret")', sandbox);
  await vm.runInContext('getTelegramUpdatesAndProcess("123456:secret")', sandbox);

  const updateRequests = requests.filter((url) => url.includes("/getUpdates?"));
  expect(updateRequests).toHaveLength(2);
  expect(updateRequests[1]).toContain("offset=101");
  expect(stored.telegramTargets).toEqual([expect.objectContaining({
    type: "personal",
    chatId: "222",
    enabled: true
  })]);
  expect(stored.telegramPendingPersonalChatId).toBeUndefined();
  expect(stored.telegramPersonalStartOffset).toBe(102);
  expect(settingsEntries).toEqual([["123456:secret", "222"]]);
  expect(replies).toHaveLength(0);
});

test("Telegram private-topic updates are processed when the supplied token is absent from stored settings", async () => {
  const stored = {
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }],
    telegramMessageNotificationsEnabled: true,
    telegramPostNotificationsEnabled: false,
    telegramMentionNotificationsEnabled: false,
    telegramReplyNotificationsEnabled: false,
    telegramMonitorPaused: false
  };
  const updates = [{ update_id: 41, message: { text: "reply" } }];
  const processed = [];
  let requestedDefaults = null;
  const sandbox = createSandbox(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, result: updates })
  }));
  sandbox.cacheTelegramDirectTopicUpdates = async () => {};
  sandbox.processTelegramDeletedTopicUpdates = async () => {};
  sandbox.processTelegramManagedTopicUpdates = async (token, batch) => processed.push({ token, batch });
  sandbox.processTelegramPersonalStartUpdateIfWatching = async () => {};
  sandbox.processTelegramSettingsUpdates = async () => {};
  sandbox.chrome = {
    storage: { local: {
      get: async (defaults) => {
        requestedDefaults = defaults;
        return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [
          key,
          Object.hasOwn(stored, key) ? stored[key] : value
        ]));
      },
      set: async (values) => Object.assign(stored, values)
    } },
    runtime: { sendMessage: async () => {} }
  };

  await vm.runInContext('getTelegramUpdatesAndProcess("123456:secret")', sandbox);

  expect(requestedDefaults).toHaveProperty("telegramBotToken", "123456:secret");
  expect(processed).toEqual([{ token: "123456:secret", batch: updates }]);
  expect(stored.telegramPersonalStartOffset).toBe(42);
});

test("failed Topic replies retry the same Telegram update with persisted backoff", async () => {
  const stored = {
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }],
    telegramMessageNotificationsEnabled: true,
    telegramPostNotificationsEnabled: false,
    telegramMentionNotificationsEnabled: false,
    telegramReplyNotificationsEnabled: false,
    telegramMonitorPaused: false
  };
  const requestOffsets = [];
  const scheduledDelays = [];
  let shouldRun = true;
  let processAttempts = 0;
  const sandbox = createSandbox(async (url) => {
    requestOffsets.push(new URL(url).searchParams.get("offset"));
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: [{ update_id: 50, message: { text: "reply" } }] })
    };
  });
  sandbox.setTimeout = (callback, delay = 0) => {
    scheduledDelays.push(Number(delay) || 0);
    if (Number(delay) <= 1000) queueMicrotask(callback);
    return scheduledDelays.length;
  };
  sandbox.clearTimeout = () => {};
  sandbox.isTelegramUpdateLongPollNeeded = () => {
    const active = shouldRun;
    shouldRun = false;
    return active;
  };
  sandbox.cacheTelegramDirectTopicUpdates = async () => {};
  sandbox.processTelegramPersonalStartUpdateIfWatching = async () => {};
  sandbox.processTelegramManagedTopicUpdates = async () => {
    processAttempts += 1;
    if (processAttempts === 1) throw new Error("NodeSeek 暂时不可用");
  };
  sandbox.chrome = { storage: { local: {
    get: async (query) => typeof query === "string"
      ? { [query]: stored[query] }
      : { ...query, ...stored },
    set: async (values) => Object.assign(stored, values),
    remove: async (keys) => {
      for (const key of [].concat(keys)) delete stored[key];
    }
  } } };

  await vm.runInContext("runTelegramUpdatesLongPoll()", sandbox);
  expect(stored.telegramPersonalStartOffset || 0).toBe(0);
  expect(stored.telegramUpdatesRetryState.failureCount).toBe(1);
  expect(stored.telegramUpdatesRetryState.nextRetryAt).toBeGreaterThan(Date.now());

  // A restarted service worker must honor the persisted backoff and retry the unacknowledged update.
  sandbox.telegramUpdatesFailureCount = 0;
  shouldRun = true;
  await vm.runInContext("runTelegramUpdatesLongPoll()", sandbox);

  expect(requestOffsets).toEqual([null, null]);
  expect(processAttempts).toBe(2);
  expect(stored.telegramPersonalStartOffset).toBe(51);
  expect(stored.telegramUpdatesRetryState).toEqual({ failureCount: 0, nextRetryAt: 0 });
  expect(scheduledDelays.some((delay) => delay >= 900 && delay <= 1000)).toBe(true);
});

test("a failing personal /start registration is queued without blocking Telegram update offset", async () => {
  const stored = {
    telegramPersonalStartOffset: 0,
    telegramPersonalStartWatchUntil: Date.now() + 60_000,
    telegramPersonalStartWatchSince: 0,
    telegramPendingPersonalStartUpdates: []
  };
  const fetched = [];
  let registrationAttempts = 0;
  const sandbox = createSandbox(async () => ({
    ok: true,
    json: async () => ({ ok: true, result: fetched.shift() || [] })
  }));
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values),
    remove: async (keys) => { for (const key of [].concat(keys)) delete stored[key]; }
  } } };
  sandbox.cacheTelegramDirectTopicUpdates = async () => {};
  sandbox.processTelegramManagedTopicUpdates = async () => {};
  sandbox.registerTelegramPersonalStartUpdate = async () => {
    registrationAttempts += 1;
    if (registrationAttempts === 1) throw new Error("存储暂不可用");
  };
  fetched.push([{
    update_id: 50,
    message: { chat: { id: 333, type: "private" }, from: { id: 333 }, text: "/start" }
  }]);

  await vm.runInContext('getTelegramUpdatesAndProcess("123456:secret")', sandbox);
  expect(stored.telegramPersonalStartOffset).toBe(51);
  expect(stored.telegramPendingPersonalStartUpdates).toEqual([expect.objectContaining({
    updateId: 50,
    attempts: 1
  })]);

  stored.telegramPendingPersonalStartUpdates[0].nextRetryAt = 0;
  await vm.runInContext('getTelegramUpdatesAndProcess("123456:secret")', sandbox);
  expect(registrationAttempts).toBe(2);
  expect(stored.telegramPendingPersonalStartUpdates).toEqual([]);
});

test("one failed Telegram Topic reply does not block another topic and remains queued", async () => {
  const stored = {
    telegramManagedTopics: [
      { kind: "dm", chatId: "333", topicId: "93523", nsUserId: "63050", name: "first" },
      { kind: "dm", chatId: "333", topicId: "93524", nsUserId: "63051", name: "second" }
    ],
    telegramProcessedTopicUpdateIds: [],
    telegramPendingTopicUpdates: [],
    telegramOutgoingMessageEchoes: []
  };
  const sent = [];
  let failFirstPeer = true;
  const sandbox = createSandbox();
  sandbox.chrome = { storage: { local: {
    get: async (query) => typeof query === "string"
      ? { [query]: stored[query] }
      : { ...query, ...stored },
    set: async (values) => Object.assign(stored, values),
    remove: async () => {}
  } } };
  sandbox.findNodeSeekOutgoingMessageForTelegramEcho = async () => null;
  sandbox.getNodeSeekTelegramSendBaselineMessageId = async () => "0";
  sandbox.sendNodeSeekPrivateMessage = async (userId, content) => {
    if (userId === "63050" && failFirstPeer) {
      failFirstPeer = false;
      throw new Error("NodeSeek 暂时不可用");
    }
    sent.push({ userId, content });
  };
  sandbox.scheduleTelegramMonitorAlarm = async () => {};
  sandbox.markNodeSeekConversationRead = async () => {};

  const updates = [
    { update_id: 100, message: { chat: { type: "private", id: "333" }, message_thread_id: 93523, from: { id: 1 }, text: "first reply" } },
    { update_id: 101, message: { chat: { type: "private", id: "333" }, message_thread_id: 93524, from: { id: 1 }, text: "second reply" } }
  ];
  await vm.runInContext(`processTelegramManagedTopicUpdates("123456:secret", ${JSON.stringify(updates)})`, sandbox);

  expect(sent).toEqual([{ userId: "63051", content: "second reply" }]);
  expect(stored.telegramPendingTopicUpdates).toEqual([expect.objectContaining({
    updateIds: ["100"],
    attempts: 1,
    lastError: "NodeSeek 暂时不可用"
  })]);
  expect(stored.telegramProcessedTopicUpdateIds).toContain("101");
  expect(stored.telegramProcessedTopicUpdateIds).not.toContain("100");

  stored.telegramPendingTopicUpdates[0].nextRetryAt = 0;
  await vm.runInContext('processTelegramManagedTopicUpdates("123456:secret", [])', sandbox);
  expect(sent).toEqual([
    { userId: "63051", content: "second reply" },
    { userId: "63050", content: "first reply" }
  ]);
  expect(stored.telegramPendingTopicUpdates).toHaveLength(0);
  expect(stored.telegramProcessedTopicUpdateIds).toContain("100");
});

test("a stalled HTTP request is aborted and reported as a retryable timeout", async () => {
  const sandbox = createSandbox((_url, options = {}) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }));

  const result = await vm.runInContext(
    'fetchWithTimeout("https://example.invalid/slow", {}, 5).then(() => null).catch((error) => ({ code: error.code, message: error.message }))',
    sandbox
  );

  expect(result).toEqual({ code: "REQUEST_TIMEOUT", message: "网络请求超时（1 秒）" });

  const bodySandbox = createSandbox(async (_url, options = {}) => ({
    json: () => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("body aborted")), { once: true });
    })
  }));
  const bodyResult = await vm.runInContext(
    '(async () => { try { const response = await fetchWithTimeout("https://example.invalid/body", {}, 5); await response.json(); return null; } catch (error) { return { code: error.code, message: error.message }; } })()',
    bodySandbox
  );

  expect(bodyResult).toEqual({ code: "REQUEST_TIMEOUT", message: "网络请求超时（1 秒）" });
});

test("Telegram delivery receipts prevent already completed targets from receiving a retry duplicate", async () => {
  const stored = { telegramDeliveryReceipts: {} };
  let sends = 0;
  const sandbox = createSandbox();
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  sandbox.sendTelegramMessage = async () => { sends += 1; };

  await vm.runInContext(`sendTelegramToTargets({
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }]
  }, "same event", "ns-dm:1:2")`, sandbox);
  await vm.runInContext(`sendTelegramToTargets({
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }]
  }, "same event", "ns-dm:1:2")`, sandbox);

  expect(sends).toBe(1);
  expect(Object.keys(stored.telegramDeliveryReceipts)).toHaveLength(1);
});

test("NodeSeek read-state failures remain queued and retry without blocking message processing", async () => {
  const stored = { telegramPendingTopicReadUserIds: ["63050"], telegramRetryStates: {} };
  let attempts = 0;
  const sandbox = createSandbox();
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  sandbox.markNodeSeekConversationRead = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("NodeSeek 暂时不可用");
  };

  await vm.runInContext("processPendingTelegramTopicReads()", sandbox);
  expect(stored.telegramPendingTopicReadUserIds).toEqual(["63050"]);
  expect(stored.telegramRetryStates["nodeseek-mark-read:63050"].failureCount).toBe(1);

  stored.telegramRetryStates["nodeseek-mark-read:63050"].nextRetryAt = 0;
  await vm.runInContext("processPendingTelegramTopicReads()", sandbox);
  expect(attempts).toBe(2);
  expect(stored.telegramPendingTopicReadUserIds).toEqual([]);
  expect(stored.telegramRetryStates["nodeseek-mark-read:63050"]).toBeUndefined();
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
  expect(text.indexOf("回复: 回复正文")).toBeGreaterThan(text.indexOf("https://www.nodeseek.com/post-1054082-1"));
});

test("mention and reply notifications split quoted text from the new reply even when the API includes content", async () => {
  for (const kind of ["at", "reply"]) {
    const stored = {
      telegramMentionReplyCursors: { [kind]: { initialized: true, ids: ["11"] } }
    };
    const entry = {
      id: 12,
      comment_id: 301,
      post_id: 456,
      floor_id: 11,
      commenter_id: 99,
      commenter_name: "Alice",
      title: "主题标题",
      content: "API 中的未拆分内容",
      viewed: 0
    };
    const sent = [];
    const pageRequests = [];
    const sandbox = createSandbox(async () => ({
      ok: true,
      json: async () => ({ success: true, data: [entry] })
    }));
    sandbox.chrome = { storage: { local: {
      get: async (defaults) => ({ ...defaults, ...stored }),
      set: async (values) => Object.assign(stored, values)
    } } };
    sandbox.fetchLuckyCurrentUser = async () => ({ member_id: "777" });
    sandbox.requestNodeSeekTelegramPage = async (operation, payload) => {
      pageRequests.push({ operation, payload });
      return { contents: [{ commentId: "301", quote: "引用的原文", reply: "新回复正文" }] };
    };
    sandbox.sendTelegramActivityNotification = async (_config, sentKind, text) => {
      sent.push({ kind: sentKind, text });
    };

    await vm.runInContext(`checkForNewNodeSeekActivity({}, ${JSON.stringify(kind)})`, sandbox);

    expect(pageRequests).toEqual([{
      operation: "fetch-activity-comment-contents",
      payload: { comments: [{ postId: "456", commentId: "301", pageNumber: 2 }] }
    }]);
    expect(sent).toHaveLength(1);
    expect(sent[0].kind).toBe(kind);
    expect(sent[0].text).toContain("引用: 引用的原文");
    expect(sent[0].text).toContain("回复: 新回复正文");
    expect(sent[0].text).not.toContain("API 中的未拆分内容");
  }
});

test("activity extraction failure does not send incomplete alerts or advance the cursor", async () => {
  const entry = {
    id: 12, comment_id: 301, post_id: 456, floor_id: 11,
    commenter_id: 99, commenter_name: "Alice", title: "主题标题", viewed: 0
  };
  const stored = { telegramMentionReplyCursors: { at: { initialized: true, ids: ["11"] } } };
  const sent = [];
  const sandbox = createSandbox(async () => ({
    ok: true,
    json: async () => ({ success: true, data: [entry] })
  }));
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  sandbox.fetchLuckyCurrentUser = async () => ({ member_id: "777" });
  sandbox.requestNodeSeekTelegramPage = async () => { throw new Error("帖子页暂时无法读取"); };
  sandbox.sendTelegramActivityNotification = async (...args) => { sent.push(args); };

  await expect(Promise.resolve(vm.runInContext('checkForNewNodeSeekActivity({}, "at")', sandbox)))
    .rejects.toThrow("帖子页暂时无法读取");

  expect(sent).toHaveLength(0);
  expect(stored.telegramMentionReplyCursors.at.ids).toEqual(["11"]);
});

test("followed-post extraction failure keeps the private-message cursor for retry", async () => {
  const stored = {
    telegramSystemNotificationUserId: "999",
    telegramMessageCursors: { "777:999": "1" },
    telegramManagedTopics: [{
      id: "system-topic", kind: "system", chatId: "333", topicId: "456",
      nsUserId: "", name: "系统", iconCustomEmojiId: "5309984423003823246"
    }],
    telegramOutgoingMessageEchoes: []
  };
  const sent = [];
  const notification = "你关注的用户[Alice](https://www.nodeseek.com/space/99)发布了新帖(https://www.nodeseek.com/post-1056233-1)";
  const sandbox = createSandbox(async (url) => {
    if (url.endsWith("/api/notification/message/list")) {
      return { ok: true, json: async () => ({ success: true, msgArray: [{
        sender_id: "999", receiver_id: "777", sender_name: "系统通知", max_id: 2
      }] }) };
    }
    if (url.endsWith("/api/notification/message/with/999")) {
      return { ok: true, json: async () => ({ success: true, msgArray: [{
        id: 2, sender_id: "999", receiver_id: "777", sender_name: "系统通知", content: notification
      }] }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  sandbox.fetchLuckyCurrentUser = async () => ({ member_id: "777" });
  sandbox.requestNodeSeekTelegramPage = async () => { throw new Error("帖子页暂时无法读取"); };
  sandbox.sendTelegramPrivateMessageToTopics = async (...args) => { sent.push(args); };

  await expect(Promise.resolve(vm.runInContext(`checkForNewNodeSeekMessages(${JSON.stringify({
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }],
    telegramSystemFollowNotificationsEnabled: true,
    telegramMessageCursors: stored.telegramMessageCursors,
    telegramManagedTopics: stored.telegramManagedTopics
  })})`, sandbox))).rejects.toThrow("帖子页暂时无法读取");

  expect(sent).toHaveLength(0);
  expect(stored.telegramMessageCursors["777:999"]).toBe("1");
});

test("system notification filters default to follow off, feed and like on", () => {
  const sandbox = createSandbox();
  expect(vm.runInContext('isTelegramSystemNotificationCategoryEnabled({}, "follow")', sandbox)).toBe(false);
  expect(vm.runInContext('isTelegramSystemNotificationCategoryEnabled({}, "feed")', sandbox)).toBe(true);
  expect(vm.runInContext('isTelegramSystemNotificationCategoryEnabled({}, "like")', sandbox)).toBe(true);
  expect(vm.runInContext('getTelegramSystemNotificationCategory("你关注的用户 Alice 发布了新帖")', sandbox)).toBe("follow");
  expect(vm.runInContext('getTelegramSystemNotificationCategory("您的评论被用户 Q 投喂鸡腿")', sandbox)).toBe("feed");
  expect(vm.runInContext('getTelegramSystemNotificationCategory("您的评论被用户 Q 点赞")', sandbox)).toBe("like");
});

test("enabling a system category resets its baseline when message-list polling was inactive", () => {
  const sandbox = createSandbox();
  const change = { telegramSystemFollowNotificationsEnabled: { oldValue: false, newValue: true } };
  const config = {
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }],
    telegramMessageNotificationsEnabled: false,
    telegramPostNotificationsEnabled: false,
    telegramMentionNotificationsEnabled: true,
    telegramReplyNotificationsEnabled: true,
    telegramSystemFollowNotificationsEnabled: true,
    telegramSystemFeedNotificationsEnabled: false,
    telegramSystemLikeNotificationsEnabled: false,
    telegramManagedTopics: [{ kind: "system", chatId: "333", topicId: "456" }],
    telegramMonitorPaused: false
  };
  const resumed = vm.runInContext(`getTelegramBaselineResetOptions(${JSON.stringify(change)}, ${JSON.stringify(config)})`, sandbox);
  expect(resumed).toEqual({
    resetMessageBaseline: true,
    resetPostBaseline: false,
    resetMentionBaseline: false,
    resetReplyBaseline: false
  });

  const alreadyPolling = vm.runInContext(`getTelegramBaselineResetOptions(${JSON.stringify(change)}, ${JSON.stringify({
    ...config, telegramMessageNotificationsEnabled: true
  })})`, sandbox);
  expect(alreadyPolling.resetMessageBaseline).toBe(false);
});

test("system notification filters skip disabled categories and advance their shared cursor", async () => {
  const stored = {
    telegramSystemNotificationUserId: "999",
    telegramMessageCursors: { "777:999": "1" },
    telegramManagedTopics: [{
      id: "system-topic", kind: "system", chatId: "333", topicId: "456",
      nsUserId: "", name: "系统", iconCustomEmojiId: "5309984423003823246"
    }],
    telegramOutgoingMessageEchoes: []
  };
  const sent = [];
  const messages = [
    { id: 2, sender_id: "999", receiver_id: "777", sender_name: "系统通知", content: "你关注的用户 Alice 发布了新帖" },
    { id: 3, sender_id: "999", receiver_id: "777", sender_name: "系统通知", content: "您的评论被用户 Q 投喂鸡腿" },
    { id: 4, sender_id: "999", receiver_id: "777", sender_name: "系统通知", content: "您的评论被用户 Q 点赞" }
  ];
  const sandbox = createSandbox(async (url) => {
    if (url.endsWith("/api/notification/message/list")) {
      return { ok: true, json: async () => ({ success: true, msgArray: [{
        sender_id: "999", receiver_id: "777", sender_name: "系统通知", max_id: 4
      }] }) };
    }
    if (url.endsWith("/api/notification/message/with/999")) {
      return { ok: true, json: async () => ({ success: true, msgArray: messages }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  sandbox.fetchLuckyCurrentUser = async () => ({ member_id: "777" });
  sandbox.normalizeManagedSystemTopics = async () => {};
  sandbox.sendTelegramPrivateMessageToTopics = async (...args) => { sent.push(args); };

  await vm.runInContext(`checkForNewNodeSeekMessages(${JSON.stringify({
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }],
    telegramMessageCursors: stored.telegramMessageCursors,
    telegramManagedTopics: stored.telegramManagedTopics
  })})`, sandbox);

  expect(sent).toHaveLength(2);
  expect(sent.map((args) => args[3])).toEqual([
    "您的评论被用户 Q 投喂鸡腿",
    "您的评论被用户 Q 点赞"
  ]);
  expect(stored.telegramMessageCursors["777:999"]).toBe("4");
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

test("a stale sending echo does not block newer private messages in the conversation", async () => {
  const staleContent = "较早的 Telegram 回信";
  const laterContent = "后续 Telegram 回信";
  const stored = {
    telegramManagedTopics: [{
      id: "dm-1", kind: "dm", chatId: "333", topicId: "93523", nsUserId: "63050", name: "szhhaoo",
      iconCustomEmojiId: "topic-icon"
    }],
    telegramSystemNotificationUserId: "",
    telegramMessageCursors: { "63050:72248": "9191364" },
    telegramOutgoingMessageEchoes: []
  };
  const telegramSends = [];
  const sandbox = createSandbox(async (url, options = {}) => {
    if (url === "https://www.nodeseek.com/api/notification/message/list") {
      return { ok: true, json: async () => ({ success: true, msgArray: [{
        sender_id: "63050", receiver_id: "72248", sender_name: "szhhaoo", max_id: 9191618
      }] }) };
    }
    if (url === "https://www.nodeseek.com/api/notification/message/with/63050") {
      return { ok: true, json: async () => ({ success: true, msgArray: [
        {
          id: 9191484, sender_id: "72248", receiver_id: "63050", content: staleContent, viewed: 1
        },
        {
          id: 9191485, sender_id: "72248", receiver_id: "63050", content: laterContent, viewed: 1
        },
        {
          id: 9191618, sender_id: "63050", receiver_id: "72248", content: "我就用用ai，问题不大的，好的，谢了"
        }
      ] }) };
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
  sandbox.fetchLuckyCurrentUser = async () => ({ member_id: "72248" });
  stored.telegramOutgoingMessageEchoes.push(
    {
      userId: "63050",
      fingerprint: await vm.runInContext(
        `getTelegramOutgoingEchoFingerprint("63050", ${JSON.stringify(staleContent)})`, sandbox
      ),
      originChatId: "333",
      originTopicId: "93523",
      originTopicName: "szhhaoo",
      baselineMessageId: "9191340",
      status: "sending",
      createdAt: Date.now() - 60_000
    },
    {
      userId: "63050",
      fingerprint: await vm.runInContext(
        `getTelegramOutgoingEchoFingerprint("63050", ${JSON.stringify(laterContent)})`, sandbox
      ),
      originChatId: "333",
      originTopicId: "93523",
      originTopicName: "szhhaoo",
      baselineMessageId: "9191364",
      status: "sent",
      createdAt: Date.now() - 30_000
    }
  );

  await vm.runInContext(`checkForNewNodeSeekMessages(${JSON.stringify({
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }],
    telegramMessageCursors: stored.telegramMessageCursors,
    telegramManagedTopics: stored.telegramManagedTopics
  })})`, sandbox);

  expect(telegramSends).toEqual([expect.objectContaining({
    chat_id: "333", message_thread_id: 93523, text: "我就用用ai，问题不大的，好的，谢了"
  })]);
  expect(stored.telegramMessageCursors["63050:72248"]).toBe("9191618");
  expect(stored.telegramOutgoingMessageEchoes).toHaveLength(0);
});

test("a recent sending echo remains pending during its delivery grace period", async () => {
  const content = "刚发送的 Telegram 回信";
  const stored = { telegramOutgoingMessageEchoes: [] };
  const sandbox = createSandbox();
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  stored.telegramOutgoingMessageEchoes.push({
    userId: "63050",
    fingerprint: await vm.runInContext(
      `getTelegramOutgoingEchoFingerprint("63050", ${JSON.stringify(content)})`, sandbox
    ),
    baselineMessageId: "9191364",
    status: "sending",
    createdAt: Date.now()
  });

  const result = await vm.runInContext(
    `consumeTelegramOutgoingEcho("63050", ${JSON.stringify(content)}, "9191484")`, sandbox
  );

  expect(result).toEqual({ pending: true });
  expect(stored.telegramOutgoingMessageEchoes).toHaveLength(1);
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

test("managed topic categories use distinct icons and colors while user topics share one style", async () => {
  const stored = { telegramManagedTopics: [] };
  const createdTopics = [];
  const copyNotices = [];
  let nextTopicId = 500;
  const sandbox = createSandbox(async (url, options = {}) => {
    if (url.endsWith("/createForumTopic")) {
      createdTopics.push(JSON.parse(options.body));
      nextTopicId += 1;
      return { ok: true, json: async () => ({ ok: true, result: { message_thread_id: nextTopicId } }) };
    }
    if (url.endsWith("/sendMessage")) {
      copyNotices.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };

  for (const kind of ["system", "rss", "mention", "reply", "dm"]) {
    await vm.runInContext(`getOrCreateManagedTelegramTopic("token", "333", ${JSON.stringify(kind)}, {
      userId: "222", userName: "Alice"
    })`, sandbox);
  }

  expect(createdTopics).toEqual([
    { chat_id: "333", name: "系统", icon_color: 16766590, icon_custom_emoji_id: "5309984423003823246" },
    { chat_id: "333", name: "监控", icon_color: 9367192, icon_custom_emoji_id: "5309965701241379366" },
    { chat_id: "333", name: "提及", icon_color: 16478047, icon_custom_emoji_id: "5379748062124056162" },
    { chat_id: "333", name: "回复", icon_color: 13338331, icon_custom_emoji_id: "5417915203100613993" },
    expect.objectContaining({ chat_id: "333", name: "Alice", icon_color: 7322096 })
  ]);
  const topicIconIds = vm.runInContext("TELEGRAM_DM_TOPIC_ICONS.map((icon) => icon.customEmojiId)", sandbox);
  expect(topicIconIds).toHaveLength(74);
  expect(new Set(topicIconIds).size).toBe(topicIconIds.length);
  expect(topicIconIds).toContain(createdTopics[4].icon_custom_emoji_id);
  expect(new Set(createdTopics.map((topic) => topic.icon_color)).size).toBe(5);
  expect(stored.telegramManagedTopics.map((topic) => topic.name)).toEqual(["系统", "监控", "提及", "回复", "Alice"]);
  expect(stored.telegramManagedTopics[4].dmAnimalIconVersion).toBe(1);
  expect(copyNotices).toEqual([{
    chat_id: "333",
    message_thread_id: 505,
    text: "Alice 开启了和你的私聊",
    disable_web_page_preview: true,
    disable_notification: false,
    entities: [{ type: "code", offset: 0, length: 5 }]
  }]);
});

test("existing managed DM topics get one saved random topic icon without attempting to recolor", async () => {
  const stored = {
    telegramManagedTopics: [{
      id: "dm-1", kind: "dm", chatId: "333", topicId: "456", nsUserId: "222", name: "Alice",
      iconCustomEmojiId: "5370870893004203704"
    }]
  };
  const editedTopics = [];
  const sandbox = createSandbox(async (url, options = {}) => {
    if (!url.endsWith("/editForumTopic")) throw new Error(`Unexpected request: ${url}`);
    editedTopics.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ ok: true }) };
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  let randomCount = 0;
  sandbox.Math = Object.create(Math);
  sandbox.Math.random = () => { randomCount += 1; return 0; };

  const topic = await vm.runInContext(`getOrCreateManagedTelegramTopic("token", "333", "dm", {
    userId: "222", userName: "Alice"
  })`, sandbox);
  const repeatedTopic = await vm.runInContext(`getOrCreateManagedTelegramTopic("token", "333", "dm", {
    userId: "222", userName: "Alice"
  })`, sandbox);

  expect(editedTopics).toEqual([{
    chat_id: "333", message_thread_id: 456, icon_custom_emoji_id: "5312241539987020022"
  }]);
  expect(topic.iconCustomEmojiId).toBe("5312241539987020022");
  expect(topic.dmAnimalIconVersion).toBe(1);
  expect(repeatedTopic.iconCustomEmojiId).toBe(topic.iconCustomEmojiId);
  expect(randomCount).toBe(1);
  expect(editedTopics).toHaveLength(1);
});

test("private message sync mirrors both directions into one mapped user topic", async () => {
  const stored = {
    telegramManagedTopics: [],
    telegramSystemNotificationUserId: "",
    telegramMessageCursors: { "222:777": "1" }
  };
  let outgoingViewed = 0;
  const telegramSends = [];
  const topicEdits = [];
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
              content: "我主动发出的消息",
              viewed: outgoingViewed
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
      expect(body).toEqual({
        chat_id: "333",
        name: "Anderlille",
        icon_color: 7322096,
        icon_custom_emoji_id: "5312241539987020022"
      });
      return {
        ok: true,
        json: async () => ({ ok: true, result: { message_thread_id: 456 } })
      };
    }
    if (url.endsWith("/getForumTopicIconStickers")) {
      return { ok: true, json: async () => ({ ok: true, result: [
        { emoji: "👀", custom_emoji_id: "eyes-icon" }
      ] }) };
    }
    if (url.endsWith("/editForumTopic")) {
      topicEdits.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true, result: true }) };
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
  sandbox.Math = Object.create(Math);
  sandbox.Math.random = () => 0;
  const config = {
    telegramBotToken: "123456:secret",
    telegramTargets: [{ type: "personal", chatId: "333", enabled: true }],
    telegramMessageCursors: stored.telegramMessageCursors,
    telegramManagedTopics: []
  };

  await vm.runInContext(`checkForNewNodeSeekMessages(${JSON.stringify(config)})`, sandbox);

  expect(requestedUrls).toContain("https://www.nodeseek.com/api/notification/message/with/222");
  expect(telegramSends).toHaveLength(3);
  expect(telegramSends.map((message) => message.message_thread_id)).toEqual([456, 456, 456]);
  expect(telegramSends[0]).toMatchObject({
    text: "Anderlille 开启了和你的私聊",
    entities: [{ type: "code", offset: 0, length: 10 }]
  });
  expect(telegramSends.slice(1).map((message) => message.text)).toEqual(["我：我主动发出的消息", "对方回复的消息"]);
  expect(stored.telegramManagedTopics).toHaveLength(1);
  expect(stored.telegramManagedTopics[0]).toMatchObject({
    kind: "dm",
    chatId: "333",
    topicId: "456",
    name: "Anderlille",
    nsUserId: "222"
  });
  expect(topicEdits).toEqual([{
    chat_id: "333",
    message_thread_id: 456,
    name: "Anderlille",
    icon_custom_emoji_id: "eyes-icon"
  }]);
  expect(Object.values(stored.telegramOutgoingMessageReadStatuses)[0]).toMatchObject({
    userId: "222",
    messageId: "2",
    readState: "unread",
    markerType: "topic-icon-eyes",
    markerApplied: true
  });
  expect(stored.telegramMessageCursors["222:777"]).toBe("3");

  outgoingViewed = 1;
  expect(await vm.runInContext('checkPendingTelegramOutgoingReadStatuses("123456:secret")', sandbox)).toBe(true);
  expect(topicEdits[1]).toEqual({
    chat_id: "333",
    message_thread_id: 456,
    name: "Anderlille",
    icon_custom_emoji_id: "5312241539987020022"
  });
  expect(stored.telegramOutgoingMessageReadStatuses).toEqual({});
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
  const sentMessages = [];
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
      sentMessages.push(JSON.parse(options.body));
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
  expect(sentMessages).toHaveLength(2);
  expect(sentMessages.map((message) => message.text)).toEqual([
    "other-user 开启了和你的私聊",
    "new message"
  ]);
  expect(sentMessages[0].entities).toEqual([{ type: "code", offset: 0, length: 10 }]);
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

test("Telegram tells the topic user to enable image hosting and keeps the update for retry", async () => {
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
  expect(telegramMessages[0].text).toContain("https://www.nodeimage.com/");
  expect(stored.telegramProcessedTopicUpdateIds || []).not.toContain("789");
  expect(stored.telegramPendingTopicUpdates).toEqual([expect.objectContaining({
    updateIds: ["789"],
    attempts: 1,
    failureNotified: true
  })]);
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
  sandbox.getNodeSeekTelegramSendBaselineMessageId = async () => "0";
  sandbox.findNodeSeekOutgoingMessageForTelegramEcho = async () => null;
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

test("unread Telegram-originated NodeSeek messages mark the mapped topic icon and read restores it", async () => {
  const stored = {
    telegramManagedTopics: [{
      id: "dm-1", kind: "dm", chatId: "333", topicId: "456", nsUserId: "222", name: "Alice",
      iconCustomEmojiId: "animal-icon"
    }],
    telegramOutgoingMessageReadStatuses: {}
  };
  const topicEdits = [];
  const sandbox = createSandbox(async (url, options = {}) => {
    if (url.endsWith("/getForumTopicIconStickers")) {
      return { ok: true, json: async () => ({ ok: true, result: [
        { emoji: "👀", custom_emoji_id: "eyes-icon" }
      ] }) };
    }
    if (url.endsWith("/editForumTopic")) {
      topicEdits.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true, result: true }) };
    }
    if (url === "https://www.nodeseek.com/api/notification/message/with/222") {
      return { ok: true, json: async () => ({ success: true, msgArray: [{
        id: 900, sender_id: "777", receiver_id: "222", content: "TG 回信", viewed: 1
      }] }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };

  await vm.runInContext(`recordTelegramOutgoingReadStatus("123456:secret", {
    userId: "222", originChatId: "333", originTopicId: "456", originTopicName: "Alice"
  }, { id: 900, viewed: 0 })`, sandbox);

  expect(topicEdits).toEqual([{
    chat_id: "333", message_thread_id: 456, name: "Alice", icon_custom_emoji_id: "eyes-icon"
  }]);
  expect(stored.telegramManagedTopics[0].iconCustomEmojiId).toBe("animal-icon");
  expect(Object.values(stored.telegramOutgoingMessageReadStatuses)[0]).toMatchObject({
    messageId: "900", readState: "unread", markerType: "topic-icon-eyes", markerApplied: true,
    topicIconBeforeMarker: "animal-icon"
  });

  const resolved = await vm.runInContext('checkPendingTelegramOutgoingReadStatuses("123456:secret")', sandbox);
  expect(resolved).toBe(true);
  expect(topicEdits[1]).toEqual({
    chat_id: "333", message_thread_id: 456, name: "Alice", icon_custom_emoji_id: "animal-icon"
  });
  expect(stored.telegramOutgoingMessageReadStatuses).toEqual({});
});

test("unread marker is not applied when the topic has no saved icon to restore", async () => {
  const stored = {
    telegramManagedTopics: [{ id: "dm-1", kind: "dm", chatId: "333", topicId: "456", name: "Alice" }]
  };
  let telegramRequests = 0;
  const sandbox = createSandbox(async () => {
    telegramRequests += 1;
    return { ok: true, json: async () => ({ ok: true, result: [] }) };
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored })
  } } };

  const marked = await vm.runInContext(`editTelegramTopicReadMarker("token", {
    chatId: "333", topicId: "456", topicName: "Alice"
  }, true)`, sandbox);

  expect(marked).toBe(false);
  expect(telegramRequests).toBe(0);
});

test("existing unread topic marker updates in place to the eyes icon", async () => {
  const stored = {
    telegramManagedTopics: [{
      id: "dm-1", kind: "dm", chatId: "333", topicId: "456", nsUserId: "222", name: "Alice",
      iconCustomEmojiId: "animal-icon"
    }],
    telegramOutgoingMessageReadStatuses: {
      "333:456": {
        chatId: "333", topicId: "456", userId: "222", messageId: "900",
        topicName: "Alice", topicIconBeforeMarker: "animal-icon", readState: "unread",
        markerType: "name", markerApplied: true
      }
    }
  };
  const topicEdits = [];
  const sandbox = createSandbox(async (url, options = {}) => {
    if (url.endsWith("/getForumTopicIconStickers")) {
      return { ok: true, json: async () => ({ ok: true, result: [
        { emoji: "👀", custom_emoji_id: "eyes-icon" }
      ] }) };
    }
    if (url.endsWith("/editForumTopic")) {
      topicEdits.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true, result: true }) };
    }
    if (url === "https://www.nodeseek.com/api/notification/message/with/222") {
      return { ok: true, json: async () => ({ success: true, msgArray: [{
        id: 900, sender_id: "222", receiver_id: "777", content: "TG 回信", viewed: 0
      }] }) };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };

  await vm.runInContext('checkPendingTelegramOutgoingReadStatuses("123456:secret")', sandbox);

  expect(topicEdits).toEqual([{
    chat_id: "333", message_thread_id: 456, name: "Alice", icon_custom_emoji_id: "eyes-icon"
  }]);
  expect(stored.telegramManagedTopics[0]).toMatchObject({ topicId: "456", name: "Alice" });
  expect(stored.telegramOutgoingMessageReadStatuses["333:456"]).toMatchObject({
    messageId: "900", markerType: "topic-icon-eyes", markerApplied: true,
    topicIconBeforeMarker: "animal-icon"
  });
});
