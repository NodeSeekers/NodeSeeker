const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../options/options.js"), "utf8");

function extractFunction(name) {
  const asyncStart = source.indexOf(`async function ${name}(`);
  const start = asyncStart >= 0 ? asyncStart : source.indexOf(`function ${name}(`);
  const end = source.indexOf("\n}", start) + 2;
  return source.slice(start, end);
}

test("offline-message switch defaults on and persists each toggle", async () => {
  const storage = {};
  const classes = new Set();
  const attributes = {};
  const button = {
    classList: { toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) },
    setAttribute: (name, value) => { attributes[name] = value; },
    title: ""
  };
  const sandbox = vm.createContext({
    chrome: { storage: { local: {
      get: async (defaults) => ({ ...defaults, ...storage }),
      set: async (values) => Object.assign(storage, values)
    } } },
    document: { querySelector: () => button },
    showToast: () => {}
  });
  vm.runInContext([
    extractFunction("toggleTelegramOfflineMessageSync"),
    extractFunction("renderTelegramOfflineMessageSync")
  ].join("\n"), sandbox);

  vm.runInContext("renderTelegramOfflineMessageSync({})", sandbox);
  expect(attributes["aria-checked"]).toBe("true");
  expect(classes.has("is-monitoring")).toBe(true);

  await vm.runInContext("toggleTelegramOfflineMessageSync()", sandbox);
  expect(storage.telegramOfflineMessageSyncEnabled).toBe(false);
  expect(attributes["aria-checked"]).toBe("false");
  expect(classes.has("is-paused")).toBe(true);

  await vm.runInContext("toggleTelegramOfflineMessageSync()", sandbox);
  expect(storage.telegramOfflineMessageSyncEnabled).toBe(true);
  expect(attributes["aria-checked"]).toBe("true");
});

test("silent-push switch defaults off and persists each toggle", async () => {
  const storage = {};
  const classes = new Set();
  const attributes = {};
  const button = {
    classList: { toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) },
    setAttribute: (name, value) => { attributes[name] = value; },
    title: ""
  };
  const sandbox = vm.createContext({
    chrome: { storage: { local: {
      get: async (defaults) => ({ ...defaults, ...storage }),
      set: async (values) => Object.assign(storage, values)
    } } },
    document: { querySelector: () => button },
    showToast: () => {}
  });
  vm.runInContext([
    extractFunction("toggleTelegramSilentPush"),
    extractFunction("renderTelegramSilentPush")
  ].join("\n"), sandbox);

  vm.runInContext("renderTelegramSilentPush({})", sandbox);
  expect(attributes["aria-checked"]).toBe("false");
  expect(classes.has("is-monitoring")).toBe(false);

  await vm.runInContext("toggleTelegramSilentPush()", sandbox);
  expect(storage.telegramSilentPushEnabled).toBe(true);
  expect(attributes["aria-checked"]).toBe("true");
  expect(classes.has("is-monitoring")).toBe(true);

  await vm.runInContext("toggleTelegramSilentPush()", sandbox);
  expect(storage.telegramSilentPushEnabled).toBe(false);
  expect(attributes["aria-checked"]).toBe("false");
});

test("typing a Bot Token schedules automatic validation without a separate button", () => {
  const calls = [];
  const delays = [];
  const sandbox = vm.createContext({
    window: {
      clearTimeout: () => {},
      setTimeout: (_callback, delay) => {
        delays.push(delay);
        return 1;
      }
    },
    document: { querySelector: () => ({ value: "test-token" }) },
    telegramTokenValidationTimer: 0,
    telegramTokenValidationRequestId: 0,
    telegramValidatedToken: "previous-token",
    telegramTokenValidationState: "valid",
    setTelegramTokenStatus: (...args) => calls.push({ status: args }),
    syncTelegramSetupVisibility: () => calls.push("sync visibility"),
    scheduleTelegramConfigSave: (options) => calls.push({ save: options })
  });
  vm.runInContext(extractFunction("handleTelegramBotTokenInput"), sandbox);
  vm.runInContext("handleTelegramBotTokenInput()", sandbox);

  expect(Array.from(calls)).toEqual([
    { status: ["输入完成后自动验证…", "checking"] },
    "sync visibility"
  ]);
  expect(delays).toEqual([650]);
  expect(sandbox.telegramValidatedToken).toBe("");
  expect(calls.filter((call) => typeof call === "object" && "save" in call)).toHaveLength(0);
});

test("Telegram keyword expression groups alternatives and requires every group", () => {
  const sandbox = vm.createContext({
    keywordInput: "(海创/Hytron),(一折/1折)"
  });
  vm.runInContext([
    extractFunction("parseTelegramKeywordRules"),
    extractFunction("parseTelegramKeywordExpression"),
    extractFunction("flattenTelegramKeywordTermGroups")
  ].join("\n"), sandbox);

  const rules = vm.runInContext("parseTelegramKeywordRules(keywordInput)", sandbox);
  expect(JSON.parse(JSON.stringify(rules[0].termGroups)))
    .toEqual([["海创", "Hytron"], ["一折", "1折"]]);
  expect(JSON.parse(JSON.stringify(rules[0].terms)))
    .toEqual(["海创", "Hytron", "一折", "1折"]);
  expect(vm.runInContext('parseTelegramKeywordExpression("(海创/),1折")', sandbox)).toEqual([]);
});

test("Telegram keyword rule can add and edit grouped alternatives", () => {
  const keywordInput = { value: "(海创/Hytron),(一折/1折)" };
  const excludeInput = { value: "出, yt" };
  const button = { textContent: "添加", title: "" };
  let id = 0;
  const sandbox = vm.createContext({
    crypto: { randomUUID: () => `rule-${++id}` },
    document: {
      querySelector: (selector) => selector === "#telegramKeywordInput"
        ? keywordInput
        : selector === "#telegramKeywordExcludeInput" ? excludeInput : button
    },
    showToast: () => {},
    telegramKeywordEditingRuleId: ""
  });
  vm.runInContext([
    extractFunction("parseTelegramKeywordRules"),
    extractFunction("parseTelegramKeywordExpression"),
    extractFunction("flattenTelegramKeywordTermGroups"),
    extractFunction("normalizeTelegramKeywordTermGroups"),
    extractFunction("parseTelegramTextList"),
    extractFunction("getTelegramKeywordRuleTermGroups"),
    extractFunction("formatTelegramKeywordExpression"),
    extractFunction("getTelegramKeywordRuleIdentity"),
    extractFunction("setTelegramKeywordEditingRule"),
    extractFunction("addTelegramKeywordRule")
  ].join("\n"), sandbox);
  sandbox.telegramKeywordRules = [];
  sandbox.renderTelegramKeywordRules = () => {};
  sandbox.persistTelegramKeywordRules = async () => {};
  vm.runInContext("addTelegramKeywordRule()", sandbox);
  expect(sandbox.telegramKeywordRules).toHaveLength(1);
  expect(JSON.parse(JSON.stringify(sandbox.telegramKeywordRules[0].termGroups)))
    .toEqual([["海创", "Hytron"], ["一折", "1折"]]);

  sandbox.telegramKeywordEditingRuleId = sandbox.telegramKeywordRules[0].id;
  keywordInput.value = "(海创/Hytron),(五折/5折)";
  excludeInput.value = "出";
  vm.runInContext("addTelegramKeywordRule()", sandbox);
  expect(sandbox.telegramKeywordRules).toHaveLength(1);
  expect(JSON.parse(JSON.stringify(sandbox.telegramKeywordRules[0].termGroups)))
    .toEqual([["海创", "Hytron"], ["五折", "5折"]]);
});
