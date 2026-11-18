function scanBlockFilters(roots = null) {
  const rules = getBlockFilterRules();
  const pageMatch = getDetailPageTitleMatch(rules);
  setDetailPageBlockState(pageMatch);

  getBlockFilterTargets(roots).forEach((item) => {
    setBlockFilterState(item, rules.enabled && matchesBlockFilterItem(item, rules));
  });
}

function getBlockFilterTargets(roots = null) {
  if (!Array.isArray(roots)) {
    return Array.from(new Set(document.querySelectorAll(".content-item, .post-list-item")));
  }

  const items = new Set();
  roots.forEach((root) => {
    if (root.matches?.(".content-item, .post-list-item")) {
      items.add(root);
    }
    root.querySelectorAll?.(".content-item, .post-list-item").forEach((item) => items.add(item));
  });
  return Array.from(items);
}

function handleBlockFilterSelectionMouseUp(event) {
  if (blockFilterSelectionBubble?.contains(event.target)) {
    return;
  }

  window.setTimeout(showBlockFilterSelectionBubble, 0);
}

function handleBlockFilterSelectionMouseDown(event) {
  if (blockFilterSelectionBubble?.contains(event.target)) {
    return;
  }

  hideBlockFilterSelectionBubble();
}

function handleBlockFilterSelectionKeyDown(event) {
  if (event.key === "Escape") {
    hideBlockFilterSelectionBubble();
  }
}

function getBlockFilterRules() {
  const blockedKeywords = normalizeBlockFilterList(featureOptions.blockedKeywords);
  const blockedUsers = normalizeBlockFilterList(featureOptions.blockedUsers);
  return {
    enabled: featureOptions.blockFilterEnabled !== false && (blockedKeywords.length > 0 || blockedUsers.length > 0),
    keywords: blockedKeywords.map((keyword) => ({
      text: keyword,
      normalized: keyword.toLocaleLowerCase()
    })),
    users: new Set(blockedUsers)
  };
}

function matchesBlockFilterItem(item, rules) {
  if (isPostListItem(item)) {
    return Boolean(getListItemTitleMatch(item, rules) || getItemUserMatch(item, rules));
  }

  return Boolean(getItemUserMatch(item, rules) || getDetailItemTextMatch(item, rules));
}

function getDetailPageTitleMatch(rules) {
  if (!rules.enabled || !isPostDetailPage()) {
    return null;
  }

  return findKeywordMatch(getDetailPostTitle(), rules.keywords);
}

function getListItemTitleMatch(item, rules) {
  return findKeywordMatch(getPostListItemTitle(item), rules.keywords);
}

function getDetailItemTextMatch(item, rules) {
  return findKeywordMatch(getBlockFilterText(item), rules.keywords);
}

function getItemUserMatch(item, rules) {
  if (rules.users.size === 0) {
    return null;
  }

  const authorName = getBlockFilterAuthorName(item);
  return authorName && rules.users.has(authorName)
    ? { type: "user", text: authorName }
    : null;
}

function findKeywordMatch(text, keywords) {
  if (!text || keywords.length === 0) {
    return null;
  }

  const normalizedText = text.toLocaleLowerCase();
  const keyword = keywords.find((entry) => normalizedText.includes(entry.normalized));
  return keyword ? { type: "keyword", text: keyword.text } : null;
}

function getBlockFilterAuthorName(item) {
  const meta = item.querySelector(".nsk-content-meta-info") || item;
  const authorLink = meta.querySelector(".author-info .author-name[href*='/space/']")
    || meta.querySelector(".info-author a[href*='/space/']")
    || Array.from(meta.querySelectorAll("a[href*='/space/']")).find((link) => cleanText(link.textContent));

  return cleanText(authorLink?.textContent);
}

function getPostListItemTitle(item) {
  return cleanText(
    item.querySelector(".post-title a[href^='/post-'], .post-title a[href*='/post-']")?.textContent
    || item.querySelector(".post-title")?.textContent
  );
}

function getBlockFilterText(item) {
  const clone = item.cloneNode(true);
  clone
    .querySelectorAll(".nsh-user-stats, .nsh-profile-trend-popup, .nsh-lucky-button, .nsh-quick-reply-button, .nsh-message-entry, .nsh-message-entry-item, .nsh-follow-group-list")
    .forEach((node) => node.remove());

  return cleanText(clone.textContent);
}

