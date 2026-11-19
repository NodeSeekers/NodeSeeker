const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const sharedSource = fs.readFileSync(path.join(root, "options/shared.js"), "utf8");
const syncSource = fs.readFileSync(path.join(root, "options/sync.js"), "utf8");
const backupSchemaSource = fs.readFileSync(path.join(root, "src/backup-schema.js"), "utf8");
const databaseConstantsSource = fs.readFileSync(path.join(root, "src/background/constants.js"), "utf8");

function extractDeclaration(source, name) {
  const start = source.indexOf(name);
  const end = source.indexOf("\n};", start) + 3;
  if (start < 0 || end < 3) throw new Error(`Declaration not found: ${name}`);
  return source.slice(start, end);
}

function extractFunction(name) {
  const start = syncSource.indexOf(name);
  const end = syncSource.indexOf("\n}\n", start) + 2;
  if (start < 0 || end < 2) throw new Error(`Function not found: ${name}`);
  return syncSource.slice(start, end);
}

function createBackupSandbox(currentConfig = {}) {
  const sandbox = vm.createContext({
    DEFAULT_OPTIONS: {
      blockedKeywords: [],
      followRules: { keywordGroups: [], userGroups: [] },
      readingNavigationEnabled: true
    },
    chrome: { storage: { local: { get: async () => currentConfig } } },
    normalizeStoredOptions: (options) => options,
    normalizeSyncString: (value, fallback) => String(value || "").trim() || fallback,
    isPlainObject: (value) => Boolean(value && typeof value === "object" && !Array.isArray(value))
  });
  vm.runInContext(backupSchemaSource, sandbox);
  vm.runInContext([
    extractDeclaration(sharedSource, "const TELEGRAM_SYNC_CONFIG_DEFAULTS = {"),
    extractDeclaration(sharedSource, "const SYNC_CONFIG_DEFAULTS = {"),
    extractDeclaration(sharedSource, "const CONFIG_BACKUP_EXTRA_DEFAULTS = {"),
    extractDeclaration(sharedSource, "const CONFIG_BACKUP_DEFAULTS = {")
  ].join("\n"), sandbox);
  vm.runInContext([
    "const SYNC_CONFIG_KEYS = Object.keys(SYNC_CONFIG_DEFAULTS);",
    "const CONFIG_BACKUP_KEYS = Object.keys(CONFIG_BACKUP_DEFAULTS);",
    extractFunction("async function buildConfigImportOptions("),
    extractFunction("function detectBackupType("),
    extractFunction("function normalizeFullBackupLocalState("),
    extractFunction("function validateFullBackupDatabase("),
    extractFunction("function extractConfigPayload("),
    extractFunction("function normalizeConfigBackupOptions("),
    extractFunction("function normalizeSyncConfigOptions("),
    extractFunction("function pickSyncConfigOptions("),
    extractFunction("function pickConfigBackupOptions("),
    extractFunction("function normalizeSyncString(")
  ].join("\n"), sandbox);
  return sandbox;
}

test("configuration schema covers settings, Telegram rules, and topic mappings", () => {
  const sandbox = createBackupSandbox();
  const backupDefaults = vm.runInContext("CONFIG_BACKUP_DEFAULTS", sandbox);

  expect(backupDefaults).toMatchObject({
    followRules: { keywordGroups: [], userGroups: [] },
    blockedKeywords: [],
    telegramKeywordRules: [],
    telegramBlockedKeywords: [],
    telegramBoardSlugs: [],
    telegramTargets: [],
    telegramManagedTopics: [],
    telegramSettingsTopics: [],
    telegramSilentPushEnabled: false,
    telegramNotificationDefaultsMigrationV1: false
  });
  expect(vm.runInContext("CONFIG_BACKUP_KEYS", sandbox)).toEqual(expect.arrayContaining([
    "followRules",
    "blockedKeywords",
    "telegramKeywordRules",
    "telegramTargets",
    "telegramManagedTopics",
    "telegramSettingsTopics",
    "telegramBotToken"
  ]));
});

test("importing a legacy partial config preserves current settings and topic mappings", async () => {
  const currentConfig = {
    telegramBotToken: "saved-token",
    telegramTargets: [{ chatId: "-100123", topicId: "55", enabled: false }],
    telegramManagedTopics: [{ nsUserId: "42", topicId: "99" }],
    telegramSettingsTopics: [{ chatId: "-100123", topicId: "77" }],
    telegramMonitorPaused: true
  };
  const sandbox = createBackupSandbox(currentConfig);
  const imported = await vm.runInContext(
    "buildConfigImportOptions({ options: { readingNavigationEnabled: true } })",
    sandbox
  );

  expect(imported.telegramBotToken).toBe("saved-token");
  expect(imported.telegramTargets).toEqual(currentConfig.telegramTargets);
  expect(imported.telegramManagedTopics).toEqual(currentConfig.telegramManagedTopics);
  expect(imported.telegramSettingsTopics).toEqual(currentConfig.telegramSettingsTopics);
  expect(imported.telegramMonitorPaused).toBe(true);
  expect(imported.readingNavigationEnabled).toBe(true);
});

