const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/content/profile.js"), "utf8");
const functionStart = source.indexOf("async function loadProfileProgressData(");
const functionEnd = source.indexOf("\n}\n", functionStart) + 2;
const loadProgressFunction = source.slice(functionStart, functionEnd);
const renderStart = source.indexOf("function renderProfileProgress(");
const renderEnd = source.indexOf("\n}\n", renderStart) + 2;
const renderProgressFunction = source.slice(renderStart, renderEnd);
const positionStart = source.indexOf("function positionProfileProgressPopup(");
const positionEnd = source.indexOf("\n}\n", positionStart) + 2;
const positionProgressFunction = source.slice(positionStart, positionEnd);

test("profile progress keeps usable data when the attendance endpoint fails", async () => {
  const sandbox = vm.createContext({
    PROFILE_PROGRESS_CACHE_TTL_MS: 30_000,
    profileProgressCache: null,
    profileProgressCacheLoadedAt: 0,
    profileProgressPromise: null,
    profileProgressPromiseMemberId: "",
    loadProfile: async () => ({ rank: 3, coin: 1164 }),
    parseProfileProgressResponse: async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    normalizeProfileProgressNumber: (value, fallback = 0) => {
      const number = Number(value);
      return Number.isFinite(number) ? Math.max(0, number) : fallback;
    },
    fetch: async (url) => url === "/api/progress/today"
      ? { ok: true, json: async () => ({
        success: true,
        postBonusCount: 2,
        maxPostBonusCount: 4,
        commentBonusCount: 11,
        maxCommentBonusCount: 20,
        freeLikeUsed: 0,
        maxFreeLike: 2
      }) }
      : { ok: false, status: 503 }
  });
  vm.runInContext(loadProgressFunction, sandbox);

  const progress = await vm.runInContext("loadProfileProgressData('123')", sandbox);

  expect(progress.rank).toBe(3);
  expect(progress.postBonusCount).toBe(2);
  expect(progress.unavailable).toEqual(["attendance"]);
});

test("profile progress renders available rows and names unavailable sources", () => {
  const popup = {
    children: [],
    replaceChildren(...children) { this.children = children; },
    appendChild(child) { this.children.push(child); }
  };
  const sandbox = vm.createContext({
    document: { createElement: () => ({ children: [], appendChild(child) { this.children.push(child); } }) },
    popup,
    progress: {
      rank: 3,
      coin: 1164,
      postBonusCount: 2,
      maxPostBonusCount: 4,
      commentBonusCount: 11,
      maxCommentBonusCount: 20,
      freeLikeUsed: 0,
      maxFreeLike: 2,
      attendance: null,
      unavailable: ["attendance"]
    },
    createProfileProgressTitle: () => ({ title: true }),
    createProfileProgressRow: (name) => ({ name, classList: { add() {} } }),
    normalizeProfileProgressNumber: (value) => Number(value) || 0
  });
  vm.runInContext(renderProgressFunction, sandbox);

  vm.runInContext("renderProfileProgress(popup, progress)", sandbox);

  expect(popup.children[1].children.map((row) => row.name)).toEqual([
    "等级进度 · Lv3 → Lv4",
    "今日发帖",
    "今日评论",
    "免费投喂额度"
  ]);
  expect(popup.children.at(-1).textContent).toBe("部分数据暂时无法加载：签到");
});

test("profile progress popup uses the compact 410px layout", () => {
  const popup = { offsetHeight: 200, style: {} };
  const anchor = { getBoundingClientRect: () => ({ left: 40, top: 60, right: 80, bottom: 80 }) };
  const sandbox = vm.createContext({
    window: { innerWidth: 1200, innerHeight: 900 },
    popup,
    anchor
  });
  vm.runInContext(positionProgressFunction, sandbox);

  vm.runInContext("positionProfileProgressPopup(popup, anchor)", sandbox);

  expect(popup.style.width).toBe("410px");
});