function getDetailPostTitle() {
  return cleanText(
    document.querySelector(".post-title-link")?.textContent
    || document.querySelector("h1 a[href^='/post-'], h1 a[href*='/post-']")?.textContent
    || document.querySelector(".post-title h1")?.textContent
    || document.querySelector("h1")?.textContent
  );
}

function isPostDetailPage() {
  return /^\/post-\d+-\d+$/.test(location.pathname);
}

function isPostListItem(item) {
  return item.matches(".post-list-item");
}

function setDetailPageBlockState(match) {
  const existingMessage = document.querySelector(".nsh-page-blocked-message");
  document.querySelectorAll(".nsh-detail-content-blocked").forEach((container) => {
    container.classList.remove("nsh-detail-content-blocked");
  });

  if (!match) {
    existingMessage?.remove();
    return;
  }

  const container = getDetailPageBlockContainer();
  container.classList.add("nsh-detail-content-blocked");
  const message = existingMessage || document.createElement("div");
  message.className = "nsh-page-blocked-message";
  message.setAttribute("role", "status");
  message.textContent = `页面已隐藏，命中屏蔽词“${match.text}”`;

  if (message.parentElement !== container) {
    container.appendChild(message);
  }
}

function getDetailPageBlockContainer() {
  return document.querySelector("#nsk-body-left")
    || document.querySelector(".nsk-post-wrapper")
    || document.querySelector(".nsk-post")
    || document.body;
}

function setBlockFilterState(item, blocked) {
  if (blocked) {
    if (!item.classList.contains("nsh-blocked-content")) {
      item.classList.add("nsh-blocked-content");
    }
    if (item.dataset.nshBlockedContent !== "1") {
      item.dataset.nshBlockedContent = "1";
    }
    if (item.getAttribute("aria-hidden") !== "true") {
      item.setAttribute("aria-hidden", "true");
    }
    return;
  }

  if (item.classList.contains("nsh-blocked-content")) {
    item.classList.remove("nsh-blocked-content");
  }
  if (item.dataset.nshBlockedContent === "1") {
    delete item.dataset.nshBlockedContent;
    if (item.getAttribute("aria-hidden") === "true") {
      item.removeAttribute("aria-hidden");
    }
  }
}

function showBlockFilterSelectionBubble() {
  const context = getBlockFilterSelectionContext();
  if (!context) {
    hideBlockFilterSelectionBubble();
    return;
  }

  blockFilterSelectionKeyword = context.text;
  blockFilterSelectionType = context.type;
  const bubble = getBlockFilterSelectionBubble();
  syncBlockFilterSelectionBubbleButtons(bubble, context.type);
  bubble.hidden = false;
  positionBlockFilterSelectionBubble(bubble, context.rect);
}

function getBlockFilterSelectionContext() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const selectedText = normalizeBlockFilterList([selection.toString()])[0] || "";
  if (!selectedText) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const startElement = getElementFromSelectionNode(range.startContainer);
  const endElement = getElementFromSelectionNode(range.endContainer);
  if (!startElement || !endElement || isBlockFilterSelectionEditable(startElement) || isBlockFilterSelectionEditable(endElement)) {
    return null;
  }

  if (!isBlockFilterSelectionAllowed(startElement, endElement)) {
    return null;
  }

  const rect = getBlockFilterSelectionRect(range);
  const type = getBlockFilterSelectionType(startElement, endElement);
  if (!isBlockFilterSelectionTypeEnabled(type)) {
    return null;
  }

  const text = getBlockFilterSelectionText(type, selectedText, startElement, endElement);
  return rect && type ? { text, rect, type } : null;
}

function isBlockFilterSelectionAllowed(startElement, endElement) {
  if (isBlockFilterSelectionUser(startElement, endElement)) {
    return true;
  }

  const startTitle = startElement.closest(".post-title, .post-title-link");
  const endTitle = endElement.closest(".post-title, .post-title-link");
  if (startTitle && endTitle && (startTitle === endTitle || startTitle.contains(endTitle) || endTitle.contains(startTitle))) {
    return true;
  }

  const startItem = startElement.closest(".content-item");
  const endItem = endElement.closest(".content-item");
  if (!startItem || startItem !== endItem) {
    return false;
  }

  return !startElement.closest(getBlockFilterSelectionExcludedSelector())
    && !endElement.closest(getBlockFilterSelectionExcludedSelector());
}

function getBlockFilterSelectionType(startElement, endElement) {
  return isBlockFilterSelectionUser(startElement, endElement) ? "user" : "keyword";
}

