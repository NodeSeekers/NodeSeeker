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

function createMutationSandbox(initialRules) {
  const stored = { followRules: initialRules };
  const sandbox = createSandbox();
  sandbox.DEFAULT_FOLLOW_RULES = { keywordGroups: [], signatureGroups: [], userGroups: [] };
  sandbox.featureOptions = { followRules: initialRules };
  sandbox.chrome = {
    storage: {
      local: {
        get: async (defaults) => ({ ...defaults, ...stored }),
        set: async (values) => Object.assign(stored, values)
      }
    }
  };
  sandbox.scanFollowRules = () => {};
  return { sandbox, stored };
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
          normalizedTermGroups: rule.termGroups.map((terms) => terms.map((item) => item.toLocaleLowerCase())),
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

function getSignatureDecoration(sandbox, signature, group, type = "detail") {
  sandbox.__signatureText = signature;
  sandbox.__signatureGroup = group;
  sandbox.__contextType = type;
  return vm.runInContext(`(() => {
    const normalized = normalizeFollowRules({ signatureGroups: [__signatureGroup] });
    const groups = normalized.signatureGroups
      .filter((entry) => entry.enabled)
      .map((entry) => ({
        ...entry,
        rules: entry.rules.map((rule) => ({
          ...rule,
          normalizedItems: rule.terms.map((item) => item.toLocaleLowerCase()),
          normalizedTermGroups: rule.termGroups.map((terms) => terms.map((item) => item.toLocaleLowerCase())),
          normalizedExcludedItems: rule.excludeTerms.map((item) => item.toLocaleLowerCase())
        }))
      }));
    const decoration = getFollowRuleDecoration({
      type: __contextType,
      titleText: "",
      signatureText: __signatureText,
      signatureElement: {},
      titleElement: null,
      authorElement: null,
      authorName: "",
      avatarElement: {}
    }, { keywordGroups: [], signatureGroups: groups, userGroups: [] });
    return { normalized: normalized.signatureGroups[0], decoration };
  })()`, sandbox);
}

function createOptionsSandbox() {
  const keywordInput = { value: "", focus() {} };
  const excludeInput = { value: "", focus() {} };
  const node = {
    hidden: false,
    addEventListener() {},
    replaceChildren() {},
    appendChild() {},
    append() {},
    querySelector(selector) {
      if (selector?.includes('data-follow-rule-item-list="items"')) return keywordInput;
      if (selector?.includes('data-follow-rule-item-list="excludeItems"')) return excludeInput;
      return null;
    }
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
  sandbox.__keywordInput = keywordInput;
  sandbox.__excludeInput = excludeInput;
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
    rules: group.rules.map(({ terms, termGroups, mode, excludeTerms }) => ({ terms, termGroups, mode, excludeTerms }))
  }))).toEqual([
    { id: "legacy-many", rules: [{ terms: ["VPS", "台湾"], termGroups: [["VPS"], ["台湾"]], mode: "all", excludeTerms: ["已出"] }] },
    { id: "legacy-one", rules: [{ terms: ["家宽"], termGroups: [["家宽"]], mode: "all", excludeTerms: [] }] }
  ]);
});

