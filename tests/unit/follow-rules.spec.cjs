const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/content/follow-rules.js"), "utf8");
const optionsSource = fs.readFileSync(path.resolve(__dirname, "../../options/follow-rules.js"), "utf8");

function createSandbox() {
  const sandbox = vm.createContext({
    Set,
    Object,
    String,
    Number,
    URL,
    normalizeBlockFilterList: (value) => [...new Set((Array.isArray(value) ? value : String(value || "").split(/\r?\n/))
      .map((item) => String(item || "").replace(/\s+/g, " ").trim()).filter(Boolean))]
  });
  vm.runInContext(source, sandbox);
  return sandbox;
}

function getKeywordDecoration(sandbox, title, group) {
  return vm.runInContext(`(() => {
    const normalized = normalizeFollowRules({ keywordGroups: [${JSON.stringify(group)}] }).keywordGroups
      .filter((entry) => entry.enabled)
      .map((entry) => ({
        ...entry,
        rules: entry.rules.map((rule) => ({
          ...rule,
          normalizedItems: rule.terms.map((item) => item.toLocaleLowerCase()),
          normalizedExcludedItems: rule.excludeTerms.map((item) => item.toLocaleLowerCase())
        }))
      }));
    return getFollowRuleDecoration({
      type: "list",
      titleText: ${JSON.stringify(title)},
      titleElement: null,
      authorElement: null,
      authorName: "",
      avatarElement: null
    }, { keywordGroups: normalized, userGroups: [] });
  })()`, sandbox);
}

function createOptionsSandbox() {
  const node = {
    hidden: false,
    addEventListener() {},
    replaceChildren() {},
    appendChild() {},
    append() {},
    querySelector() { return null; }
  };
  const sandbox = vm.createContext({
    Set,
    Object,
    String,
    Number,
    Math,
    Date,
    crypto: { randomUUID: () => "unit-test-id" },
    document: {
      querySelector: () => node,
      addEventListener() {}
    }
  });
  vm.runInContext(optionsSource, sandbox);
  return sandbox;
}

test("legacy content keyword groups keep their saved terms and normalize to RSS-style AND", () => {
  const sandbox = createSandbox();
  const rules = vm.runInContext(`normalizeFollowRules({ keywordGroups: [
    { id: "legacy-many", name: "多关键词", items: ["VPS", "台湾"], excludeItems: ["已出"] },
    { id: "legacy-one", name: "单关键词", items: ["家宽"] }
  ] })`, sandbox);

  expect(rules.keywordGroups.map((group) => ({
    id: group.id,
    rules: group.rules.map(({ terms, mode, excludeTerms }) => ({ terms, mode, excludeTerms }))
  }))).toEqual([
    { id: "legacy-many", rules: [{ terms: ["VPS", "台湾"], mode: "all", excludeTerms: ["已出"] }] },
    { id: "legacy-one", rules: [{ terms: ["家宽"], mode: "any", excludeTerms: [] }] }
  ]);
});

test("content keyword group keeps independent RSS-style rules and evaluates them as OR", () => {
  const sandbox = createSandbox();
  const group = {
    id: "keyword-test",
    name: "测试",
    rules: [
      { id: "rule-tw1", mode: "all", terms: ["vps", "台湾"], excludeTerms: ["已出"] },
      { id: "rule-tw2", mode: "all", terms: ["tw", "台湾"], excludeTerms: ["其他"] }
    ],
    styles: { showGroupName: true }
  };

  const allMatch = getKeywordDecoration(sandbox, "台湾 VPS 出售", group);
  expect(allMatch.groupBadges.map((badge) => badge.name)).toEqual(["测试"]);
  expect(allMatch.keywordTerms).toEqual(["vps", "台湾"]);
  const secondRuleMatch = getKeywordDecoration(sandbox, "台湾 TW 出售", group);
  expect(secondRuleMatch.keywordTerms).toEqual(["tw", "台湾"]);
  expect(getKeywordDecoration(sandbox, "台湾 TW 已出", group).keywordTerms).toEqual(["tw", "台湾"]);
  expect(getKeywordDecoration(sandbox, "台湾 VPS 已出", group)).toBeNull();
  expect(getKeywordDecoration(sandbox, "台湾", group)).toBeNull();

  const anyGroup = { ...group, rules: [{ ...group.rules[0], mode: "any" }] };
  expect(getKeywordDecoration(sandbox, "台湾 VPS 已出", anyGroup)).toBeNull();
  expect(getKeywordDecoration(sandbox, "台湾一线宽带", anyGroup).groupBadges.map((badge) => badge.name))
    .toEqual(["测试"]);
});

test("options editor keeps match mode and excluded terms in the persisted rule value", () => {
  const sandbox = createOptionsSandbox();
  const savedValue = vm.runInContext(`(() => {
    followRulesDraft = {
      keywordGroups: [{
        id: "persisted",
        name: "台湾家宽",
        enabled: true,
        rules: [
          { id: "rule-1", mode: "all", terms: ["台湾", "家宽"], excludeTerms: ["已出"] },
          { id: "rule-2", mode: "all", terms: ["TW", "家宽"], excludeTerms: ["已出"] }
        ],
        styles: {}
      }],
      userGroups: []
    };
    return readFollowRulesFromForm();
  })()`, sandbox);

  expect(savedValue.keywordGroups.map((group) => ({
    rules: group.rules.map(({ mode, terms, excludeTerms }) => ({ mode, terms, excludeTerms }))
  }))).toEqual([{
    rules: [
      { mode: "all", terms: ["台湾", "家宽"], excludeTerms: ["已出"] },
      { mode: "all", terms: ["TW", "家宽"], excludeTerms: ["已出"] }
    ]
  }]);
});

test("content keyword editor splits comma-separated terms like RSS rules", () => {
  const sandbox = createOptionsSandbox();
  const parsed = vm.runInContext('parseFollowRuleEditorItems("台湾, 家宽，台湾\\n云服务器")', sandbox);

  expect(parsed).toEqual(["台湾", "家宽", "云服务器"]);
});