function isBlockFilterSelectionTypeEnabled(type) {
  return type === "user"
    ? featureOptions.blockFilterQuickUserEnabled !== false
    : featureOptions.blockFilterQuickKeywordEnabled !== false;
}

function getBlockFilterSelectionText(type, selectedText, startElement, endElement) {
  if (type !== "user") {
    return selectedText;
  }

  const userElement = getBlockFilterSelectionUserElement(startElement)
    || getBlockFilterSelectionUserElement(endElement);
  return normalizeBlockFilterList([userElement?.textContent || selectedText])[0] || "";
}

function isBlockFilterSelectionUser(startElement, endElement) {
  const startUser = getBlockFilterSelectionUserElement(startElement);
  const endUser = getBlockFilterSelectionUserElement(endElement);
  return Boolean(startUser && endUser && startUser === endUser);
}

function getBlockFilterSelectionUserElement(element) {
  return element.closest(".author-info .author-name[href*='/space/'], .info-author a[href*='/space/']");
}

function getBlockFilterSelectionExcludedSelector() {
  return [
    ".nsk-content-meta-info",
    ".author-info",
    ".nsh-user-stats",
    ".nsh-message-entry",
    ".nsh-message-entry-item",
    ".nsh-follow-group-list",
    ".floor-link-wrapper",
    ".nsh-page-blocked-message",
    ".nsh-lucky-button",
    ".nsh-quick-reply-button",
    ".CodeMirror",
    "button",
    "input",
    "select",
    "textarea",
    "[contenteditable]"
  ].join(",");
}

function isBlockFilterSelectionEditable(element) {
  return Boolean(element.closest(".CodeMirror, input, textarea, select, [contenteditable]"));
}

function getElementFromSelectionNode(node) {
  return node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement || null;
}

function getBlockFilterSelectionRect(range) {
  const rect = range.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) {
    return rect;
  }

  return Array.from(range.getClientRects()).find((item) => item.width > 0 || item.height > 0) || null;
}

function getBlockFilterSelectionBubble() {
  if (blockFilterSelectionBubble?.isConnected) {
    return blockFilterSelectionBubble;
  }

  blockFilterSelectionBubble = document.createElement("div");
  blockFilterSelectionBubble.className = "nsh-selection-block-bubble nsh-selection-management-bubble";
  blockFilterSelectionBubble.hidden = true;

  const followButton = document.createElement("button");
  followButton.type = "button";
  followButton.className = "nsh-selection-block-button nsh-selection-follow-button";
  followButton.textContent = "标记关键字";
  followButton.addEventListener("mousedown", (event) => event.preventDefault());
  followButton.addEventListener("click", handleBlockFilterSelectionFollow);

  const blockButton = document.createElement("button");
  blockButton.type = "button";
  blockButton.className = "nsh-selection-block-button nsh-selection-management-block-button";
  blockButton.textContent = "屏蔽关键字";
  blockButton.addEventListener("mousedown", (event) => event.preventDefault());
  blockButton.addEventListener("click", handleBlockFilterSelectionBlock);
  blockFilterSelectionBubble.append(followButton, blockButton);

  document.body.appendChild(blockFilterSelectionBubble);
  return blockFilterSelectionBubble;
}

