const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/content/editor-upload.js"), "utf8");
const shortcutsSource = fs.readFileSync(path.resolve(__dirname, "../../src/shortcuts.js"), "utf8");

test("reply shortcut defaults to Command+Enter on macOS and Ctrl+Enter elsewhere", () => {
  const getDefault = (platform) => {
    const sandbox = vm.createContext({ navigator: { platform } });
    vm.runInContext(shortcutsSource, sandbox);
    return vm.runInContext("DEFAULT_READING_SHORTCUTS.replySubmitShortcut", sandbox);
  };

  expect(getDefault("MacIntel")).toBe("Meta+Enter");
  expect(getDefault("Win32")).toBe("Ctrl+Enter");
  expect(getDefault("Linux x86_64")).toBe("Ctrl+Enter");
});

class MockElement {
  constructor() {
    this.parentElement = null;
  }

  closest(selector) {
    return selector === ".CodeMirror" ? this : null;
  }

  matches() {
    return false;
  }

  querySelectorAll() {
    return this.controls || [];
  }

  getAttribute() {
    return "";
  }
}

test("the configured reply shortcut submits a reply editor on a post detail page", () => {
  const button = {
    textContent: "回复",
    value: "",
    parentElement: null,
    getAttribute: () => "",
    click: () => { button.clicked = true; }
  };
  const container = new MockElement();
  container.controls = [button];
  const editor = new MockElement();
  editor.parentElement = container;
  let prevented = false;
  let stopped = false;
  const body = {
    children: [],
    appendChild(element) { this.children.push(element); }
  };
  let savedDiagnostic = null;
  const sandbox = vm.createContext({
    Element: MockElement,
    navigator: { platform: "MacIntel" },
    featureOptions: { replySubmitShortcut: "Meta+Enter" },
    normalizeShortcutFromEvent: (event) => event.metaKey ? `Meta+${event.key}` : event.ctrlKey ? `Ctrl+${event.key}` : "",
    document: {
      querySelector: () => null,
      createElement: () => ({ setAttribute() {}, remove() {} }),
      body
    },
    window: { setTimeout: () => 1, clearTimeout() {} },
    chrome: { storage: { local: { set: (value) => { savedDiagnostic = value; return Promise.resolve(); } } } },
    console: { info() {} },
    isAutoPagePostDetailPage: () => true
  });
  vm.runInContext(source, sandbox);

  sandbox.handleNewPostShortcut({
    key: "Enter",
    repeat: false,
    defaultPrevented: false,
    isComposing: false,
    metaKey: true,
    ctrlKey: false,
    target: editor,
    preventDefault: () => { prevented = true; },
    stopImmediatePropagation: () => { stopped = true; }
  });

  expect(button.clicked).toBe(true);
  expect(prevented).toBe(true);
  expect(stopped).toBe(true);
  expect(body.children[0].textContent).toBe("已触发提交按钮");
  expect(savedDiagnostic.nshPublishShortcutDebug.editorFound).toBe(true);
});
