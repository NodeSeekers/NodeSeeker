async function handlePaste(event) {
  if (!featureOptions.imageUploadEnabled) {
    return;
  }

  const editor = getEditorRoot(event.target, true);
  if (!editor) {
    return;
  }

  const imageFiles = getImageFiles(event.clipboardData);
  if (imageFiles.length === 0) {
    return;
  }

  event.preventDefault();
  uploadFilesToEditor(imageFiles, editor);
}

function handleDragOver(event) {
  if (!featureOptions.imageUploadEnabled) {
    return;
  }

  const editor = getEditorRoot(event.target, false);
  if (!editor || !hasImageFiles(event.dataTransfer)) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

function handleDrop(event) {
  if (!featureOptions.imageUploadEnabled) {
    return;
  }

  const editor = getEditorRoot(event.target, false);
  if (!editor) {
    return;
  }

  const imageFiles = getImageFiles(event.dataTransfer);
  if (imageFiles.length === 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  uploadFilesToEditor(imageFiles, editor);
}

async function uploadFilesToEditor(imageFiles, editor) {
  const status = showEditorStatus("正在上传图片...", editor);

  const markdownList = [];
  const failed = [];
  try {

    for (const file of imageFiles) {
      status.textContent = `正在上传 ${file.name || "图片"}...`;
      try {
        const result = await uploadImage(await fileToUploadPayload(file));
        markdownList.push(result.markdown);
      } catch (error) {
        failed.push({ file, error });
      }
    }

    const markdown = `${markdownList.join("\n")}\n`;
    const inserted = markdownList.length > 0 && await insertMarkdown(markdown, editor);

    status.textContent = inserted ? "图片已上传并插入" : markdownList.length ? "图片已上传，请手动复制链接" : "图片上传失败";
    if (!inserted && markdownList.length) status.appendChild(createCopyButton(markdown));
    if (failed.length) {
      status.append(document.createTextNode(` ${failed.length} 张上传失败：${failed[0].error?.message || failed[0].error} `));
      const retry = document.createElement("button");
      retry.type = "button";
      retry.textContent = "重试失败图片";
      retry.onclick = () => {
        removeUploadStatus(status);
        uploadFilesToEditor(failed.map(({ file }) => file), editor);
      };
      status.append(retry);
    }
  } catch (error) {
    status.textContent = error.message || String(error);
  } finally {
    if (!failed.length && !status.querySelector("button")) setTimeout(() => removeUploadStatus(status), 6000);
  }
}

function getEditorRoot(eventTarget, allowActiveFallback) {
  const target = toElement(eventTarget);
  return target?.closest?.(".CodeMirror")
    || (allowActiveFallback ? document.activeElement?.closest?.(".CodeMirror") : null)
    || null;
}

function hasImageFiles(dataTransfer) {
  if (!dataTransfer) {
    return false;
  }

  if (dataTransfer.items?.length) {
    return [...dataTransfer.items].some((item) => item.kind === "file" && item.type.startsWith("image/"));
  }

  return [...(dataTransfer.files || [])].some((file) => file.type.startsWith("image/"));
}

function getImageFiles(dataTransfer) {
  if (!dataTransfer) {
    return [];
  }

  const itemFiles = dataTransfer.items?.length
    ? [...dataTransfer.items]
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean)
    : [];

  if (itemFiles.length > 0) {
    return itemFiles;
  }

  return [...(dataTransfer.files || [])].filter((file) => file.type.startsWith("image/"));
}

async function fileToUploadPayload(file) {
  const originalDataUrl = await fileToDataUrl(file);
  const supportedTypes = new Set(["image/gif", "image/jpeg", "image/png", "image/webp"]);

  if (supportedTypes.has(file.type)) {
    return {
      dataUrl: originalDataUrl,
      name: file.name,
      type: file.type
    };
  }

  try {
    const pngDataUrl = await convertImageToPng(originalDataUrl);
    return {
      dataUrl: pngDataUrl,
      name: withExtension(file.name, "png"),
      type: "image/png"
    };
  } catch {
    return {
      dataUrl: originalDataUrl,
      name: file.name,
      type: file.type
    };
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

function convertImageToPng(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("无法转换图片"));
        return;
      }

      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("无法识别剪贴板图片格式"));
    image.src = dataUrl;
  });
}

