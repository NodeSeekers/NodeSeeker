const EDITOR_FORMAT_ACTIONS = [
  { label: "粗体", title: "插入粗体", format: (text) => `**${text || "粗体文字"}**` },
  { label: "斜体", title: "插入斜体", format: (text) => `*${text || "斜体文字"}*` },
  { label: "引用", title: "插入引用", format: (text) => (text || "引用内容").split("\n").map((line) => `> ${line}`).join("\n") },
  { label: "代码", title: "插入代码块", format: (text) => `\n\`\`\`\n${text || "代码内容"}\n\`\`\`\n` },
  { label: "Tabs", title: "插入 NodeSeek Tabs 模板", format: () => ":::: tabs\n::: tab-item 标签一\n内容一\n:::\n::: tab-item 标签二\n内容二\n:::\n::::" },
  { label: "Mermaid", title: "插入 Mermaid 模板", format: () => "```mermaid\ngraph TD\n  A[开始] --> B[结束]\n```" }
];

function scanEditorFormattingTools() {
  if (!featureOptions.editorToolsEnabled) {
    removeEditorFormattingTools();
    return;
  }

  document.querySelectorAll(".CodeMirror").forEach((editor) => {
    const mount = editor.parentElement;
    if (!mount || mount.querySelector(":scope > .nsh-editor-format-toolbar")) return;
    const toolbar = document.createElement("div");
    toolbar.className = "nsh-editor-format-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Markdown 格式工具");
    EDITOR_FORMAT_ACTIONS.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.title = action.title;
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        const selected = editor.CodeMirror?.getSelection?.() || "";
        insertMarkdown(action.format(selected), editor);
      });
      toolbar.appendChild(button);
      if (action.label === "代码") {
        toolbar.appendChild(createEditorCalloutTypeSelect(editor));
      }
    });
    mount.insertBefore(toolbar, editor);
  });
}

function formatEditorCallout(text, type) {
  const body = String(text || "说明内容").split("\n").map((line) => `> ${line}`).join("\n");
  return `> [!${String(type || "note").toLowerCase()}]\n${body}`;
}

function createEditorCalloutTypeSelect(editor) {
  const select = document.createElement("select");
  select.className = "nsh-editor-format-type";
  select.setAttribute("aria-label", "选择并插入 Callout");
  select.title = "选择 Callout 类型后立即插入";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "插入 Callout…";
  placeholder.selected = true;
  placeholder.disabled = true;
  select.appendChild(placeholder);
  [
    ["note", "蓝色 Note"],
    ["tip", "绿色 Tip"],
    ["warning", "黄色 Warning"],
    ["caution", "红色 Caution"]
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  select.addEventListener("change", () => handleEditorCalloutTypeChange(editor, select));
  return select;
}

function handleEditorCalloutTypeChange(editor, select) {
  const type = select?.value;
  if (!type) return;
  const selected = editor.CodeMirror?.getSelection?.() || "";
  insertMarkdown(formatEditorCallout(selected, type), editor);
  select.value = "";
}

function removeEditorFormattingTools() {
  document.querySelectorAll(".nsh-editor-format-toolbar").forEach((toolbar) => toolbar.remove());
}
