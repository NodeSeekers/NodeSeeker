function handleLuckyAutoAddClick(event) {
  if (!featureOptions.luckyNotificationsEnabled || !featureOptions.luckyAutoAddEnabled) {
    return;
  }

  const control = findClickedSubmitControl(event.target);
  if (!control || !isLuckyAutoAddSubmitText(getControlText(control)) || !hasEditorNearSubmitControl(control)) {
    return;
  }

  resolveCurrentLuckyNotificationTarget()
    .then((target) => {
      if (!target || target.exists) {
        return null;
      }

      return addLuckyNotificationFromComment(target.luckyUrl);
    })
    .catch((error) => {
      if (!isExtensionContextInvalidated(error)) {
        console.warn("Failed to auto add lucky notification", error);
      }
    });
}

function findClickedSubmitControl(target) {
  const element = toElement(target);
  return element?.closest?.("button, input[type='button'], input[type='submit']") || null;
}

function hasEditorNearSubmitControl(control) {
  let current = control.parentElement;

  for (let depth = 0; current && depth < 8; depth += 1) {
    if (current.matches("body, html")) {
      break;
    }

    if (current.querySelector(".CodeMirror, textarea, [contenteditable]")) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

async function addLuckyNotificationFromComment(luckyUrl) {
  const notification = buildLuckyNotification(luckyUrl);
  await saveLuckyNotification(notification);

  const button = document.querySelector(".nsh-lucky-button");
  if (button?.dataset.luckyUrl === notification.luckyUrl) {
    setLuckyButtonState(button, true);
  }
}

async function scanLuckyLinks() {
  const existingButton = document.querySelector(".nsh-lucky-button");
  if (!featureOptions.luckyNotificationsEnabled) {
    removeLuckyButton();
    return;
  }

  const buttonGroup = findLuckyButtonGroup();
  if (!buttonGroup) {
    removeLuckyButton();
    return;
  }

  const target = await resolveCurrentLuckyNotificationTarget();
  if (!target) {
    removeLuckyButton();
    return;
  }

  const { luckyUrl, exists } = target;
  if (existingButton?.dataset.luckyUrl === luckyUrl) {
    mountLuckyButton(existingButton, buttonGroup);
    ensureQuickReplyButton(buttonGroup);
    setLuckyButtonState(existingButton, exists);
    return;
  }

  existingButton?.remove();

  const button = document.createElement("button");
  button.type = "button";
  button.className = "nsh-lucky-button";
  button.dataset.luckyUrl = luckyUrl;
  setLuckyButtonLabel(button, false);
  button.addEventListener("click", () => handleLuckyButtonClick(button));
  mountLuckyButton(button, buttonGroup);
  ensureQuickReplyButton(buttonGroup);
  setLuckyButtonState(button, exists);
}

function scanLuckyLinksSafely() {
  scanLuckyLinks().catch((error) => {
    if (!isExtensionContextInvalidated(error)) {
      throw error;
    }
  });
}

function isExtensionContextInvalidated(error) {
  return /Extension context invalidated/i.test(error?.message || String(error));
}

function findLuckyButtonGroup() {
  return document.getElementById("fast-nav-button-group");
}

function mountLuckyButton(button, buttonGroup) {
  if (buttonGroup.firstElementChild !== button) {
    buttonGroup.prepend(button);
  }
  positionFastNavHelperButtons();
}

function scanQuickReplyButton() {
  const buttonGroup = findLuckyButtonGroup();
  if (!buttonGroup || !findQuickReplyEditor()) {
    removeQuickReplyButton();
    return;
  }

  ensureQuickReplyButton(buttonGroup);
}

function ensureQuickReplyButton(buttonGroup) {
  let button = document.querySelector(".nsh-quick-reply-button");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "nsh-quick-reply-button";
    button.title = "快捷评论";
    button.setAttribute("aria-label", "快捷评论");
    button.appendChild(createQuickReplyButtonIcon());
    button.addEventListener("click", handleQuickReplyButtonClick);
  }

  const luckyButton = buttonGroup.querySelector(".nsh-lucky-button");
  if (luckyButton) {
    if (luckyButton.nextElementSibling !== button) {
      luckyButton.after(button);
    }
  } else if (buttonGroup.firstElementChild !== button) {
    buttonGroup.prepend(button);
  }

  positionFastNavHelperButtons();
  return button;
}

function removeLuckyButton() {
  document.querySelector(".nsh-lucky-button")?.remove();
  positionFastNavHelperButtons();
}

function removeQuickReplyButton() {
  document.querySelector(".nsh-quick-reply-button")?.remove();
  positionFastNavHelperButtons();
}

function positionFastNavHelperButtons() {
  const visibleNavButtons = ["back-to-top", "back-to-parent", "back-to-bottom"]
    .map((id) => document.getElementById(id))
    .filter(isVisibleNavButton);
  const topButton = visibleNavButtons.reduce((current, next) => {
    const nextBottom = getNavButtonBottom(next);
    return !current || nextBottom > current.bottom ? { bottom: nextBottom } : current;
  }, null);
  const baseBottom = (topButton?.bottom || 0) + LUCKY_NAV_BUTTON_GAP;
  const quickReplyButton = document.querySelector(".nsh-quick-reply-button");
  const luckyButton = document.querySelector(".nsh-lucky-button");

  if (quickReplyButton) {
    quickReplyButton.style.setProperty("--nsh-quick-reply-bottom", `${baseBottom}px`);
  }

  if (luckyButton) {
    const luckyBottom = baseBottom + (quickReplyButton ? LUCKY_NAV_BUTTON_GAP : 0);
    luckyButton.style.setProperty("--nsh-lucky-bottom", `${luckyBottom}px`);
  }
}

function scheduleLuckyButtonPosition() {
  if (luckyPositionFrame) {
    return;
  }

  luckyPositionFrame = window.requestAnimationFrame(() => {
    luckyPositionFrame = 0;
    positionFastNavHelperButtons();
  });
}

function handleQuickReplyButtonClick() {
  const editor = findQuickReplyEditor();
  if (!editor) {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth"
    });
    return;
  }

  editor.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center"
  });

  window.setTimeout(() => focusQuickReplyEditor(editor), 500);
}