function positionBlockFilterSelectionBubble(bubble, rect) {
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

async function handleBlockFilterSelectionFollow(event) {
  event.preventDefault();
  event.stopPropagation();

  const value = normalizeBlockFilterList([blockFilterSelectionKeyword])[0] || "";
  if (!value) {
    hideBlockFilterSelectionBubble();
    return;
  }

  const selectionType = blockFilterSelectionType;
  const button = event.currentTarget;
  let completed = false;
  let completedText = "已标记";
  button.disabled = true;
  try {
    const groups = await getFollowRuleGroupOptions(selectionType, value);
    const selection = selectionType === "keyword"
      ? await openKeywordFollowRuleDialog(value, groups)
      : await openFollowRuleGroupDialog(selectionType, value, groups);
    if (!selection) {
      return;
    }
    const selectedValue = selection.value || value;
    if (selection.mode === "create") {
      await createNamedFollowRuleGroup(
        selectionType,
        selection.groupName,
        selectedValue,
        selection.groupIds
      );
    } else if (selection.mode === "unmark") {
      await removeFollowRuleKeyword(selectedValue);
      completedText = "已取消标记";
    } else if (selection.mode === "manage") {
      await setFollowedUserGroups(value, selection.groupIds);
      completedText = "已保存";
    } else {
      await assignFollowRuleItemToGroup(selectionType, selectedValue, selection.groupId);
    }
    completed = true;
    showBlockFilterSelectionAddedState("follow", selectionType, completedText);
  } catch (error) {
    button.title = error.message || (selectionType === "user" ? "保存失败" : "标记失败");
  } finally {
    if (!completed) {
      button.disabled = false;
    }
  }
}

async function handleBlockFilterSelectionBlock(event) {
  event.preventDefault();
  event.stopPropagation();

  const value = normalizeBlockFilterList([blockFilterSelectionKeyword])[0] || "";
  if (!value) {
    hideBlockFilterSelectionBubble();
    return;
  }

  const selectionType = blockFilterSelectionType;
  if (selectionType === "keyword") {
    hideBlockFilterSelectionBubble();
    try {
      await openKeywordBlockDialog(value);
    } catch (error) {
      showBlockFilterSelectionAddedState("block", selectionType, error.message || "屏蔽词操作失败");
    }
    return;
  }
  const storageKey = selectionType === "user" ? "blockedUsers" : "blockedKeywords";
  if (!await confirmBlockFilterSelectionAdd(value, selectionType)) {
    return;
  }

  await addBlockFilterValue(storageKey, value);
  showBlockFilterSelectionAddedState("block", selectionType);
}

function addBlockedUser(userName) {
  return addBlockFilterValue("blockedUsers", userName);
}

async function addBlockFilterValue(storageKey, value) {
  const normalizedValue = normalizeBlockFilterList([value])[0] || "";
  if (!normalizedValue) {
    return [];
  }

  const saved = await chrome.storage.local.get({ [storageKey]: [] });
  const values = normalizeBlockFilterList([...normalizeBlockFilterList(saved[storageKey]), normalizedValue]);
  await chrome.storage.local.set({
    blockFilterEnabled: true,
    [storageKey]: values
  });

  featureOptions = {
    ...featureOptions,
    blockFilterEnabled: true,
    [storageKey]: values
  };

  scanBlockFilters();
  return values;
}

async function removeBlockFilterValue(storageKey, value) {
  const normalizedValue = normalizeBlockFilterList([value])[0] || "";
  if (!normalizedValue) return [];

  const saved = await chrome.storage.local.get({ [storageKey]: [] });
  const identity = normalizedValue.toLocaleLowerCase();
  const values = normalizeBlockFilterList(saved[storageKey])
    .filter((entry) => entry.toLocaleLowerCase() !== identity);
  await chrome.storage.local.set({ [storageKey]: values });
  featureOptions = { ...featureOptions, [storageKey]: values };
  scanBlockFilters();
  return values;
}

async function openKeywordBlockDialog(value) {
  let keywords = normalizeBlockFilterList((await chrome.storage.local.get({ blockedKeywords: [] })).blockedKeywords);
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "nsh-dialog-backdrop";
    const dialog = document.createElement("section");
    dialog.className = "nsh-dialog nsh-keyword-block-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const title = document.createElement("h2");
    title.textContent = "屏蔽关键词";
    const description = document.createElement("p");
    description.textContent = "可以修改选中的文字，再添加或管理屏蔽词。";

    const field = document.createElement("label");
    field.className = "nsh-keyword-block-field";
    const label = document.createElement("span");
    label.textContent = "关键词";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 120;
    input.value = value;
    input.autocomplete = "off";
    field.append(label, input);

    const status = document.createElement("div");
    status.className = "nsh-keyword-block-status";
    const statusText = document.createElement("span");
    const undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.className = "nsh-keyword-block-undo";
    status.append(statusText, undoButton);

    const manage = document.createElement("details");
    manage.className = "nsh-keyword-block-manage";
    const summary = document.createElement("summary");
    const list = document.createElement("div");
    list.className = "nsh-keyword-block-list";
    manage.append(summary, list);

    const actions = document.createElement("div");
    actions.className = "nsh-dialog-actions";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "关闭";
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "nsh-dialog-primary nsh-keyword-block-add";
    addButton.textContent = "添加屏蔽词";
    actions.append(cancelButton, addButton);
    dialog.append(title, description, field, status, manage, actions);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    const close = (result = null) => {
      document.removeEventListener("keydown", handleKeyDown);
      backdrop.remove();
      resolve(result);
    };
    const isBlocked = (keyword) => keywords.some((entry) =>
      entry.toLocaleLowerCase() === keyword.toLocaleLowerCase());
    const render = () => {
      const keyword = normalizeBlockFilterList([input.value])[0] || "";
      const exists = Boolean(keyword && isBlocked(keyword));
      status.hidden = !exists;
      statusText.textContent = exists ? `「${keyword}」已在屏蔽词中` : "";
      undoButton.textContent = "撤销屏蔽";
      undoButton.hidden = !exists;
      addButton.disabled = !keyword || exists;
      summary.textContent = `管理屏蔽词（${keywords.length}）`;
      list.replaceChildren();
      if (!keywords.length) {
        const empty = document.createElement("p");
        empty.className = "nsh-keyword-block-empty";
        empty.textContent = "还没有屏蔽词。";
        list.appendChild(empty);
      }
      keywords.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "nsh-keyword-block-row";
        const text = document.createElement("span");
        text.textContent = entry;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "删除";
        remove.addEventListener("click", async () => {
          try {
            keywords = await removeBlockFilterValue("blockedKeywords", entry);
            render();
          } catch (error) {
            status.hidden = false;
            statusText.textContent = error.message || "删除失败";
          }
        });
        row.append(text, remove);
        list.appendChild(row);
      });
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") close();
      if (event.key === "Enter" && event.target === input) {
        event.preventDefault();
        addButton.click();
      }
    };

    input.addEventListener("input", render);
    addButton.addEventListener("click", async () => {
      const keyword = normalizeBlockFilterList([input.value])[0] || "";
      if (!keyword) {
        input.setCustomValidity("请输入关键词");
        input.reportValidity();
        return;
      }
      input.setCustomValidity("");
      try {
        keywords = await addBlockFilterValue("blockedKeywords", keyword);
        render();
        status.hidden = false;
        statusText.textContent = `已添加「${keyword}」`;
        undoButton.hidden = false;
        addButton.disabled = true;
      } catch (error) {
        status.hidden = false;
        statusText.textContent = error.message || "添加失败";
      }
    });
    undoButton.addEventListener("click", async () => {
      const keyword = normalizeBlockFilterList([input.value])[0] || "";
      try {
        keywords = await removeBlockFilterValue("blockedKeywords", keyword);
        render();
        status.hidden = false;
        statusText.textContent = `已撤销「${keyword}」`;
      } catch (error) {
        status.hidden = false;
        statusText.textContent = error.message || "撤销失败";
      }
    });
    cancelButton.addEventListener("click", () => close());
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });
    document.addEventListener("keydown", handleKeyDown);
    render();
    input.focus();
    input.select();
  });
}

