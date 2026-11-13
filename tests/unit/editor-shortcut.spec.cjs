const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/content/editor-upload.js"), "utf8");

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

test("Cmd+Enter submits a reply editor on a post detail page", () => {
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