function triggerQuickReplyShortcut() {
  const button = document.querySelector(".nsh-quick-reply-button");
  if (!button || !getPostIdFromLocation()) {
    return false;
  }

  button.click();
  return true;
}

function focusQuickReplyEditor(editor = findQuickReplyEditor()) {
  if (!editor) {
    return;
  }

  activateEditor(editor);
}

function findQuickReplyEditor() {
  const editors = Array.from(document.querySelectorAll(".CodeMirror"));
  const replyEditor = editors.find((editor) => {
    const container = findEditorContainer(editor);
    const submitButton = container ? findSubmitButton(container) : null;
    return submitButton && isSubmitControlText(getControlText(submitButton));
  });

  return replyEditor || editors[editors.length - 1] || null;
}

function activateEditor(editor) {
  const editorId = ensureEditorId(editor);
  const clickTarget = editor.querySelector(".CodeMirror-code") || editor;
  const eventOptions = {
    bubbles: true,
    cancelable: true,
    view: window
  };

  clickTarget.dispatchEvent(new MouseEvent("mousedown", eventOptions));
  clickTarget.dispatchEvent(new MouseEvent("mouseup", eventOptions));
  clickTarget.dispatchEvent(new MouseEvent("click", eventOptions));
  window.dispatchEvent(new CustomEvent(FOCUS_EVENT, {
    detail: { editorId }
  }));

  const textarea = editor.querySelector("textarea");
  if (textarea) {
    textarea.focus({ preventScroll: true });
  }
}

function isVisibleNavButton(button) {
  return Boolean(button && getComputedStyle(button).display !== "none");
}

