const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sharedSource = fs.readFileSync(path.resolve(__dirname, "../../options/shared.js"), "utf8");
const syncSource = fs.readFileSync(path.resolve(__dirname, "../../options/sync.js"), "utf8");

function extractDeclaration(source, name) {
  const start = source.indexOf(name);
  const end = source.indexOf("\n};", start) + 3;
  return source.slice(start, end);
}

function extractFunction(name) {
  const start = syncSource.indexOf(name);
  const end = syncSource.indexOf("\n}\n", start) + 2;
  return syncSource.slice(start, end);
}

test("configuration backups include editable Telegram settings", () => {
  const sandbox = vm.createContext({
    DEFAULT_OPTIONS: { followRules: { keywordGroups: [], userGroups: [] } }
  });
  vm.runInContext([
    extractDeclaration(sharedSource, "const TELEGRAM_SYNC_CONFIG_DEFAULTS = {"),
    extractDeclaration(sharedSource, "const SYNC_CONFIG_DEFAULTS = {")
  ].join("\n"), sandbox);

  const defaults = vm.runInContext("SYNC_CONFIG_DEFAULTS", sandbox);
  expect(defaults.telegramMessageNotificationsEnabled).toBe(true);
  expect(defaults.telegramPostNotificationsEnabled).toBe(true);
  expect(defaults.telegramOfflineMessageSyncEnabled).toBe(true);
  expect(Object.keys(defaults)).toEqual(expect.arrayContaining([
    "followRules",
    "telegramMessageNotificationsEnabled",
    "telegramPostNotificationsEnabled",
    "telegramOfflineMessageSyncEnabled",
    "telegramMonitorPaused",
    "telegramBotToken",
    "telegramTargets",
    "telegramKeywordRules",
    "telegramBlockedKeywords",
    "telegramBoardSlugs"
  ]));
});

test("importing an older backup preserves current Telegram settings", async () => {
  const currentTelegram = {
    telegramBotToken: "saved-token",
    telegramTargets: [{ chatId: "-100123", topicId: "55", enabled: false }],
    telegramMonitorPaused: true
  };
  const sandbox = vm.createContext({
    TELEGRAM_SYNC_CONFIG_DEFAULTS: { telegramBotToken: "", telegramTargets: [], telegramMonitorPaused: false },
    chrome: { storage: { local: { get: async () => currentTelegram } } },
    extractConfigPayload: (payload) => payload.options,
    normalizeSyncConfigOptions: (options) => options,
    pickSyncConfigOptions: (options) => options
  });
  vm.runInContext(extractFunction("async function buildConfigImportOptions("), sandbox);

  const imported = await vm.runInContext("buildConfigImportOptions({ options: { readingNavigationEnabled: true } })", sandbox);

  expect(imported.telegramBotToken).toBe("saved-token");
  expect(imported.telegramTargets).toEqual(currentTelegram.telegramTargets);
  expect(imported.telegramMonitorPaused).toBe(true);
});

test("new Telegram backup settings override current Telegram settings", async () => {
  const currentTelegram = { telegramBotToken: "old-token", telegramTargets: [] };
  const sandbox = vm.createContext({
    TELEGRAM_SYNC_CONFIG_DEFAULTS: { telegramBotToken: "", telegramTargets: [] },
    chrome: { storage: { local: { get: async () => currentTelegram } } },
    extractConfigPayload: (payload) => payload.options,
    normalizeSyncConfigOptions: (options) => options,
    pickSyncConfigOptions: (options) => options
  });
  vm.runInContext(extractFunction("async function buildConfigImportOptions("), sandbox);

  const imported = await vm.runInContext("buildConfigImportOptions({ options: { telegramBotToken: 'new-token', telegramTargets: [{ chatId: '123' }] } })", sandbox);

  expect(imported.telegramBotToken).toBe("new-token");
  expect(imported.telegramTargets[0].chatId).toBe("123");
});

test("configuration import and export preserve content and RSS match settings", async () => {
  const matchSettings = {
    telegramMessageNotificationsEnabled: true,
    telegramPostNotificationsEnabled: false,
    telegramMonitorPaused: true,
    telegramBotToken: "test-token",
    telegramTargets: [{
      id: "target-1",
      name: "测试接收号",
      type: "personal",
      chatId: "123456",
      topicId: "",
      channelChatId: "",
      enabled: false
    }],
    followRules: {
      keywordGroups: [{
        id: "content-rule",
        name: "台湾家宽",
        enabled: true,
        rules: [
          { id: "content-rule-1", enabled: true, mode: "all", terms: ["台湾", "家宽"], excludeTerms: ["已出"] },
          { id: "content-rule-2", enabled: true, mode: "all", terms: ["TW", "家宽"], excludeTerms: ["已出"] }
        ]
      }],
      userGroups: []
    },
    telegramKeywordRules: [{
      id: "rss-rule",
      terms: ["v.ps", "gen2"],
      mode: "all",
      excludeTerms: ["已出"],
      enabled: true
    }],
    telegramBlockedKeywords: ["求购"],
    telegramBoardSlugs: ["daily", "hosting"]
  };
  const sandbox = vm.createContext({
    DEFAULT_OPTIONS: { followRules: { keywordGroups: [], userGroups: [] } },
    chrome: { storage: { local: { get: async () => matchSettings } } },
    extractConfigPayload: (payload) => payload.options,
    normalizeStoredOptions: (options) => options,
    normalizeSyncString: (value, fallback) => String(value || "").trim() || fallback,
    isPlainObject: (value) => Boolean(value && typeof value === "object" && !Array.isArray(value))
  });
  vm.runInContext([
    extractDeclaration(sharedSource, "const TELEGRAM_SYNC_CONFIG_DEFAULTS = {"),
    extractDeclaration(sharedSource, "const SYNC_CONFIG_DEFAULTS = {"),
    "const SYNC_CONFIG_KEYS = Object.keys(SYNC_CONFIG_DEFAULTS);",
    extractFunction("async function buildConfigImportOptions("),
    extractFunction("function normalizeSyncConfigOptions("),
    extractFunction("function pickSyncConfigOptions(")
  ].join("\n"), sandbox);

  const exported = vm.runInContext(
    `pickSyncConfigOptions(normalizeSyncConfigOptions(${JSON.stringify(matchSettings)}))`,
    sandbox
  );
  const imported = await vm.runInContext(
    `buildConfigImportOptions({ options: ${JSON.stringify(exported)} })`,
    sandbox
  );

  expect(imported.followRules).toEqual(matchSettings.followRules);
  expect(imported.telegramKeywordRules).toEqual(matchSettings.telegramKeywordRules);
  expect(imported.telegramTargets).toEqual(matchSettings.telegramTargets);
  expect(imported.telegramTargets[0].enabled).toBe(false);
  expect(imported.telegramMonitorPaused).toBe(true);
  expect(imported.telegramBlockedKeywords).toEqual(matchSettings.telegramBlockedKeywords);
  expect(imported.telegramBoardSlugs).toEqual(matchSettings.telegramBoardSlugs);
});
