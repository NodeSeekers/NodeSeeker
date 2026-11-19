const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/content/auto-page.js"), "utf8");
const configSource = fs.readFileSync(path.resolve(__dirname, "../../src/content/config.js"), "utf8");
const optionsSource = fs.readFileSync(path.resolve(__dirname, "../../options/shared.js"), "utf8");
const optionsHtml = fs.readFileSync(path.resolve(__dirname, "../../options/options.html"), "utf8");
const settingsSource = fs.readFileSync(path.resolve(__dirname, "../../options/settings.js"), "utf8");

function createAutoPageSandbox(editorValue = "", { hasCodeMirror = true, fallbackText = "" } = {}) {
  const editor = {
    ...(hasCodeMirror ? { CodeMirror: { getValue: () => editorValue } } : {}),
    querySelector: (selector) => selector === ".CodeMirror-code" ? { textContent: fallbackText } : null,
    querySelectorAll: (selector) => selector === ".CodeMirror-line" && fallbackText
      ? [{ textContent: fallbackText.replace(/^1/, "") }]
      : []
  };
  const body = { closest: () => null };
  const sandbox = vm.createContext({
    AUTO_PAGE_TOUCH_THRESHOLD: 24,
    performance: { now: () => 1000 },
    autoPageTouchStartY: null,
    autoPageBottomArmTimer: 0,
    autoPageBottomArmed: true,
    autoPageNavigating: true,
    autoPageAppendLoading: false,
    autoPageReplyEditor: null,
    autoPageReplyScrollY: 0,
    autoPageRequiresBottomReset: false,
    autoPageRequiresTopReset: false,
    autoPageTopArmTimer: 0,
    autoPageTopArmed: true,
    autoPageWaitForReplyScroll: false,
    document: {
      body,
      documentElement: { scrollTop: 0 },
      querySelectorAll: () => [editor]
    },
    featureOptions: {
      autoPageAppendEnabled: true,
      autoPageDelayMs: 200,
      autoPageEnabled: true,
      readingNavigationEnabled: true
    },
    toElement: (target) => target,
    window: { clearTimeout: () => {}, setTimeout: () => 1 },
    isAtPageBottom: () => true,
    isAtPageTop: () => false,
    getCurrentAutoPageScrollY: () => 0
  });
  vm.runInContext(source, sandbox);
  return { sandbox, body, editor };
}

test("waterfall pause detects a reply draft after focus leaves the editor", () => {
  const { sandbox, body } = createAutoPageSandbox("quoted reply text");

  vm.runInContext("handleAutoPageWheel({ deltaY: 1, target: document.body })", sandbox);

  expect(sandbox.autoPageWaitForReplyScroll).toBe(true);
  expect(sandbox.autoPageBottomArmed).toBe(false);
});

test("waterfall resumes when the reply draft is empty", () => {
  const { sandbox, body } = createAutoPageSandbox("");
  sandbox.autoPageWaitForReplyScroll = true;

  vm.runInContext("handleAutoPageWheel({ deltaY: 1, target: document.body })", sandbox);

  expect(sandbox.autoPageWaitForReplyScroll).toBe(false);
});

test("empty CodeMirror fallback ignores line numbers and zero-width filler characters", () => {
  const { sandbox } = createAutoPageSandbox("", { hasCodeMirror: false, fallbackText: "1\u200b" });

  expect(vm.runInContext("hasAutoPageReplyDraft()", sandbox)).toBe(false);
});