function confirmBlockFilterSelectionAdd(text, type) {
  const isUser = type === "user";
  const action = isUser ? "屏蔽用户" : "屏蔽关键字";
  return openNshConfirmDialog({
    title: action,
    message: `确定${action}「${text}」吗？`,
    confirmText: "屏蔽"
  });
}

function showBlockFilterSelectionAddedState(action, type, completedText = "") {
  const bubble = getBlockFilterSelectionBubble();
  const selector = action === "follow"
    ? ".nsh-selection-follow-button"
    : ".nsh-selection-management-block-button";
  const button = bubble.querySelector(selector);
  button.textContent = completedText || (action === "follow" ? "已标记" : "已屏蔽");
  button.disabled = true;
  bubble.hidden = false;

  window.clearTimeout(blockFilterSelectionHideTimer);
  blockFilterSelectionHideTimer = window.setTimeout(hideBlockFilterSelectionBubble, 700);
}

function syncBlockFilterSelectionBubbleButtons(bubble, type) {
  const target = type === "user" ? "用户" : "关键字";
  const followButton = bubble.querySelector(".nsh-selection-follow-button");
  const blockButton = bubble.querySelector(".nsh-selection-management-block-button");
  followButton.textContent = `标记${target}`;
  followButton.disabled = false;
  followButton.removeAttribute("title");
  blockButton.textContent = `屏蔽${target}`;
  blockButton.disabled = false;
  blockButton.removeAttribute("title");
}

function hideBlockFilterSelectionBubble() {
  window.clearTimeout(blockFilterSelectionHideTimer);
  blockFilterSelectionHideTimer = 0;
  blockFilterSelectionKeyword = "";
  blockFilterSelectionType = "keyword";
  if (blockFilterSelectionBubble) {
    blockFilterSelectionBubble.hidden = true;
  }
}