function getNavButtonBottom(button) {
  const bottom = Number.parseFloat(getComputedStyle(button).bottom);
  return Number.isFinite(bottom) ? bottom : 0;
}

function findLuckyLink(root) {
  const links = Array.from(root.querySelectorAll("a[href*='/lucky?'], a[href^='/lucky?']"));
  return links.find((link) => {
    const luckyUrl = toUrl(link.getAttribute("href"));
    if (!luckyUrl || luckyUrl.pathname !== "/lucky" || !luckyUrl.searchParams.get("post")) {
      return false;
    }

    return luckyUrl.searchParams.get("mode") === "view" || cleanText(link.textContent).includes("开奖");
  }) || null;
}

function getCurrentLuckyUrl() {
  const luckyLink = findLuckyLink(document);
  return luckyLink ? toAbsoluteUrl(luckyLink.getAttribute("href")) : "";
}

async function resolveCurrentLuckyNotificationTarget() {
  const luckyUrl = getCurrentLuckyUrl();
  if (!luckyUrl) {
    return null;
  }

  const notification = await getLuckyNotification(luckyUrl);
  const exists = Boolean(notification);
  if (isLuckyDrawDone(luckyUrl) && !exists) {
    return null;
  }

  return {
    luckyUrl,
    exists
  };
}

async function handleLuckyButtonClick(button) {
  if (button.classList.contains("nsh-lucky-button-added")) {
    await handleLuckyButtonDelete(button);
    return;
  }

  await handleLuckyButtonAdd(button);
}

async function handleLuckyButtonAdd(button) {
  button.disabled = true;
  const previousTitle = button.title;
  button.textContent = "...";
  button.title = "正在添加抽奖通知";
  button.setAttribute("aria-label", "正在添加抽奖通知");

  try {
    const notification = buildLuckyNotification(button.dataset.luckyUrl);
    const added = await saveLuckyNotification(notification);
    button.classList.add("nsh-lucky-button-added");
    setLuckyButtonLabel(button, true, added ? "已添加抽奖通知" : "已在通知列表中");
  } catch (error) {
    button.textContent = "!";
    button.title = error.message || String(error);
    button.setAttribute("aria-label", "添加抽奖通知失败");
    window.setTimeout(() => {
      setLuckyButtonLabel(button, false, previousTitle);
      button.disabled = false;
    }, 2000);
    return;
  }

  button.disabled = false;
}

async function handleLuckyButtonDelete(button) {
  const confirmed = await openLuckyDeleteDialog(getCurrentPostTitle());
  if (!confirmed) {
    return;
  }

  button.disabled = true;
  const previousTitle = button.title;
  button.textContent = "...";
  button.title = "正在删除抽奖通知";
  button.setAttribute("aria-label", "正在删除抽奖通知");

  try {
    await deleteLuckyNotification(button.dataset.luckyUrl);
    setLuckyButtonState(button, false);
  } catch (error) {
    button.textContent = "!";
    button.title = error.message || String(error);
    button.setAttribute("aria-label", "删除抽奖通知失败");
    window.setTimeout(() => {
      setLuckyButtonLabel(button, true, previousTitle);
      button.disabled = false;
    }, 2000);
    return;
  }

  button.disabled = false;
}

function setLuckyButtonState(button, exists) {
  button.classList.toggle("nsh-lucky-button-added", exists);
  setLuckyButtonLabel(button, exists);
}

function setLuckyButtonLabel(button, exists, title) {
  const label = exists ? "已添加抽奖通知" : "添加抽奖通知";
  button.replaceChildren(createLuckyButtonIcon(exists));
  button.title = title || label;
  button.setAttribute("aria-label", label);
}