function createEdgeTriggerSandbox({ appendEnabled = true, editorFocused = false, fastEnabled = false } = {}) {
  let timerId = 0;
  const timers = new Map();
  let appendCount = 0;
  let navigatedUrl = "";
  const body = { closest: () => null, contains: () => false };
  const editor = {
    CodeMirror: { getValue: () => "", getSelection: () => "" },
    querySelector: () => null,
    closest: (selector) => selector.includes(".CodeMirror") ? editor : null,
    contains: (node) => node === editor
  };
  const activeElement = editorFocused ? editor : body;
  const sandbox = vm.createContext({
    AUTO_PAGE_TOUCH_THRESHOLD: 24,
    performance: { now: () => 1000 },
    autoPageTouchStartY: null,
    autoPageBottomArmTimer: 0,
    autoPageBottomArmed: false,
    autoPageNavigating: false,
    autoPageAppendLoading: false,
    autoPageReplyEditor: editorFocused ? editor : null,
    autoPageReplyScrollY: 0,
    autoPageRequiresBottomReset: false,
    autoPageRequiresTopReset: false,
    autoPageTopArmTimer: 0,
    autoPageTopArmed: false,
    autoPageWaitForReplyScroll: false,
    document: {
      body,
      activeElement,
      documentElement: { scrollTop: 600, scrollHeight: 1400, offsetHeight: 1400 },
      querySelectorAll: () => [editor]
    },
    featureOptions: {
      autoPageAppendEnabled: appendEnabled,
      autoPageFastEnabled: fastEnabled,
      autoPageDelayMs: 100,
      autoPageEnabled: true,
      readingNavigationEnabled: true
    },
    toElement: (target) => target,
    window: {
      clearTimeout: (id) => timers.delete(id),
      setTimeout: (callback, delay) => {
        timerId += 1;
        timers.set(timerId, { callback, delay });
        return timerId;
      },
      scrollY: 600,
      innerHeight: 800
    },
    getCurrentAutoPageScrollY: () => 600
  });
  vm.runInContext(source, sandbox);
  sandbox.isAtPageBottom = () => true;
  sandbox.isAtPageTop = () => false;
  sandbox.getNextAutoPageUrlForCurrentMode = () => "/post-123-2";
  sandbox.getPreviousAutoPageUrl = () => "/post-123-1";
  sandbox.appendNextAutoPage = () => { appendCount += 1; };
  sandbox.navigateToPostPage = (url) => { navigatedUrl = url; };
  return {
    sandbox,
    timers,
    get appendCount() { return appendCount; },
    get navigatedUrl() { return navigatedUrl; }
  };
}

test("scrolling over an unfocused reply editor waits for a second gesture in waterfall mode", () => {
  const fixture = createEdgeTriggerSandbox();
  const { sandbox, timers } = fixture;
  let now = 0;
  sandbox.performance.now = () => now;
  const wheel = (pixels, gap) => {
    now += gap;
    vm.runInContext(
      `handleAutoPageWheel({ deltaY: ${pixels}, target: document.querySelectorAll('.CodeMirror')[0] })`, sandbox);
  };

  for (const pixels of [150, 100, 60, 34]) wheel(pixels, 17);
  expect(fixture.appendCount).toBe(0);
  const [timer] = [...timers.values()];
  expect(timer.delay).toBe(100);
  timer.callback();
  expect(fixture.appendCount).toBe(0);
  wheel(26, 250);
  wheel(14, 20);
  expect(fixture.appendCount).toBe(0);
  wheel(60, 250);
  expect(fixture.appendCount).toBe(1);
});

for (const edge of ["bottom", "top"]) {
  test(`normal mode waits for another wheel gesture at the ${edge}`, () => {
    const fixture = createEdgeTriggerSandbox({ appendEnabled: false });
    const { sandbox, timers } = fixture;
    sandbox.isAtPageBottom = () => edge === "bottom";
    sandbox.isAtPageTop = () => edge === "top";
    const wheel = (pixels = 1) => vm.runInContext(
      `handleAutoPageWheel({ deltaY: ${edge === "bottom" ? pixels : -pixels}, target: document.body })`, sandbox);

    wheel();
    const [initialTimer] = timers.keys();
    wheel();
    expect(timers.has(initialTimer)).toBe(false);
    expect(fixture.navigatedUrl).toBe("");

    const [timer] = [...timers.values()];
    expect(timer.delay).toBe(100);
    timer.callback();
    expect(fixture.navigatedUrl).toBe("");

    wheel(2);
    expect(fixture.navigatedUrl).toBe("");
    wheel(32);
    expect(fixture.navigatedUrl).toBe(edge === "bottom" ? "/post-123-2" : "/post-123-1");
  });
}

