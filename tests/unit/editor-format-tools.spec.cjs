const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/content/editor-format-tools.js"), "utf8");

function getFormatTemplates() {
  const sandbox = vm.createContext({});
  vm.runInContext(source, sandbox);
  return vm.runInContext(`({
    callout: formatEditorCallout("说明一\\n说明二", "warning"),
    caution: formatEditorCallout("危险提醒", "caution"),
    actionLabels: EDITOR_FORMAT_ACTIONS.map((action) => action.label),
    tabs: EDITOR_FORMAT_ACTIONS.find((action) => action.label === "Tabs").format()
  })`, sandbox);
}

test("Callout uses selected type and prefixes every body line", () => {
  const { callout } = getFormatTemplates();
  expect(callout).toBe("> [!warning]\n> 说明一\n> 说明二");
});

test("Callout red style uses NodeSeek's recognized Caution type", () => {
  const { caution } = getFormatTemplates();
  expect(caution).toBe("> [!caution]\n> 危险提醒");
});

test("Callout dropdown inserts the selected type immediately without a separate toolbar button", () => {
  const { actionLabels } = getFormatTemplates();
  expect(actionLabels).not.toContain("Callout");

  const insertions = [];
  const sandbox = vm.createContext({
    insertMarkdown: (markdown, editor) => insertions.push({ markdown, editor })
  });
  vm.runInContext(source, sandbox);
  const editor = { CodeMirror: { getSelection: () => "选中的内容" } };
  const select = { value: "tip" };
  sandbox.editor = editor;
  sandbox.select = select;
  vm.runInContext("handleEditorCalloutTypeChange(editor, select)", sandbox);

  expect(insertions[0].markdown).toBe("> [!tip]\n> 选中的内容");
  expect(insertions[0].editor).toBe(editor);
  expect(select.value).toBe("");
});

test("Tabs template uses NodeSeek tab-item syntax", () => {
  const { tabs } = getFormatTemplates();
  expect(tabs).toContain(":::: tabs");
  expect(tabs).toContain("::: tab-item 标签一");
  expect(tabs).toContain("::: tab-item 标签二");
  expect(tabs.trimEnd().endsWith("::::")).toBe(true);
});
