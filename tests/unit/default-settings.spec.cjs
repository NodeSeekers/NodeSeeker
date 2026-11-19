const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const sharedSource = fs.readFileSync(path.join(root, "options/shared.js"), "utf8");
const shortcutsSource = fs.readFileSync(path.join(root, "src/shortcuts.js"), "utf8");
const contentConfigSource = fs.readFileSync(path.join(root, "src/content/config.js"), "utf8");
const syncSource = fs.readFileSync(path.join(root, "options/sync.js"), "utf8");
const preloadedSource = fs.readFileSync(path.join(root, "src/background/preloaded-config.js"), "utf8");
const packageSource = fs.readFileSync(path.join(root, "scripts/package-local.mjs"), "utf8");
const firstInstallConfig = JSON.parse(fs.readFileSync(path.join(root, "examples/nsh-preloaded-config.json"), "utf8"));

function extractDeclaration(source, name) {
  const start = source.indexOf(name);
  const end = source.indexOf("\n};", start) + 3;
  if (start < 0 || end < 3) throw new Error(`Declaration not found: ${name}`);
  return source.slice(start, end);
}

function extractFunction(source, name, nextName) {
  const start = source.indexOf(name);
  const end = source.indexOf(`\n${nextName}`, start);
  if (start < 0 || end < 0) throw new Error(`Function not found: ${name}`);
  return source.slice(start, end);
}

function getShortcutDefinitions(platform) {
  const detectPlatform = extractFunction(
    shortcutsSource,
    "function detectShortcutPlatform() {",
    "function normalizeShortcutFromEvent"
  );
  const shortcutDefaults = extractDeclaration(shortcutsSource, "const DEFAULT_READING_SHORTCUTS = {");
  const sandbox = vm.createContext({ navigator: { platform } });
  vm.runInContext(`${detectPlatform}\n${shortcutDefaults}`, sandbox);
  return JSON.parse(vm.runInContext("JSON.stringify(DEFAULT_READING_SHORTCUTS)", sandbox));
}

function getSharedDefaults(platform = "MacIntel") {
  const declarations = sharedSource.slice(0, sharedSource.indexOf("\nconst form ="));
  const sandbox = vm.createContext({ navigator: { platform } });
  vm.runInContext(`${extractFunction(
    shortcutsSource,
    "function detectShortcutPlatform() {",
    "function normalizeShortcutFromEvent"
  )}\n${extractDeclaration(shortcutsSource, "const DEFAULT_READING_SHORTCUTS = {")}\n${declarations}`, sandbox);
  return JSON.parse(vm.runInContext(`JSON.stringify({
    defaultOptions: DEFAULT_OPTIONS,
    telegramDefaults: TELEGRAM_SYNC_CONFIG_DEFAULTS,
    syncDefaults: SYNC_CONFIG_DEFAULTS,
    backupDefaults: CONFIG_BACKUP_DEFAULTS
  })`, sandbox));
}

function getContentDefaults(platform = "MacIntel") {
  const start = contentConfigSource.indexOf("const DEFAULT_LEVEL_COLORS = {");
  const end = contentConfigSource.indexOf("\nconst MIN_USER_CACHE_HOURS", start);
  if (start < 0 || end < 0) throw new Error("Content defaults not found");
  const sandbox = vm.createContext({ navigator: { platform } });
  vm.runInContext(`${extractFunction(
    shortcutsSource,
    "function detectShortcutPlatform() {",
    "function normalizeShortcutFromEvent"
  )}\n${extractDeclaration(shortcutsSource, "const DEFAULT_READING_SHORTCUTS = {")}\n${contentConfigSource.slice(start, end)}`, sandbox);
  return JSON.parse(vm.runInContext("JSON.stringify(DEFAULT_OPTIONS)", sandbox));
}

function getPackagedOverrides() {
  const match = packageSource.match(/Object\.assign\(configPayload\.options,\s*(\{[\s\S]*?\})\);/);
  if (!match) throw new Error("Package default overrides not found");
  return JSON.parse(JSON.stringify(vm.runInNewContext(`(${match[1]})`)));
}