function withExtension(fileName, extension) {
  const baseName = (fileName || `nodeseek-${Date.now()}`).replace(/\.[^.]+$/, "");
  return `${baseName}.${extension}`;
}

async function uploadImage(payload) {
  const response = await chrome.runtime.sendMessage({ type: "uploadImage", payload });
  if (!response?.ok) {
    throw new Error(response?.error || "图片上传失败");
  }
  return response.result;
}

function insertMarkdown(text, editor) {
  return new Promise((resolve) => {
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const editorId = editor ? ensureEditorId(editor) : "";
    let settled = false;

    const finish = (ok) => {
      if (settled) {
        return;
      }

      settled = true;
      window.removeEventListener(RESULT_EVENT, handleResult);
      resolve(Boolean(ok) || insertNative(text, editor));
    };

    const handleResult = (event) => {
      if (event.detail?.requestId === requestId) {
        finish(event.detail.ok);
      }
    };

    window.addEventListener(RESULT_EVENT, handleResult);
    window.dispatchEvent(new CustomEvent(INSERT_EVENT, {
      detail: {
        requestId,
        editorId,
        text
      }
    }));

    setTimeout(() => finish(false), 300);
  });
}

function insertNative(text, editor) {
  const target = editor?.querySelector?.("textarea");

  if (!target || !["TEXTAREA", "INPUT"].includes(target.tagName)) {
    return false;
  }

  target.focus();

  if (typeof target.setRangeText === "function") {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    target.setRangeText(text, start, end, "end");
  } else {
    target.value += text;
  }

  target.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    inputType: "insertText",
    data: text
  }));

  return true;
}

function showEditorStatus(text, editor) {
  document.querySelectorAll(".nsh-upload-status").forEach((existingStatus) => {
    removeUploadStatus(existingStatus);
  });

  const status = document.createElement("div");
  status.className = "nsh-upload-status";
  status.textContent = text;
  const mount = findEditorStatusMount(editor);

  if (mount) {
    if (mount.row) {
      mount.row.classList.add("nsh-editor-action-row");
      mount.submitButton.classList.add("nsh-editor-submit-button");
    }
    mount.parent.insertBefore(status, mount.before);
  } else {
    status.classList.add("nsh-upload-status-floating");
    document.body.appendChild(status);
  }

  return status;
}

function removeUploadStatus(status) {
  const row = status.closest?.(".nsh-editor-action-row");
  status.remove();

  if (!row || row.querySelector(".nsh-upload-status")) {
    return;
  }

  row.classList.remove("nsh-editor-action-row");
  row.querySelectorAll(".nsh-editor-submit-button").forEach((button) => {
    button.classList.remove("nsh-editor-submit-button");
  });
}

function findEditorStatusMount(editor) {
  if (!editor) {
    return null;
  }

  const container = findEditorContainer(editor);
  const submitButton = container ? findSubmitButton(container) : null;
  if (!submitButton?.parentElement) {
    return null;
  }

  const row = submitButton.parentElement;
  return {
    parent: row,
    before: submitButton,
    row: row.contains(editor) ? null : row,
    submitButton
  };
}