function createLuckyButtonIcon(exists) {
  const svg = createSvgElement("svg", {
    class: "nsh-lucky-icon",
    viewBox: "0 0 1024 1024",
    "aria-hidden": "true",
    focusable: "false"
  });

  if (exists) {
    svg.append(
      createSvgElement("path", {
        d: "M910.7 302.7L408.4 805c-23.1 23.1-60.6 23.1-83.7 0l-41.9-41.9L826.9 219c23.1-23.1 60.6-23.1 83.7 0 23.2 23.1 23.2 60.6 0.1 83.7z",
        fill: "currentColor"
      }),
      createSvgElement("path", {
        d: "M324.6 805L115.3 595.7c-23.1-23.1-23.1-60.6 0-83.7s60.6-23.1 83.7 0l251.2 251.2-41.8 41.8c-23.2 23.1-60.6 23.1-83.8 0z",
        fill: "currentColor"
      })
    );
    return svg;
  }

  svg.append(
    createSvgElement("path", {
      d: "M921.6 880.64h-819.2A51.2 51.2 0 0 1 51.2 829.44v-66.56A107.7248 107.7248 0 0 1 158.72 655.36a30.72 30.72 0 0 0 30.72-30.72V376.832A319.6928 319.6928 0 0 1 399.36 78.2336a112.0256 112.0256 0 0 1 213.6064 0A319.6928 319.6928 0 0 1 824.32 376.832v247.808a30.72 30.72 0 0 0 30.72 30.72h10.24A107.7248 107.7248 0 0 1 972.8 762.88v66.56a51.2 51.2 0 0 1-51.2 51.2zM112.64 819.2h798.72v-56.32A46.08 46.08 0 0 0 865.28 716.8h-10.24a92.16 92.16 0 0 1-92.16-92.16V376.832a257.8432 257.8432 0 0 0-184.32-245.76l-19.0464-5.7344-2.6624-20.48a50.7904 50.7904 0 0 0-100.7616 0l-2.6624 20.48-19.0464 5.7344a257.8432 257.8432 0 0 0-184.32 245.76v247.808A92.16 92.16 0 0 1 158.72 716.8 46.08 46.08 0 0 0 112.64 762.88z",
      fill: "currentColor"
    }),
    createSvgElement("path", {
      d: "M665.6 353.6896a30.72 30.72 0 0 1-25.6-13.9264A259.4816 259.4816 0 0 0 542.72 251.904a30.72 30.72 0 0 1 28.2624-54.4768 320.9216 320.9216 0 0 1 120.6272 108.7488A30.72 30.72 0 0 1 665.6 353.6896z",
      fill: "currentColor"
    }),
    createSvgElement("path", {
      d: "M512 1024a174.2848 174.2848 0 0 1-174.08-174.08h61.44a112.64 112.64 0 0 0 225.28 0h61.44a174.2848 174.2848 0 0 1-174.08 174.08z",
      fill: "currentColor"
    })
  );
  return svg;
}

function createQuickReplyButtonIcon() {
  const svg = createSvgElement("svg", {
    class: "nsh-quick-reply-icon",
    viewBox: "0 0 1024 1024",
    "aria-hidden": "true",
    focusable: "false"
  });

  svg.appendChild(createSvgElement("path", {
    d: "M821.333333 807.786667H547.584l-86.464 98.666666c-7.658667 8.746667-19.242667 12.586667-30.442667 10.154667a32.32 32.32 0 0 1-23.786666-21.973333 33.536 33.536 0 0 1 6.656-32.149334l96-109.546666c6.058667-6.933333 14.72-10.88 23.786666-10.88h288c14.144 0 27.712-5.76 37.717334-16.042667A55.530667 55.530667 0 0 0 874.666667 687.274667V227.2c0-14.528-5.610667-28.458667-15.616-38.741333a52.629333 52.629333 0 0 0-37.717334-16.042667h-618.666666c-14.144 0-27.712 5.76-37.717334 16.042667A55.530667 55.530667 0 0 0 149.333333 227.2v460.096c0 14.528 5.610667 28.458667 15.616 38.741333a52.629333 52.629333 0 0 0 37.717334 16.042667H341.333333c17.664 0 32 14.72 32 32.853333 0 18.154667-14.336 32.853333-32 32.853334H202.666667c-64.789333 0-117.333333-53.930667-117.333334-120.490667V227.2C85.333333 160.618667 137.856 106.666667 202.666667 106.666667h618.666666c64.810667 0 117.333333 53.952 117.333334 120.512v460.096c0 66.56-52.522667 120.512-117.333334 120.512zM704 336.725333c17.664 0 32 14.72 32 32.853334 0 18.154667-14.336 32.853333-32 32.853333H320c-17.664 0-32-14.698667-32-32.853333 0-18.133333 14.336-32.853333 32-32.853334h384zM512 512c17.664 0 32 14.72 32 32.853333 0 18.154667-14.336 32.874667-32 32.874667h-192c-17.664 0-32-14.72-32-32.853333 0-18.154667 14.336-32.874667 32-32.874667h192z",
    fill: "currentColor"
  }));
  return svg;
}