test("config export and restore round-trip content and Telegram rules", async () => {
  const values = {
    telegramMessageNotificationsEnabled: true,
    telegramPostNotificationsEnabled: false,
    telegramSystemFollowNotificationsEnabled: true,
    telegramSystemFeedNotificationsEnabled: false,
    telegramSystemLikeNotificationsEnabled: true,
    telegramMonitorPaused: true,
    telegramBotToken: "test-token",
    telegramTargets: [{ id: "target-1", chatId: "123456", topicId: "77", enabled: false }],
    telegramManagedTopics: [{ nsUserId: "42", topicId: "99", name: "someone" }],
    telegramSettingsTopics: [{ chatId: "123456", topicId: "88", name: "Settings" }],
    followRules: {
      keywordGroups: [{ id: "content-rule", name: "台湾家宽", enabled: true, rules: [
        { id: "rule-1", enabled: true, mode: "all", terms: ["台湾", "家宽"], excludeTerms: ["已出"] }
      ] }],
      userGroups: []
    },
    telegramKeywordRules: [{ id: "rss-rule", terms: ["v.ps", "gen2"], mode: "all", excludeTerms: ["已出"], enabled: true }],
    telegramBlockedKeywords: ["求购"],
    telegramBoardSlugs: ["daily", "hosting"]
  };
  const sandbox = createBackupSandbox(values);
  const exported = vm.runInContext(
    `pickConfigBackupOptions(normalizeConfigBackupOptions(${JSON.stringify(values)}))`,
    sandbox
  );
  const imported = await vm.runInContext(
    `buildConfigImportOptions({ options: ${JSON.stringify(exported)} })`,
    sandbox
  );

  for (const key of [
    "followRules",
    "telegramKeywordRules",
    "telegramBlockedKeywords",
    "telegramBoardSlugs",
    "telegramTargets",
    "telegramManagedTopics",
    "telegramSettingsTopics",
    "telegramMonitorPaused",
    "telegramSystemFollowNotificationsEnabled",
    "telegramSystemFeedNotificationsEnabled",
    "telegramSystemLikeNotificationsEnabled"
  ]) {
    expect(imported[key]).toEqual(values[key]);
  }
});

test("one restore action identifies config, full, and legacy data files", () => {
  const sandbox = createBackupSandbox();
  const detect = (payload) => vm.runInContext(`detectBackupType(${JSON.stringify(payload)})`, sandbox);

  expect(detect({ schema: "nodeseek-helper-config", version: 1, options: { telegramBotToken: "x" } })).toBe("config");
  expect(detect({
    schema: "nodeseek-helper-full-backup",
    version: 1,
    configuration: { options: {} },
    localState: {},
    database: { schema: "nodeseek-helper-data", stores: {} }
  })).toBe("full");
  expect(detect({ schema: "nodeseek-helper-data", version: 1, stores: {} })).toBe("legacy-data");
});

test("full backup omits unfinished Telegram actions but keeps checkpoints and history", () => {
  const sandbox = createBackupSandbox();
  const localState = vm.runInContext(`normalizeFullBackupLocalState(${JSON.stringify({
    telegramPendingTopicUpdates: [{ text: "do not replay" }],
    telegramRetryStates: { dm: { attempt: 2 } },
    telegramMessageCursors: { "42:99": "123" },
    telegramRssSeenIds: ["post-1"],
    telegramRssHistory: [{ id: "post-1" }],
    telegramPersonalStartOffset: 12345,
    nshAttendanceReminder: { dateKey: "2026-11-19" },
    telegramBotToken: "separate config field"
  })})`, sandbox);

  expect(localState).toEqual({
    telegramMessageCursors: { "42:99": "123" },
    telegramRssSeenIds: ["post-1"],
    telegramRssHistory: [{ id: "post-1" }],
    telegramPersonalStartOffset: 12345,
    nshAttendanceReminder: { dateKey: "2026-11-19" }
  });
});

test("complete backup validation requires every current IndexedDB store", () => {
  const sandbox = createBackupSandbox();
  const validStores = Object.fromEntries(vm.runInContext("BACKUP_DATABASE_STORE_NAMES", sandbox).map((name) => [name, []]));
  const valid = vm.runInContext(`validateFullBackupDatabase(${JSON.stringify({
    schema: "nodeseek-helper-data",
    version: 1,
    stores: validStores
  })})`, sandbox);

  expect(valid.stores).toEqual(validStores);
  expect(() => vm.runInContext(`validateFullBackupDatabase(${JSON.stringify({
    schema: "nodeseek-helper-data",
    version: 1,
    stores: { profiles: [] }
  })})`, sandbox)).toThrow("完整备份缺少资料表");
});

test("full backup store registry matches every current IndexedDB object store", () => {
  const sandbox = createBackupSandbox();
  const backupStores = Array.from(vm.runInContext("BACKUP_DATABASE_STORE_NAMES", sandbox));
  const databaseStores = Array.from(databaseConstantsSource.matchAll(/const STORE_[A-Z_]+ = "([^"]+)";/g))
    .map((match) => match[1]);

  expect(backupStores.sort()).toEqual(databaseStores.sort());
});
