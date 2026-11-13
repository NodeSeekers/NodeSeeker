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
    AUTO_PAGE_BOTTOM_THRESHOLD: 120,
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

function createEdgeTriggerSandbox({ appendEnabled = true, editorFocused = false } = {}) {
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
  sandbox.appendNextAutoPage = () => { appendCount += 1; };
  sandbox.navigateToPostPage = (url) => { navigatedUrl = url; };
  return {
    sandbox,
    timers,
    get appendCount() { return appendCount; },
    get navigatedUrl() { return navigatedUrl; }
  };
}

test("scrolling over an unfocused reply editor still triggers waterfall after the configured delay", () => {
  const fixture = createEdgeTriggerSandbox();
  const { sandbox, timers } = fixture;

  vm.runInContext("handleAutoPageWheel({ deltaY: 1, target: document.querySelectorAll('.CodeMirror')[0] })", sandbox);

  expect(fixture.appendCount).toBe(0);
  const [timer] = [...timers.values()];
  expect(timer.delay).toBe(100);
  timer.callback();
  expect(fixture.appendCount).toBe(1);
});

test("normal mode navigates when the edge delay expires without requiring another wheel event", () => {
  const fixture = createEdgeTriggerSandbox({ appendEnabled: false });
  const { sandbox, timers } = fixture;

  vm.runInContext("handleAutoPageWheel({ deltaY: 1, target: document.body })", sandbox);

  const [timer] = [...timers.values()];
  expect(timer.delay).toBe(100);
  timer.callback();
  expect(fixture.navigatedUrl).toBe("/post-123-2");
});

test("the built-in auto-page delay default is 100ms", () => {
  expect(configSource).toMatch(/autoPageDelayMs:\s*100/);
  expect(optionsSource).toMatch(/autoPageDelayMs:\s*100/);
  expect(optionsHtml).toMatch(/id="autoPageDelayMs"[^>]*value="100"/);
  expect(settingsSource).toContain("const delayDisabled = !autoPageEnabled;");
});
