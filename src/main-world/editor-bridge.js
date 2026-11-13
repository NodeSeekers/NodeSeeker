(function () {
  const INSERT_EVENT = "nodeseek-helper:insert-markdown";
  const FOCUS_EVENT = "nodeseek-helper:focus-editor";
  const RESULT_EVENT = "nodeseek-helper:insert-result";
  const SELECTION_EVENT = "nodeseek-helper:get-editor-selection";
  const SELECTION_RESULT_EVENT = "nodeseek-helper:editor-selection-result";
  const AUTO_PAGE_COMMENTS_EVENT = "nodeseek-helper:append-post-comments";

  window.addEventListener(INSERT_EVENT, (event) => {
    const detail = event.detail || {};
    const ok = insertText(detail.text || "", detail.editorId || "");

    window.dispatchEvent(new CustomEvent(RESULT_EVENT, {
      detail: {
        requestId: detail.requestId,
        ok
      }
    }));
  });

  window.addEventListener(FOCUS_EVENT, (event) => {
    focusEditor(event.detail?.editorId || "");
  });

  window.addEventListener(SELECTION_EVENT, (event) => {
    const detail = event.detail || {};
    const selection = getEditorSelection(detail.editorId || "");

    window.dispatchEvent(new CustomEvent(SELECTION_RESULT_EVENT, {
      detail: {
        requestId: detail.requestId,
        ...selection
      }
    }));
  });

  window.addEventListener(AUTO_PAGE_COMMENTS_EVENT, (event) => {
    mountAppendedCommentMenus(event.detail?.comments);
  });

  function mountAppendedCommentMenus(comments) {
    const currentComments = window.__config__?.postData?.comments;
    if (!Array.isArray(comments) || !Array.isArray(currentComments)) {
      return;
    }

    const existingKeys = new Set(currentComments.map(getCommentKey).filter(Boolean));
    comments.forEach((comment) => {
      const key = getCommentKey(comment);
      if (!key || existingKeys.has(key)) {
        return;
      }

      existingKeys.add(key);
      currentComments.push(comment);
    });

    const template = Array.from(document.querySelectorAll(".comment-menu"))
      .map((node) => node.__vue__)
      .find((instance) => typeof instance?.setIndex === "function");
    if (!template) {
      return;
    }

    Array.from(document.querySelectorAll(".content-item")).forEach((item, index) => {
      const mount = item.querySelector(".comment-menu-mount");
      if (!mount || !currentComments[index]) {
        return;
      }

      const menu = new template.constructor(template.$options);
      menu.setIndex(index);
      menu.$mount(mount);
    });
  }

  function getCommentKey(comment) {
    if (comment?.commentId !== undefined && comment?.commentId !== null) {
      return `comment:${comment.commentId}`;
    }

    if (comment?.floorIndex !== undefined && comment?.floorIndex !== null) {
      return `floor:${comment.floorIndex}`;
    }

    return "";
  }

  function insertText(text, editorId) {
    if (!text) {
      return false;
    }

    const active = document.activeElement;
    const codeMirror = findCodeMirror(editorId, active);

    if (codeMirror) {
      codeMirror.focus();
      codeMirror.replaceSelection(text);
      return true;
    }

    if (editorId) {
      return false;
    }

    if (insertIntoTextControl(active, text)) {
      return true;
    }

    if (active && active.isContentEditable && document.execCommand) {
      active.focus();
      return document.execCommand("insertText", false, text);
    }

    return false;
  }

  function findCodeMirror(editorId, active) {
    const wrapper = editorId
      ? findEditorById(editorId)
      : active?.closest?.(".CodeMirror") || document.querySelector(".CodeMirror-focused");

    return wrapper?.CodeMirror || null;
  }

  function getEditorSelection(editorId) {
    const active = document.activeElement;
    const codeMirror = findCodeMirror(editorId, active);
    if (codeMirror) {
      return {
        ok: true,
        text: codeMirror.getSelection(),
        rect: getCodeMirrorSelectionRect(codeMirror)
      };
    }

    const control = editorId
      ? findEditorById(editorId)?.querySelector?.("textarea, input")
      : (["TEXTAREA", "INPUT"].includes(active?.tagName) ? active : null);
    if (!control) {
      return { ok: false, text: "", rect: null };
    }

    const start = control.selectionStart ?? 0;
    const end = control.selectionEnd ?? 0;
    return {
      ok: true,
      text: start === end ? "" : control.value.slice(start, end),
      rect: getElementRect(control)
    };
  }

  function getCodeMirrorSelectionRect(codeMirror) {
    if (!codeMirror || typeof codeMirror.cursorCoords !== "function") {
      return null;
    }

    let anchor = null;
    let head = null;
    try {
      anchor = codeMirror.cursorCoords(true, "window");
      head = codeMirror.cursorCoords(false, "window");
    } catch (_error) {
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

  function getElementRect(element) {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  }

  function focusEditor(editorId) {
    const active = document.activeElement;
    const codeMirror = findCodeMirror(editorId, active);
    if (codeMirror) {
      codeMirror.focus();
      return true;
    }

    const editor = editorId ? findEditorById(editorId) : active;
    const control = editor?.querySelector?.("textarea, input")
      || (["TEXTAREA", "INPUT"].includes(active?.tagName) ? active : null);
    if (!control) {
      return false;
    }

    control.focus();
    return true;
  }

  function findEditorById(editorId) {
    if (!editorId) {
      return null;
    }

    return document.querySelector(`[data-nsh-editor-id="${editorId}"]`);
  }

  function insertIntoTextControl(element, text) {
    if (!element || !["TEXTAREA", "INPUT"].includes(element.tagName)) {
      return false;
    }

    element.focus();

    if (typeof element.setRangeText === "function") {
      const start = element.selectionStart ?? element.value.length;
      const end = element.selectionEnd ?? element.value.length;
      element.setRangeText(text, start, end, "end");
    } else {
      element.value += text;
    }

    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: text
    }));

    return true;
  }
})();
