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

test("profile activity reads one page and returns at most ten recent entries", async () => {
  let requestCount = 0;
  const sandbox = vm.createContext({
    PROFILE_ACTIVITY_LIMIT: 10,
    PROFILE_PROGRESS_CACHE_TTL_MS: 30_000,
    profileActivityCache: new Map(),
    location: { origin: "https://www.nodeseek.com" },
    fetch: async (url) => {
      requestCount += 1;
      expect(url).toBe("/api/content/list-discussions?uid=123&page=1");
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: { discussions: Array.from({ length: 15 }, (_, index) => ({ title: `主题 ${index + 1}` })) }
        })
      };
    }
  });
  vm.runInContext(extractFunction("async function loadProfileActivityEntries("), sandbox);

  const first = await vm.runInContext("loadProfileActivityEntries('123', 'discussions')", sandbox);
  const cached = await vm.runInContext("loadProfileActivityEntries('123', 'discussions')", sandbox);

  expect(first.length).toBe(10);
  expect(first[0].title).toBe("主题 1");
  expect(cached.length).toBe(10);
  expect(requestCount).toBe(1);
});

test("recent comment links open the page and target the exact comment", () => {
  const sandbox = vm.createContext({
    URL,
    location: { origin: "https://www.nodeseek.com" },
    PROFILE_ACTIVITY_COMMENT_PAGE_SIZE: 10
  });
  vm.runInContext(extractFunction("function buildProfileActivityEntryUrl("), sandbox);

  const url = vm.runInContext("buildProfileActivityEntryUrl({ post_id: 456, floor_id: 12, comment_id: 987 }, 'comments')", sandbox);

  expect(url).toBe("https://www.nodeseek.com/post-456-2?nshComment=987&nshFloor=12");
});

test("leaving the recent activity list hides only that list", () => {
  let hideTimerCallback = null;
  let parentHideCount = 0;
  let activityRemoved = false;
  const sandbox = vm.createContext({
    PROFILE_TREND_HIDE_DELAY_MS: 180,
    profileActivityHideTimer: 0,
    profileActivityShowTimer: 0,
    profileActivityShowAnchor: null,
    profileActivityRequestId: 1,
    profileActivityAnchor: {},
    profileActivityPopup: { remove() { activityRemoved = true; } },
    window: {
      clearTimeout() {},
      setTimeout(callback) { hideTimerCallback = callback; return 2; }
    },
    scheduleHideProfileTrendPopup() { parentHideCount += 1; }
  });
  vm.runInContext(extractFunction("function scheduleHideProfileActivityPopup("), sandbox);
  vm.runInContext(extractFunction("function cancelProfileActivityShow("), sandbox);
  vm.runInContext(extractFunction("function hideProfileActivityPopup("), sandbox);

  vm.runInContext("scheduleHideProfileActivityPopup()", sandbox);
  hideTimerCallback();

  expect(activityRemoved).toBe(true);
  expect(parentHideCount).toBe(0);
});

test("crossing the neighboring activity metric cancels its delayed popup switch", () => {
  let switchCallback = null;
  let shownKind = "";
  const activeAnchor = {};
  const nextAnchor = { matches: () => true };
  const sandbox = vm.createContext({
    PROFILE_ACTIVITY_SWITCH_DELAY_MS: 250,
    profileActivityPopup: { isConnected: true },
    profileActivityAnchor: activeAnchor,
    profileActivityHideTimer: 1,
    profileActivityShowAnchor: null,
    profileActivityShowTimer: 0,
    nextAnchor,
    window: {
      clearTimeout() {},
      setTimeout(callback) { switchCallback = callback; return 2; }
    },
    showProfileActivityPopup(_anchor, _memberId, kind) { shownKind = kind; }
  });
  vm.runInContext(extractFunction("function cancelProfileActivityShow("), sandbox);
  vm.runInContext(extractFunction("function scheduleShowProfileActivityPopup("), sandbox);

  vm.runInContext("scheduleShowProfileActivityPopup(nextAnchor, '123', 'comments')", sandbox);
  expect(shownKind).toBe("");
  vm.runInContext("cancelProfileActivityShow(nextAnchor)", sandbox);
  switchCallback();
  expect(shownKind).toBe("");
});