function ensureEditorId(editor) {
  if (!editor.dataset.nshEditorId) {
    editor.dataset.nshEditorId = `nsh-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  return editor.dataset.nshEditorId;
}

function findEditorContainer(editor) {
  let current = editor.parentElement;

  for (let depth = 0; current && depth < 16; depth += 1) {
    if (current.matches("body, html")) {
      break;
    }

    if (findSubmitButton(current)) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function findSubmitButton(container) {
  const controls = Array.from(container.querySelectorAll("button, input[type='button'], input[type='submit']"));
  return controls.find((control) => isSubmitControlText(getControlText(control)));
}

function handleNewPostShortcut(event) {
  if (event.repeat || event.isComposing) {
    return;
  }

  const isReplyPage = isAutoPagePostDetailPage();
  if (isReplyPage) {
    const shortcut = normalizeShortcutFromEvent(event);
    if (!featureOptions.replySubmitShortcut || shortcut !== featureOptions.replySubmitShortcut) {
      return;
    }
  } else if (event.key !== "Enter" || event.metaKey === event.ctrlKey) {
    return;
  }

  const editor = toElement(event.target)?.closest?.(".CodeMirror")
    || document.activeElement?.closest?.(".CodeMirror")
    || document.querySelector(".CodeMirror-focused");
  if (!editor) {
    recordPublishShortcutDiagnostic("未找到聚焦的编辑器", event, null, null, isReplyPage);
    return;
  }

  const container = findEditorContainer(editor);
  const submitButton = container ? findSubmitButton(container) : null;
  if (!submitButton) {
    recordPublishShortcutDiagnostic("编辑器附近没有找到提交按钮", event, editor, null, isReplyPage);
    return;
  }

  const labels = getSubmitControlLabels(submitButton);
  const isPostSubmit = labels.some((label) => /^(发布|发布主题|发布帖子)$/.test(label));
  const isReplySubmit = labels.some((label) => /^(发布评论|编辑评论|回复评论|提交评论|回复|提交)$/.test(label));
  if (isReplyPage ? !isReplySubmit : !isPostSubmit) {
    recordPublishShortcutDiagnostic(`提交按钮文本未匹配：${labels.filter(Boolean).join(" / ") || "空"}`, event, editor, submitButton, isReplyPage);
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  submitButton.click();
  recordPublishShortcutDiagnostic("已触发提交按钮", event, editor, submitButton, isReplyPage);
}

function recordPublishShortcutDiagnostic(message, event, editor, submitButton, isReplyPage) {
  const diagnostic = {
    time: new Date().toISOString(),
    message,
    key: event.key,
    metaKey: Boolean(event.metaKey),
    ctrlKey: Boolean(event.ctrlKey),
    editorFound: Boolean(editor),
    submitLabel: getSubmitControlLabels(submitButton).filter(Boolean).join(" / "),
    page: isReplyPage ? "reply" : "post"
  };
  window.__nshPublishShortcutDebug = diagnostic;
  try {
    chrome.storage.local.set({ nshPublishShortcutDebug: diagnostic }).catch(() => {});
  } catch (_error) {
    // Keep the shortcut usable when extension storage is unavailable.
  }
  console.info("[NodeSeek Helper] Publish shortcut", diagnostic);

  const body = document.body;
  if (!body) return;
  let status = document.querySelector(".nsh-publish-shortcut-diagnostic");
  if (!status) {
    status = document.createElement("div");
    status.className = "nsh-publish-shortcut-diagnostic";
    status.setAttribute("role", "status");
    body.appendChild(status);
  }
  status.textContent = message;
  window.clearTimeout(status.hideTimer);
  status.hideTimer = window.setTimeout(() => status.remove(), 10000);
}

function isSubmitControlText(text) {
  return /^(发布评论|编辑评论|回复评论|提交评论|发布|回复|提交)$/.test(text);
}

function isLuckyAutoAddSubmitText(text) {
  return /(^|\s)发布评论(\s|$)/.test(text);
}

function getControlText(control) {
  return [
    control.textContent,
    control.value,
    control.getAttribute("aria-label"),
    control.getAttribute("title")
  ].filter(Boolean).join(" ").trim();
}

function getSubmitControlLabels(control) {
  if (!control) return [];
  return [
    control.textContent,
    control.value,
    control.getAttribute("aria-label"),
    control.getAttribute("title")
  ].map((text) => String(text || "").replace(/\s+/g, " ").trim());
}

function toElement(target) {
  return target instanceof Element ? target : target?.parentElement || null;
}

function createCopyButton(text) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "复制";
  button.className = "nsh-copy-button";
  button.addEventListener("click", () => navigator.clipboard.writeText(text));
  return button;
}
