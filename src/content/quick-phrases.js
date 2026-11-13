const QUICK_PHRASE_TRIGGER_CLASS = "nsh-quick-phrase-trigger";
const QUICK_PHRASE_POPUP_CLASS = "nsh-quick-phrase-popup";
const QUICK_PHRASE_LIST_CLASS = "nsh-quick-phrase-list";
const QUICK_PHRASE_ITEM_CLASS = "nsh-quick-phrase-item";
const QUICK_PHRASE_PREVIEW_CLASS = "nsh-quick-phrase-preview";
const QUICK_PHRASE_EMPTY_CLASS = "nsh-quick-phrase-empty";
const QUICK_PHRASE_TOOLBAR_SELECTOR = ".mde-toolbar, .editor-toolbar";
const QUICK_PHRASE_SVG_NS = "http://www.w3.org/2000/svg";
const QUICK_PHRASE_POPUP_WIDTH = 300;
const QUICK_PHRASE_POPUP_HEIGHT = 260;
const QUICK_PHRASE_POPUP_GAP = 8;
const QUICK_PHRASE_VIEWPORT_PADDING = 12;
let quickPhraseToolbarId = 0;
let quickPhrasePopup = null;
let quickPhrasePopupEditor = null;
let quickPhraseSelectionBubble = null;
let quickPhraseSelectionEditor = null;
let quickPhraseSelectionText = "";
let quickPhraseSelectionHideTimer = 0;

function scanQuickPhraseButtons() {
  if (!featureOptions.quickPhrasesEnabled) {
    removeQuickPhraseButtons();
    return;
  }

  const activeToolbarIds = new Set();
  document.querySelectorAll(QUICK_PHRASE_TOOLBAR_SELECTOR).forEach((toolbar) => {
    const editor = findQuickPhraseEditorForToolbar(toolbar);
    if (!editor) {
      return;
    }

    const toolbarId = ensureQuickPhraseToolbarId(toolbar);
    activeToolbarIds.add(toolbarId);
    const button = getQuickPhraseButton(toolbarId) || createQuickPhraseButton(toolbarId);
    const anchor = findQuickPhraseInsertionAnchor(toolbar);

    if (anchor && button.previousElementSibling !== anchor) {
      anchor.after(button);
    } else if (!anchor && button.parentElement !== toolbar) {
      toolbar.appendChild(button);
    }
  });

  document.querySelectorAll(`.${QUICK_PHRASE_TRIGGER_CLASS}`).forEach((button) => {
    if (!activeToolbarIds.has(button.dataset.nshQuickPhraseToolbarId)) {
      button.remove();
    }
  });
}

function removeQuickPhraseButtons() {
  closeQuickPhrasePopup();
  document.querySelectorAll(`.${QUICK_PHRASE_TRIGGER_CLASS}`).forEach((button) => button.remove());
}

function ensureQuickPhraseToolbarId(toolbar) {
  if (!toolbar.dataset.nshQuickPhraseToolbarId) {
    quickPhraseToolbarId += 1;
    toolbar.dataset.nshQuickPhraseToolbarId = `toolbar-${Date.now()}-${quickPhraseToolbarId}`;
  }

  return toolbar.dataset.nshQuickPhraseToolbarId;
}

function getQuickPhraseButton(toolbarId) {
  return document.querySelector(
    `.${QUICK_PHRASE_TRIGGER_CLASS}[data-nsh-quick-phrase-toolbar-id="${toolbarId}"]`
  );
}

function createQuickPhraseButton(toolbarId) {
  const button = document.createElement("span");
  button.className = `i-icon toolbar-item ${QUICK_PHRASE_TRIGGER_CLASS}`;
  button.dataset.nshQuickPhraseToolbarId = toolbarId;
  button.title = "快捷短语";
  button.tabIndex = 0;
  button.setAttribute("role", "button");
  button.setAttribute("aria-label", "快捷短语");
  button.appendChild(createQuickPhraseIcon());
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", handleQuickPhraseButtonClick);
  button.addEventListener("keydown", handleQuickPhraseButtonKeyDown);
  return button;
}

function findQuickPhraseInsertionAnchor(toolbar) {
  return toolbar.querySelector(".toolbar-item.i-icon-clear-format")
    || Array.from(toolbar.querySelectorAll(".toolbar-item")).find((item) => {
      return ["清空", "清除"].includes(item.getAttribute("title") || "");
    })
    || Array.from(toolbar.querySelectorAll(".toolbar-item")).pop()
    || toolbar.lastElementChild;
}

function handleQuickPhraseButtonKeyDown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  handleQuickPhraseButtonClick(event);
}