test("a delayed decelerating wheel tail cannot turn the page after the edge timer fires", () => {
  const fixture = createEdgeTriggerSandbox({ appendEnabled: false });
  const { sandbox, timers } = fixture;
  let now = 0;
  sandbox.performance.now = () => now;
  const wheel = (pixels, gap) => {
    now += gap;
    vm.runInContext(`handleAutoPageWheel({ deltaY: ${pixels}, target: document.body })`, sandbox);
  };

  for (const pixels of [200, 150, 100, 66, 34]) wheel(pixels, 17);
  [...timers.values()][0].callback();
  wheel(26, 250);
  wheel(14, 25);
  wheel(7, 25);
  expect(fixture.navigatedUrl).toBe("");

  wheel(60, 250);
  expect(fixture.navigatedUrl).toBe("/post-123-2");
});

test("a single touch gesture cannot navigate when it reaches the edge", () => {
  const fixture = createEdgeTriggerSandbox({ appendEnabled: false });
  const { sandbox, timers } = fixture;
  sandbox.isAtPageBottom = () => false;
  const start = () => vm.runInContext("handleAutoPageTouchStart({ touches: [{ clientY: 100 }], target: document.body })", sandbox);
  const move = () => vm.runInContext("handleAutoPageTouchMove({ touches: [{ clientY: 50 }], target: document.body })", sandbox);
  start();
  sandbox.isAtPageBottom = () => true;
  move();
  vm.runInContext("handleAutoPageScroll()", sandbox);
  expect(timers.size).toBe(0);
  expect(fixture.navigatedUrl).toBe("");

  vm.runInContext('handleAutoPageTouchEnd({ type: "touchend", touches: [] })', sandbox);
  [...timers.values()][0].callback();
  expect(fixture.navigatedUrl).toBe("");

  start();
  move();
  expect(fixture.navigatedUrl).toBe("/post-123-2");
});

test("the built-in auto-page delay default is 200ms", () => {
  expect(configSource).toMatch(/autoPageDelayMs:\s*200/);
  expect(optionsSource).toMatch(/autoPageDelayMs:\s*200/);
  expect(optionsHtml).toMatch(/id="autoPageDelayMs"[^>]*value="200"/);
  expect(settingsSource).toContain("const delayDisabled = !autoPageEnabled || form.autoPageFastEnabled.checked;");
});


for (const appendEnabled of [false, true]) {
  test(`fast mode reacts immediately on reaching the bottom, append=${appendEnabled}`, () => {
    const fixture = createEdgeTriggerSandbox({ appendEnabled, fastEnabled: true });
    const { sandbox, timers } = fixture;
    let y = 400;
    sandbox.getCurrentAutoPageScrollY = () => y;
    sandbox.isAtPageBottom = () => y === 600;
    vm.runInContext("handleAutoPageScroll()", sandbox);
    expect(fixture.navigatedUrl).toBe("");
    expect(fixture.appendCount).toBe(0);

    y = 600;
    vm.runInContext("handleAutoPageScroll()", sandbox);
    expect(fixture.navigatedUrl).toBe(appendEnabled ? "" : "/post-123-2");
    expect(fixture.appendCount).toBe(appendEnabled ? 1 : 0);
    expect(timers.size).toBe(0);
  });
}

test("fast mode turns to the previous page when scrolling up to the top", () => {
  const fixture = createEdgeTriggerSandbox({ appendEnabled: false, fastEnabled: true });
  const { sandbox, timers } = fixture;
  let y = 400;
  sandbox.getCurrentAutoPageScrollY = () => y;
  sandbox.isAtPageTop = () => y === 0;
  sandbox.isAtPageBottom = () => false;
  vm.runInContext("handleAutoPageScroll()", sandbox);
  expect(fixture.navigatedUrl).toBe("");

  y = 0;
  vm.runInContext("handleAutoPageScroll()", sandbox);
  expect(fixture.navigatedUrl).toBe("/post-123-1");
  expect(timers.size).toBe(0);
});
