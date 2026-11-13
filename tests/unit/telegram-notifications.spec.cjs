const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/background/telegram-notifications.js"), "utf8");

function createSandbox(fetch = global.fetch) {
  const sandbox = vm.createContext({
    crypto: webcrypto,
    URL,
    Set,
    Object,
    String,
    Number,
    encodeURIComponent,
    TELEGRAM_PERSONAL_START_ALARM_NAME: "nshTelegram:personal-start",
    fetch
  });
  vm.runInContext(source, sandbox);
  return sandbox;
}

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
  const xml = `<rss><channel><item><title><![CDATA[关键字云服务器]]></title>
    <link>https://www.nodeseek.com/post-54321-1</link>
    <guid>https://www.nodeseek.com/post-54321-1</guid><category>日常</category></item></channel></rss>`;
  const sandbox = createSandbox(async () => ({ ok: true, text: async () => xml }));
  sandbox.chrome = { storage: { local: { set: async () => {} } } };
  sandbox.sendTelegramToTargets = async (_config, text) => sentMessages.push(text);
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
  expect(sentMessages[0]).toContain("板块：日常");
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
  sandbox.chrome = {
    storage: { local: {
      get: async () => ({ telegramBotToken: stored.telegramBotToken }),
      set: async (values) => Object.assign(stored, values)
    } },
    alarms: { create: async (...args) => { alarm = args; } }
  };

  const startedAt = Date.now();
  await vm.runInContext("startTelegramPersonalStartWatch()", sandbox);

  expect(alarm).toEqual(["nshTelegram:personal-start", { delayInMinutes: 0.5, periodInMinutes: 0.5 }]);
  expect(stored.telegramPersonalStartWatchUntil).toBeGreaterThanOrEqual(startedAt + 5 * 60 * 1000);
  expect(stored.telegramPersonalStartWatchSince).toBeGreaterThanOrEqual(Math.floor(startedAt / 1000));
});

test("personal /start listener fills Chat ID, replies, and stops its alarm", async () => {
  const startTime = Math.floor(Date.now() / 1000) - 1;
  const stored = {
    telegramBotToken: "123456:secret",
    telegramPersonalStartWatchUntil: Date.now() + 5 * 60 * 1000,
    telegramPersonalStartWatchSince: startTime
  };
  const sentReplies = [];
  const runtimeMessages = [];
  let clearedAlarm = "";
  const sandbox = createSandbox(async (url) => {
    expect(url).toContain("getUpdates?limit=100");
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: [{
          update_id: 91,
          message: { date: Date.now() / 1000, chat: { type: "private", id: 222 }, text: "/start" }
        }]
      })
    };
  });
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
    alarms: { clear: async (name) => { clearedAlarm = name; } },
    runtime: { sendMessage: async (message) => runtimeMessages.push(message) }
  };
  sandbox.sendTelegramMessage = async (...args) => sentReplies.push(args);

  await vm.runInContext("checkTelegramPersonalStartWatch()", sandbox);

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
  expect(sentReplies[0][2]).toContain("接收目标已添加");
  expect(runtimeMessages).toContainEqual(expect.objectContaining({
    type: "telegram:personalChatIdDetected",
    chatId: "222",
    targetAdded: true
  }));
});

test("personal /start listener advances past a full old update batch", async () => {
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
    alarms: { clear: async () => {} },
    runtime: { sendMessage: async () => {} }
  };
  sandbox.sendTelegramMessage = async (...args) => replies.push(args);

  await vm.runInContext("checkTelegramPersonalStartWatch()", sandbox);

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
  sandbox.chrome = { storage: { local: {
    get: async (query) => typeof query === "string"
      ? { [query]: stored[query] }
      : { ...query, ...stored },
    set: async (values) => Object.assign(stored, values)
  } } };

  const result = await vm.runInContext('getTelegramDirectTopicId("parent")', sandbox);

  expect(requests.find((url) => url.includes("getUpdates"))).toContain("offset=102");
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

test("private message notifications ignore messages sent by the current user", async () => {
  const sentMessages = [];
  const stored = [];
  const sandbox = createSandbox(async (url) => {
    expect(url).toBe("https://www.nodeseek.com/api/notification/message/list");
    return {
      ok: true,
      json: async () => ({
        success: true,
        msgArray: [
          {
            sender_id: "777",
            receiver_id: "333",
            sender_name: "test_sender",
            content: "我主动发出的消息",
            viewed: false,
            max_id: 2
          },
          {
            sender_id: "222",
            receiver_id: "777",
            sender_name: "other-user",
            content: "别人发给我的消息",
            viewed: false,
            max_id: 2
          }
        ]
      })
    };
  });
  sandbox.chrome = { storage: { local: { set: async (value) => stored.push(value) } } };
  sandbox.fetchLuckyCurrentUser = async () => ({ member_id: "777" });
  sandbox.sendTelegramToTargets = async (_config, text) => sentMessages.push(text);
  const config = { telegramMessageCursors: { "333:777": "1", "222:777": "1" } };

  await vm.runInContext(`checkForNewNodeSeekMessages(${JSON.stringify(config)})`, sandbox);

  expect(sentMessages).toHaveLength(1);
  expect(sentMessages[0]).toContain("发件人：other-user");
  expect(sentMessages[0]).not.toContain("我主动发出的消息");
  expect(stored.at(-1).telegramMessageCursors).toEqual({ "333:777": "2", "222:777": "2" });
});

test("overlapping Telegram monitor checks process a new private message once", async () => {
  const message = {
    sender_id: "222",
    receiver_id: "777",
    sender_name: "other-user",
    content: "new message",
    viewed: false,
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
    telegramRssSeenIds: [],
    telegramRssInitialized: true,
    telegramRssHistory: [],
    telegramMonitorPaused: false
  };
  let releaseFetch;
  const fetchGate = new Promise((resolve) => { releaseFetch = resolve; });
  let listRequestCount = 0;
  let sentCount = 0;
  const sandbox = createSandbox(async () => {
    listRequestCount += 1;
    await fetchGate;
    return { ok: true, json: async () => ({ success: true, msgArray: [message] }) };
  });
  sandbox.chrome = { storage: { local: {
    get: async (defaults) => ({ ...defaults, ...stored }),
    set: async (values) => Object.assign(stored, values)
  } } };
  sandbox.fetchLuckyCurrentUser = async () => ({ member_id: "777" });
  sandbox.sendTelegramToTargets = async () => { sentCount += 1; };

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