function createSvgElement(tagName, attributes) {
  const element = document.createElementNS(SVG_NAMESPACE, tagName);
  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
  return element;
}

function isLuckyDrawDone(luckyUrl) {
  const url = toUrl(luckyUrl);
  const drawAt = Number(url?.searchParams.get("time")) || 0;
  return Boolean(drawAt) && Date.now() >= drawAt;
}

function buildLuckyNotification(luckyUrl) {
  const url = toUrl(luckyUrl);
  if (!url) {
    throw new Error("开奖链接无效");
  }

  const postId = url.searchParams.get("post") || getPostIdFromLocation();
  const drawAt = Number(url.searchParams.get("time")) || 0;
  const author = getCurrentLuckyAuthor();

  return {
    id: url.toString(),
    title: getCurrentPostTitle(),
    postId,
    postUrl: getCurrentPostUrl(),
    ...author,
    luckyUrl: url.toString(),
    drawAt,
    notifiedAt: 0,
    addedAt: Date.now()
  };
}

async function saveLuckyNotification(notification) {
  const result = await sendExtensionMessage("lucky:add", { notification });
  return Boolean(result?.added);
}

async function deleteLuckyNotification(luckyUrl) {
  await sendExtensionMessage("lucky:delete", { luckyUrl });
}

async function getLuckyNotification(luckyUrl) {
  return sendExtensionMessage("lucky:getByUrl", { luckyUrl });
}

function getCurrentPostTitle() {
  return cleanText(
    document.querySelector("h1 a[href^='/post-']")?.textContent
    || document.querySelector("h1")?.textContent
    || document.title.replace(/\s*-\s*NodeSeek.*$/i, "")
  ) || "NodeSeek 帖子";
}

function getCurrentPostUrl() {
  return new URL(`${location.pathname}${location.search}`, location.origin).toString();
}

function getCurrentLuckyAuthor() {
  const root = document.querySelector(".content-item .nsk-content-meta-info")?.closest(".content-item")
    || document.querySelector(".content-item")
    || document;
  const authorLink = root.querySelector(".author-info .author-name[href*='/space/']")
    || root.querySelector("a.author-name[href*='/space/']")
    || Array.from(root.querySelectorAll("a[href*='/space/']"))
      .find((link) => cleanText(link.textContent));
  const authorHref = authorLink?.getAttribute("href") || "";
  const authorUrl = authorHref ? toAbsoluteUrl(authorHref) : "";

  return {
    authorName: cleanText(authorLink?.textContent),
    authorId: cleanText(toUrl(authorUrl)?.pathname.match(/^\/space\/([^/?#]+)/)?.[1]),
    authorUrl
  };
}

function getPostIdFromLocation() {
  return location.pathname.match(/^\/post-(\d+)/)?.[1] || "";
}

function toUrl(value) {
  try {
    return new URL(value, location.origin);
  } catch {
    return null;
  }
}

function toAbsoluteUrl(value) {
  return toUrl(value)?.toString() || "";
}