function handleQuickPhraseButtonClick(event) {
  const button = event.currentTarget;
  const toolbar = findQuickPhraseToolbarByButton(button);
  const editor = toolbar ? findQuickPhraseEditorForToolbar(toolbar) : null;
  if (!editor) {
    button.remove();
    closeQuickPhrasePopup();
    return;
  }

  if (quickPhrasePopup && quickPhrasePopup.dataset.nshQuickPhraseToolbarId === button.dataset.nshQuickPhraseToolbarId) {
    closeQuickPhrasePopup();
    return;
  }

  openQuickPhrasePopup(button, editor);
}

function findQuickPhraseToolbarByButton(button) {
  const toolbarId = button.dataset.nshQuickPhraseToolbarId;
  if (!toolbarId) {
    return null;
  }

  return Array.from(document.querySelectorAll(QUICK_PHRASE_TOOLBAR_SELECTOR)).find((toolbar) => {
    return toolbar.dataset.nshQuickPhraseToolbarId === toolbarId;
  }) || null;
}

function findQuickPhraseEditorForToolbar(toolbar) {
  const siblingEditor = findQuickPhraseFollowingEditor(toolbar);
  if (siblingEditor) {
    return siblingEditor;
  }

  let current = toolbar.parentElement;
  for (let depth = 0; current && depth < 8; depth += 1) {
    if (current.matches("body, html")) {
      break;
    }

    const editors = Array.from(current.querySelectorAll(".CodeMirror"));
    const followingEditor = editors.find((editor) => {
      return Boolean(toolbar.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    if (followingEditor || editors[0]) {
      return followingEditor || editors[0];
    }

    current = current.parentElement;
  }

  return null;
}

function findQuickPhraseFollowingEditor(toolbar) {
  let sibling = toolbar.nextElementSibling;
  while (sibling) {
    if (sibling.classList?.contains("CodeMirror")) {
      return sibling;
    }

    const editor = sibling.querySelector?.(".CodeMirror");
    if (editor) {
      return editor;
    }

    sibling = sibling.nextElementSibling;
  }

  return null;
}

function openQuickPhrasePopup(button, editor) {
  closeQuickPhrasePopup();

  const popup = document.createElement("div");
  popup.className = QUICK_PHRASE_POPUP_CLASS;
  popup.dataset.nshQuickPhraseToolbarId = button.dataset.nshQuickPhraseToolbarId;
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", "快捷短语");

  const list = document.createElement("div");
  list.className = QUICK_PHRASE_LIST_CLASS;

  const phrases = normalizeQuickPhrases(featureOptions.quickPhrases);
  if (phrases.length <= 0) {
    const empty = document.createElement("div");
    empty.className = QUICK_PHRASE_EMPTY_CLASS;
    empty.textContent = "暂无快捷短语";
    list.appendChild(empty);
  }

  phrases.forEach((phrase) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = QUICK_PHRASE_ITEM_CLASS;
    item.title = phrase;
    item.addEventListener("mousedown", (event) => event.preventDefault());
    item.addEventListener("click", () => insertQuickPhrase(phrase));

    const preview = document.createElement("span");
    preview.className = QUICK_PHRASE_PREVIEW_CLASS;
    preview.textContent = phrase;
    item.appendChild(preview);
    list.appendChild(item);
  });

  popup.appendChild(list);
  document.body.appendChild(popup);
  quickPhrasePopup = popup;
  quickPhrasePopupEditor = editor;
  positionQuickPhrasePopup(button, popup);
}

function positionQuickPhrasePopup(button, popup) {
  const rect = button.getBoundingClientRect();
  const popupWidth = popup.offsetWidth || QUICK_PHRASE_POPUP_WIDTH;
  const popupHeight = popup.offsetHeight || QUICK_PHRASE_POPUP_HEIGHT;
  let left = rect.right + QUICK_PHRASE_POPUP_GAP;
  let top = rect.top;

  if (left + popupWidth > window.innerWidth - QUICK_PHRASE_VIEWPORT_PADDING) {
    left = rect.left - popupWidth - QUICK_PHRASE_POPUP_GAP;
  }

  left = Math.max(QUICK_PHRASE_VIEWPORT_PADDING, left);
  top = Math.min(top, window.innerHeight - popupHeight - QUICK_PHRASE_VIEWPORT_PADDING);
  top = Math.max(QUICK_PHRASE_VIEWPORT_PADDING, top);

  popup.style.left = `${Math.round(left)}px`;
  popup.style.top = `${Math.round(top)}px`;
}

async function insertQuickPhrase(phrase) {
  const editor = quickPhrasePopupEditor;
  closeQuickPhrasePopup();
  if (!editor || typeof insertMarkdown !== "function") {
    return;
  }

  await insertMarkdown(phrase, editor);
}

async function addQuickPhraseValue(phrase) {
  const normalizedPhrase = normalizeQuickPhrases([phrase])[0] || "";
  if (!normalizedPhrase) {
    return { values: normalizeQuickPhrases(featureOptions.quickPhrases), added: false };
  }

  const saved = await chrome.storage.local.get({
    quickPhrases: [],
    quickPhrasesEnabled: true
  });
  const previousValues = normalizeQuickPhrases(saved.quickPhrases);
  const values = normalizeQuickPhrases([...previousValues, normalizedPhrase]);
  const added = values.length > previousValues.length;

  await chrome.storage.local.set({
    quickPhrasesEnabled: true,
    quickPhrases: values
  });

  featureOptions = {
    ...featureOptions,
    quickPhrasesEnabled: true,
    quickPhrases: values
  };

  scanQuickPhraseButtons();
  return { values, added };
}

function closeQuickPhrasePopup() {
  quickPhrasePopup?.remove();
  quickPhrasePopup = null;
  quickPhrasePopupEditor = null;
}

function handleQuickPhraseKeyDown(event) {
  if (event.key === "Escape") {
    closeQuickPhrasePopup();
    hideQuickPhraseSelectionBubble();
    return;
  }

  if (
    event.defaultPrevented
    || event.repeat
    || featureOptions.quickPhrasesEnabled === false
    || !isPostDetailPage()
    || isQuickPhraseShortcutEditableTarget(event.target)
  ) {
    return;
  }

  const shortcut = normalizeShortcutFromEvent(event);
  if (!shortcut || shortcut !== featureOptions.quickPhraseShortcut) {
    return;
  }

  if (openQuickPhrasePopupByShortcut(event.target)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function openQuickPhrasePopupByShortcut(target) {
  if (!featureOptions.quickPhrasesEnabled) {
    return false;
  }

  scanQuickPhraseButtons();
  const editor = findQuickPhraseShortcutEditor(target);
  const button = editor ? findQuickPhraseButtonForEditor(editor) : document.querySelector(`.${QUICK_PHRASE_TRIGGER_CLASS}`);
  if (!button) {
    return false;
  }

  const toolbar = findQuickPhraseToolbarByButton(button);
  const targetEditor = editor || (toolbar ? findQuickPhraseEditorForToolbar(toolbar) : null);
  if (!targetEditor) {
    return false;
  }

  openQuickPhrasePopup(button, targetEditor);
  return true;
}

function findQuickPhraseShortcutEditor(target) {
  const targetEditor = toQuickPhraseElement(target)?.closest?.(".CodeMirror");
  if (targetEditor) {
    return targetEditor;
  }

  const focusedEditor = document.querySelector(".CodeMirror-focused");
  if (focusedEditor) {
    return focusedEditor;
  }

  return document.querySelector(".CodeMirror");
}

function findQuickPhraseButtonForEditor(editor) {
  const toolbar = Array.from(document.querySelectorAll(QUICK_PHRASE_TOOLBAR_SELECTOR)).find((item) => {
    return findQuickPhraseEditorForToolbar(item) === editor;
  });
  if (!toolbar) {
    return null;
  }

  return getQuickPhraseButton(ensureQuickPhraseToolbarId(toolbar));
}

function isQuickPhraseShortcutEditableTarget(target) {
  const element = toQuickPhraseElement(target);
  if (!element || element.closest(".CodeMirror")) {
    return false;
  }

  return Boolean(element.closest("input, textarea, select, [contenteditable]"));
}

function handleQuickPhraseSelectionMouseUp(event) {
  if (quickPhraseSelectionBubble?.contains(event.target)) {
    return;
  }

  const source = {
    target: event.target,
    editor: findQuickPhraseEditorFromTarget(event.target) || quickPhraseSelectionEditor,
    clientX: event.clientX,
    clientY: event.clientY
  };
  window.setTimeout(() => {
    showQuickPhraseSelectionBubble(source);
  }, 20);
}

async function showQuickPhraseSelectionBubble(source) {
  const context = await getQuickPhraseSelectionContext(source);
  if (!context) {
    hideQuickPhraseSelectionBubble();
    return;
  }

  quickPhraseSelectionText = context.text;
  const bubble = getQuickPhraseSelectionBubble();
  const button = bubble.querySelector(".nsh-quick-phrase-selection-button");
  button.textContent = "添加快捷短语";
  bubble.hidden = false;
  positionQuickPhraseSelectionBubble(bubble, context.rect);
}

async function getQuickPhraseSelectionContext(source) {
  if (featureOptions.quickPhrasesEnabled === false || !isPostDetailPage()) {
    return null;
  }

  const editorContext = await getQuickPhraseEditorSelectionContext(source);
  if (editorContext) {
    return editorContext;
  }

  return getQuickPhraseDomSelectionContext();
}

function getQuickPhraseDomSelectionContext() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const startElement = toQuickPhraseElement(range.startContainer);
  const endElement = toQuickPhraseElement(range.endContainer);
  const startEditor = startElement?.closest?.(".CodeMirror");
  const endEditor = endElement?.closest?.(".CodeMirror");
  if (!startEditor || startEditor !== endEditor) {
    return null;
  }

  const text = normalizeQuickPhrases([
    startEditor.CodeMirror?.getSelection?.() || selection.toString()
  ])[0] || "";
  if (!text) {
    return null;
  }

  const rect = getQuickPhraseSelectionRect(range) || startEditor.getBoundingClientRect();
  return rect ? { text, rect } : null;
}

function findQuickPhraseEditorFromTarget(target) {
  return toQuickPhraseElement(target)?.closest?.(".CodeMirror") || null;
}

async function getQuickPhraseEditorSelectionContext(source) {
  const candidates = getQuickPhraseSelectionEditorCandidates(source);
  for (const editor of candidates) {
    const selection = await requestQuickPhraseEditorSelection(editor);
    const text = normalizeQuickPhrases([selection?.text || ""])[0] || "";
    if (!text) {
      continue;
    }

    const rect = normalizeQuickPhraseRect(selection.rect)
      || getQuickPhraseCodeMirrorSelectionRect(editor.CodeMirror, source)
      || editor.getBoundingClientRect();
    return rect ? { text, rect } : null;
  }

  return null;
}

function getQuickPhraseSelectionEditorCandidates(source) {
  const candidates = [
    findQuickPhraseEditorFromTarget(source?.target),
    source?.editor,
    quickPhraseSelectionEditor,
    document.querySelector(".CodeMirror-focused"),
    ...document.querySelectorAll(".CodeMirror")
  ];
  const seen = new Set();

  return candidates.filter((editor) => {
    if (!editor?.isConnected || seen.has(editor)) {
      return false;
    }

    seen.add(editor);
    return true;
  });
}

function requestQuickPhraseEditorSelection(editor) {
  return new Promise((resolve) => {
    if (!editor || typeof ensureEditorId !== "function") {
      resolve(null);
      return;
    }

    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const editorId = ensureEditorId(editor);
    let settled = false;

    const finish = (selection) => {
      if (settled) {
        return;
      }

      settled = true;
      window.removeEventListener(SELECTION_RESULT_EVENT, handleResult);
      resolve(selection);
    };

    const handleResult = (event) => {
      if (event.detail?.requestId === requestId) {
        finish(event.detail);
      }
    };

    window.addEventListener(SELECTION_RESULT_EVENT, handleResult);
    window.dispatchEvent(new CustomEvent(SELECTION_EVENT, {
      detail: {
        requestId,
        editorId
      }
    }));

    window.setTimeout(() => finish(null), 300);
  });
}

function normalizeQuickPhraseRect(rect) {
  if (!rect || ![rect.left, rect.right, rect.top, rect.bottom].every(Number.isFinite)) {
    return null;
  }

  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: Number.isFinite(rect.width) ? rect.width : Math.max(0, rect.right - rect.left),
    height: Number.isFinite(rect.height) ? rect.height : Math.max(0, rect.bottom - rect.top)
  };
}

function getQuickPhraseCodeMirrorSelectionRect(codeMirror, source) {
  const rect = getQuickPhraseCursorRect(codeMirror);
  if (rect) {
    return rect;
  }

  if (Number.isFinite(source?.clientX) && Number.isFinite(source?.clientY)) {
    return {
      left: source.clientX,
      right: source.clientX,
      top: source.clientY,
      bottom: source.clientY,
      width: 0,
      height: 0
    };
  }

  return null;
}

function getQuickPhraseCursorRect(codeMirror) {
  if (!codeMirror || typeof codeMirror.cursorCoords !== "function") {
    return null;
  }

  let anchor = null;
  let head = null;
  try {
    anchor = codeMirror.cursorCoords(true, "window");
    head = codeMirror.cursorCoords(false, "window");
  } catch (error) {
    return null;
  }

  if (!anchor || !head) {
    return null;
  }

  const left = Math.min(anchor.left, head.left);
  const right = Math.max(anchor.right, head.right);
  const top = Math.min(anchor.top, head.top);
  const bottom = Math.max(anchor.bottom, head.bottom);
  if (![left, right, top, bottom].every(Number.isFinite)) {
    return null;
  }

  return {
    left,
    right,
    top,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  };
}

function getQuickPhraseSelectionRect(range) {
  const rect = range.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) {
    return rect;
  }

  return Array.from(range.getClientRects()).find((item) => item.width > 0 || item.height > 0) || null;
}

function getQuickPhraseSelectionBubble() {
  if (quickPhraseSelectionBubble?.isConnected) {
    return quickPhraseSelectionBubble;
  }

  quickPhraseSelectionBubble = document.createElement("div");
  quickPhraseSelectionBubble.className = "nsh-selection-block-bubble nsh-quick-phrase-selection-bubble";
  quickPhraseSelectionBubble.hidden = true;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "nsh-selection-block-button nsh-quick-phrase-selection-button";
  button.textContent = "添加快捷短语";
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", handleQuickPhraseSelectionAdd);
  quickPhraseSelectionBubble.appendChild(button);

  document.body.appendChild(quickPhraseSelectionBubble);
  return quickPhraseSelectionBubble;
}

function positionQuickPhraseSelectionBubble(bubble, rect) {
  const margin = 8;
  const bubbleRect = bubble.getBoundingClientRect();
  const left = Math.min(
    window.innerWidth - bubbleRect.width - margin,
    Math.max(margin, rect.left + rect.width / 2 - bubbleRect.width / 2)
  );
  const aboveTop = rect.top - bubbleRect.height - margin;
  const rectBottom = Number.isFinite(rect.bottom) ? rect.bottom : rect.top + rect.height;
  const top = aboveTop >= margin ? aboveTop : Math.min(window.innerHeight - bubbleRect.height - margin, rectBottom + margin);

  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
}

async function handleQuickPhraseSelectionAdd(event) {
  event.preventDefault();
  event.stopPropagation();

  const phrase = normalizeQuickPhrases([quickPhraseSelectionText])[0] || "";
  if (!phrase) {
    hideQuickPhraseSelectionBubble();
    return;
  }

  const result = await addQuickPhraseValue(phrase);
  showQuickPhraseSelectionAddedState(result.added);
}

function showQuickPhraseSelectionAddedState(added) {
  const bubble = getQuickPhraseSelectionBubble();
  const button = bubble.querySelector(".nsh-quick-phrase-selection-button");
  button.textContent = added ? "已添加" : "已存在";
  bubble.hidden = false;

  window.clearTimeout(quickPhraseSelectionHideTimer);
  quickPhraseSelectionHideTimer = window.setTimeout(hideQuickPhraseSelectionBubble, 700);
}

function hideQuickPhraseSelectionBubble() {
  window.clearTimeout(quickPhraseSelectionHideTimer);
  quickPhraseSelectionHideTimer = 0;
  quickPhraseSelectionText = "";
  if (quickPhraseSelectionBubble) {
    quickPhraseSelectionBubble.hidden = true;
  }
}

function handleQuickPhraseDocumentMouseDown(event) {
  const target = toQuickPhraseElement(event.target);
  quickPhraseSelectionEditor = findQuickPhraseEditorFromTarget(target);
  if (
    target?.closest?.(`.${QUICK_PHRASE_POPUP_CLASS}`)
    || target?.closest?.(`.${QUICK_PHRASE_TRIGGER_CLASS}`)
    || target?.closest?.(".nsh-quick-phrase-selection-bubble")
  ) {
    return;
  }

  hideQuickPhraseSelectionBubble();
  closeQuickPhrasePopup();
}

function createQuickPhraseIcon() {
  const svg = document.createElementNS(QUICK_PHRASE_SVG_NS, "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");

  [
    "M8 10C8 7.79086 9.79086 6 12 6H36C38.2091 6 40 7.79086 40 10V28C40 30.2091 38.2091 32 36 32H21L10 42V32H12C9.79086 32 8 30.2091 8 28V10Z",
    "M17 17H31",
    "M17 24H27"
  ].forEach((pathValue, index) => {
    const path = document.createElementNS(QUICK_PHRASE_SVG_NS, "path");
    path.setAttribute("d", pathValue);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    if (index === 0) {
      path.setAttribute("fill-rule", "evenodd");
      path.setAttribute("clip-rule", "evenodd");
    }
    svg.appendChild(path);
  });

  return svg;
}

function toQuickPhraseElement(target) {
  return target instanceof Element ? target : target?.parentElement || null;
}
