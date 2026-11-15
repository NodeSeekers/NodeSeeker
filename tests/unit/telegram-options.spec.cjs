const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../options/options.js"), "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf("\n}", start) + 2;
  return source.slice(start, end);
}

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

test("Telegram keyword inputs split on commas, 和, and whitespace while preserving symbols", () => {
  const sandbox = vm.createContext({
    keywordInput: "台湾，家宽 和 + \\ /\nv.ps gen2",
    excludedInput: "收出,溢价，+ \\ /"
  });
  vm.runInContext([
    extractFunction("parseTelegramKeywordRules"),
    extractFunction("parseTelegramTextList")
  ].join("\n"), sandbox);

  const rules = vm.runInContext("parseTelegramKeywordRules(keywordInput)", sandbox);
  const excludedTerms = vm.runInContext("parseTelegramTextList(excludedInput)", sandbox);

  expect(JSON.parse(JSON.stringify(rules.map((rule) => rule.terms))))
    .toEqual([["台湾", "家宽", "+", "\\", "/"], ["v.ps", "gen2"]]);
  expect(JSON.parse(JSON.stringify(excludedTerms))).toEqual(["收出", "溢价", "+", "\\", "/"]);
});
