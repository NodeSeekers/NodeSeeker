const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/content/profile.js"), "utf8");

function extractFunction(name) {
  const start = source.indexOf(name);
  const end = source.indexOf("\n}\n", start) + 2;
  return source.slice(start, end);
}

function createHoverModeSandbox(showTrends) {
  const calls = [];
  const anchor = {};
  const popup = { classList: { remove: (name) => calls.push(`remove:${name}`) } };
  const sandbox = vm.createContext({
    featureOptions: {
      userStatsEnabled: true,
      profileHoverSignatureEnabled: true,
      profileHoverTrendEnabled: showTrends
    },
    profileTrendRequestId: 0,
    profileTrendAnchor: null,
    cancelProfileTrendShow() {},
    cancelProfileTrendHide() {},
    hideProfileTrendPopup() {},
    ensureProfileTrendPopup: () => popup,
    renderProfileTrendLoading: () => calls.push("loading-trends"),
    renderProfileHomeMessage: () => calls.push("loading-profile"),
    positionProfileTrendPopup() {},
    loadProfileTrendEntries: async () => { calls.push("load-trends"); return [{ collectedAt: 1 }]; },
    loadProfileHomeData: async () => { calls.push("load-profile"); return { memberId: "123" }; },
    renderProfileTrendContent: () => calls.push("render-trends"),
    renderProfileHomePreview: () => calls.push("render-profile"),
    renderProfileTrendMessage: () => calls.push("trend-error")
  });
  sandbox.anchor = anchor;
  vm.runInContext(extractFunction("async function showProfileTrendPopup("), sandbox);
  return { sandbox, calls };
}

test("avatar hover shows profile card by default", async () => {
  const { sandbox, calls } = createHoverModeSandbox(false);

  await vm.runInContext("showProfileTrendPopup(anchor, '123', 'user')", sandbox);

  expect(calls).toContain("load-profile");
  expect(calls).toContain("render-profile");
  expect(calls).not.toContain("load-trends");
});

test("avatar hover shows trend chart when the setting is enabled", async () => {
  const { sandbox, calls } = createHoverModeSandbox(true);

  await vm.runInContext("showProfileTrendPopup(anchor, '123', 'user')", sandbox);

  expect(calls).toContain("loading-trends");
  expect(calls).toContain("load-trends");
  expect(calls).toContain("render-trends");
  expect(calls).not.toContain("load-profile");
});

test("trend chart shows both ranges when legacy range settings are both disabled", () => {
  const sandbox = vm.createContext({
    featureOptions: {
      profileTrend7DaysEnabled: false,
      profileTrend30DaysEnabled: false
    },
    PROFILE_TREND_RECENT_DAYS: 7,
    PROFILE_TREND_DAYS: 30,
    getProfileTrendEntriesInDays: (entries) => entries
  });

  vm.runInContext(extractFunction("function getEnabledProfileTrendGroups("), sandbox);
  const titles = vm.runInContext("getEnabledProfileTrendGroups([]).map((group) => group.title)", sandbox);

  expect(Array.from(titles)).toEqual(["近 7 天", "近 30 天"]);
});