test("content alias groups are all required while exclusions match substrings", () => {
  const sandbox = createSandbox();
  const group = {
    id: "alias-rule", name: "测试", styles: { showGroupName: true },
    rules: [{
      id: "aliases", mode: "all", terms: ["海创", "Hytron", "一折", "1折"],
      termGroups: [["海创", "Hytron"], ["一折", "1折"]], excludeTerms: []
    }]
  };

  expect(getKeywordDecoration(sandbox, "Hytron 一折", group)?.keywordTerms).toEqual(["hytron", "一折"]);
  expect(getKeywordDecoration(sandbox, "Hytron", group)).toBeNull();
  const withExcludedSubstring = {
    ...group,
    rules: [{ ...group.rules[0], excludeTerms: ["yt"] }]
  };
  expect(getKeywordDecoration(sandbox, "Hytron 一折", withExcludedSubstring)).toBeNull();
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

test("signature groups match only detail signatures and keep avatar effect as their only style", () => {
  const sandbox = createSandbox();
  const group = {
    id: "signature-probe",
    name: "签名探针",
    enabled: true,
    rules: [{
      id: "signature-probe-rule",
      terms: ["针", "探针", "VPS"],
      termGroups: [["针", "探针"], ["VPS"]],
      excludeTerms: ["已出"]
    }],
    styles: {
      signatureEffect: "cosmos",
      showGroupName: true,
      titleColor: { enabled: true, color: "#ff0000" }
    }
  };

  const matched = getSignatureDecoration(sandbox, "我的探针 ｜ VPS剩余价值计算器", group);
  expect(matched.decoration.signatureEffect).toBe("cosmos");
  expect(matched.decoration.avatarEffect).toBe("");
  expect(matched.decoration.signatureTerms).toEqual(["针", "探针", "vps"]);
  expect(matched.decoration.groupBadges).toEqual([]);
  expect(matched.decoration.titleColor).toBe("");
  expect(matched.normalized.styles.showGroupName).toBe(false);
  expect(matched.normalized.styles.titleColor.enabled).toBe(false);
  expect(matched.normalized.styles.signatureEffect).toBe("cosmos");
  expect(getSignatureDecoration(sandbox, "我的探针 ｜ VPS 已出", group).decoration).toBeNull();
  expect(getSignatureDecoration(sandbox, "我的探针 ｜ VPS剩余价值计算器", group, "list").decoration).toBeNull();
});

test("detail target context reads the signature element text", () => {
  const sandbox = createSandbox();
  sandbox.__root = {
    querySelector(selector) {
      return selector === ".signature" ? { textContent: "  我的探针 ｜ VPS  " } : null;
    },
    querySelectorAll() { return []; }
  };

  const signatureText = vm.runInContext('getFollowRuleTargetContext(__root, true).signatureText', sandbox);
  expect(signatureText).toBe("我的探针 ｜ VPS");
});

test("signature rule groups persist separately from title and user rules", () => {
  const sandbox = createOptionsSandbox();
  const savedValue = vm.runInContext(`(() => {
    followRulesDraft = {
      keywordGroups: [],
      signatureGroups: [{
        id: "signature-group",
        name: "签名探针",
        enabled: true,
        rules: [{ id: "signature-rule", terms: ["探针"], termGroups: [["探针"]], excludeTerms: [] }],
        styles: { signatureEffect: "particles" }
      }],
      userGroups: []
    };
    return readFollowRulesFromForm();
  })()`, sandbox);

  expect(savedValue.signatureGroups[0].rules[0].terms).toEqual(["探针"]);
  expect(savedValue.signatureGroups[0].styles.signatureEffect).toBe("particles");
  expect(savedValue.keywordGroups).toEqual([]);
  expect(savedValue.userGroups).toEqual([]);
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
      signatureGroups: [],
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

test("content keyword editor parses required groups and slash alternatives", () => {
  const sandbox = createOptionsSandbox();
  const parsed = vm.runInContext('parseFollowRuleKeywordExpression("(海创/Hytron),(一折/1折)")', sandbox);

  expect(JSON.parse(JSON.stringify(parsed))).toEqual([["海创", "Hytron"], ["一折", "1折"]]);
});

test("content keyword editor adds and edits one required-condition rule", () => {
  const sandbox = createOptionsSandbox();
  const group = { id: "config-group", rules: [] };
  sandbox.__group = group;
  vm.runInContext(`
    renderFollowRuleDialogBody = () => {};
    pendingFollowRuleEditor = {
      type: "keyword", groupId: "config-group", ruleMode: "all", editingRuleId: "", group: __group
    };
  `, sandbox);
  sandbox.__keywordInput.value = "(海创/Hytron),(一折/1折)";
  sandbox.__excludeInput.value = "出, yt";
  vm.runInContext("addPendingFollowRuleItems()", sandbox);
  expect(group.rules).toHaveLength(1);
  expect(JSON.parse(JSON.stringify(group.rules[0].termGroups))).toEqual([["海创", "Hytron"], ["一折", "1折"]]);
  expect(group.rules[0].excludeTerms).toEqual(["出", "yt"]);

  vm.runInContext(`pendingFollowRuleEditor.editingRuleId = __group.rules[0].id;`, sandbox);
  sandbox.__keywordInput.value = "(海创/Hytron),(五折/5折)";
  sandbox.__excludeInput.value = "出";
  vm.runInContext("addPendingFollowRuleItems()", sandbox);
  expect(group.rules).toHaveLength(1);
  expect(JSON.parse(JSON.stringify(group.rules[0].termGroups))).toEqual([["海创", "Hytron"], ["五折", "5折"]]);
});

test("quick marking can add and remove one keyword without changing a combined rule", async () => {
  const { sandbox, stored } = createMutationSandbox({
    keywordGroups: [{
      id: "mixed",
      name: "关键词",
      enabled: true,
      rules: [{ id: "combo", enabled: true, mode: "all", terms: ["独角鲸", "邮箱"], excludeTerms: [] }],
      styles: {}
    }],
    userGroups: []
  });

  expect(await vm.runInContext('getFollowRuleGroupOptions("keyword", "独角鲸")', sandbox))
    .toEqual([{ id: "mixed", name: "关键词", enabled: true, followed: false }]);

  await vm.runInContext('assignFollowRuleItemToGroup("keyword", "独角鲸", "mixed")', sandbox);
  expect(JSON.parse(JSON.stringify(stored.followRules.keywordGroups[0].rules.map((rule) => rule.terms))))
    .toEqual([["独角鲸", "邮箱"], ["独角鲸"]]);
  expect(await vm.runInContext('getFollowRuleGroupOptions("keyword", "独角鲸")', sandbox))
    .toEqual([{ id: "mixed", name: "关键词", enabled: true, followed: true }]);

  await vm.runInContext('removeFollowRuleKeyword("独角鲸")', sandbox);
  expect(JSON.parse(JSON.stringify(stored.followRules.keywordGroups[0].rules.map((rule) => rule.terms))))
    .toEqual([["独角鲸", "邮箱"]]);
});