test("first-install and packaged config include every static setting default", () => {
  const { syncDefaults } = getSharedDefaults();
  const dynamicKeys = ["replySubmitShortcut"];
  const expectedDefaults = Object.fromEntries(Object.entries(syncDefaults)
    .filter(([key]) => !dynamicKeys.includes(key)));

  expect(Object.keys(firstInstallConfig.options).sort()).toEqual(Object.keys(expectedDefaults).sort());
  expect(firstInstallConfig.options).toEqual(expectedDefaults);

  const packagedDefaults = { ...firstInstallConfig.options, ...getPackagedOverrides() };
  expect(Object.fromEntries(Object.keys(expectedDefaults)
    .map((key) => [key, packagedDefaults[key]]))).toEqual(expectedDefaults);
  expect(packagedDefaults).toMatchObject({
    telegramMessageCursors: {},
    telegramMentionReplyCursors: {},
    telegramRssInitialized: false,
    telegramRssSeenIds: []
  });
});

test("reply-submit shortcut keeps its platform-specific first-install default", () => {
  expect(getShortcutDefinitions("MacIntel").replySubmitShortcut).toBe("Meta+Enter");
  expect(getShortcutDefinitions("Win32").replySubmitShortcut).toBe("Ctrl+Enter");
  expect(firstInstallConfig.options).not.toHaveProperty("replySubmitShortcut");
});

test("content defaults match settings defaults except separately handled fields", () => {
  const expected = { ...getSharedDefaults().defaultOptions };
  delete expected.apiKey;
  delete expected.quickJumpEnabled;

  expect(getContentDefaults()).toEqual(expected);
});

test("preloaded importer accepts every first-install setting", () => {
  const sandbox = vm.createContext({ Object });
  const keys = Array.from(vm.runInContext(`${preloadedSource}\nPRELOADED_CONFIG_STORAGE_KEYS`, sandbox));

  expect(keys).toEqual(expect.arrayContaining(Object.keys(firstInstallConfig.options)));
});

test("configuration export and import preserve the complete defaults schema", async () => {
  const { defaultOptions, telegramDefaults, syncDefaults, backupDefaults } = getSharedDefaults();
  const sandbox = vm.createContext({
    DEFAULT_OPTIONS: defaultOptions,
    TELEGRAM_SYNC_CONFIG_DEFAULTS: telegramDefaults,
    SYNC_CONFIG_DEFAULTS: syncDefaults,
    SYNC_CONFIG_KEYS: Object.keys(syncDefaults),
    CONFIG_BACKUP_EXTRA_DEFAULTS: Object.fromEntries(Object.entries(backupDefaults)
      .filter(([key]) => !Object.hasOwn(syncDefaults, key))
      .map(([key, value]) => [key, value])),
    CONFIG_BACKUP_DEFAULTS: backupDefaults,
    CONFIG_BACKUP_KEYS: Object.keys(backupDefaults),
    chrome: { storage: { local: { get: async () => ({}) } } },
    extractConfigPayload: (payload) => payload.options,
    normalizeStoredOptions: (options) => options,
    normalizeSyncString: (value, fallback) => String(value || "").trim() || fallback,
    isPlainObject: (value) => Boolean(value && typeof value === "object" && !Array.isArray(value))
  });
  vm.runInContext([
    extractFunction(syncSource, "async function buildConfigImportOptions(payload) {", "function detectBackupType"),
    extractFunction(syncSource, "function normalizeConfigBackupOptions(value) {", "function normalizeSyncConfigOptions"),
    extractFunction(syncSource, "function normalizeSyncConfigOptions(value) {", "function pickSyncConfigOptions"),
    extractFunction(syncSource, "function pickSyncConfigOptions(options) {", "function pickConfigBackupOptions"),
    extractFunction(syncSource, "function pickConfigBackupOptions(options) {", "function normalizeSyncString"),
    extractFunction(syncSource, "function normalizeSyncString(value, fallback) {", "async function readJsonFile")
  ].join("\n"), sandbox);

  const exported = JSON.parse(vm.runInContext(
    `JSON.stringify(pickConfigBackupOptions(normalizeConfigBackupOptions(${JSON.stringify(backupDefaults)})))`,
    sandbox
  ));
  const imported = JSON.parse(JSON.stringify(await vm.runInContext(
    `buildConfigImportOptions({ options: ${JSON.stringify(exported)} })`,
    sandbox
  )));

  expect(Object.keys(exported).sort()).toEqual(Object.keys(backupDefaults).sort());
  expect(exported.telegramNotificationDefaultsMigrationV1).toBe(true);
  expect(imported).toEqual(exported);
});
