const MESSAGE_ENTRY_SELECTOR = "#nsk-right-panel-container .user-card:not(.hover-user-card) > .user-stat";
const MESSAGE_ENTRY_HOST_CLASS = "nsh-message-entry-host";
const MESSAGE_ENTRY_CLASS = "nsh-message-entry";
const MESSAGE_ENTRY_ITEM_CLASS = "nsh-message-entry-item";
const MESSAGE_ENTRY_LABEL_CLASS = "nsh-message-entry-label";
const MESSAGE_ENTRY_COUNT_CLASS = "nsh-message-entry-count";
const MESSAGE_ENTRY_COUNT_POSITIVE_CLASS = "nsh-message-entry-count-positive";
const MESSAGE_ENTRY_ORIGINAL_ATTRIBUTE = "data-nsh-message-entry-original";
const MESSAGE_ENTRY_VERSION = "5";
const MESSAGE_ENTRY_COUNTS_TTL_MS = 30 * 1000;
const NOTIFICATION_PREVIEW_TTL_MS = 30 * 1000;
const NOTIFICATION_PREVIEW_HIDE_MS = 180;
const NOTIFICATION_COMMENT_PAGE_SIZE = 10;
const ORIGINAL_NOTIFICATION_ENTRY = {
  key: "at",
  countKey: "atMe",
  icon: "at",
  label: "提及",
  url: "/notification#/atMe"
};
const MESSAGE_ENTRY_LINKS = [
  {
    key: "reply",
    countKey: "reply",
    icon: "reply",
    label: "回复",
    url: "/notification#/reply",
    blockIndex: 0
  },
  {
    key: "message",
    countKey: "message",
    icon: "message",
    label: "私信",
    url: "/notification#/message?mode=list",
    blockIndex: 1
  }
];
const ALL_MESSAGE_ENTRY_LINKS = [ORIGINAL_NOTIFICATION_ENTRY, ...MESSAGE_ENTRY_LINKS];
let messageEntryCounts = null;
let messageEntryCountsPromise = null;
let messageEntryCountsLoadedAt = 0;
let notificationPreview = null;
let notificationPreviewHideTimer = 0;
const notificationPreviewCache = new Map();

function scanMessageEntry() {
  if (!featureOptions.readingNavigationEnabled || !featureOptions.messageEntryEnabled) {
    removeMessageEntries();
    return;
  }

  document.querySelectorAll(MESSAGE_ENTRY_SELECTOR).forEach((container) => {
    container.classList.remove(MESSAGE_ENTRY_HOST_CLASS);
    container.querySelectorAll(`.${MESSAGE_ENTRY_CLASS}`).forEach((node) => node.remove());

    const blocks = getMessageEntryBlocks(container);
    let hasEntry = false;
    if (syncOriginalNotificationEntry(container, ORIGINAL_NOTIFICATION_ENTRY, messageEntryCounts)) {
      hasEntry = true;
    }

    removeStaleMessageEntryItems(container);
    MESSAGE_ENTRY_LINKS.forEach((item) => {
      const block = blocks[item.blockIndex];
      if (!block) {
        return;
      }

      const entry = getMessageEntryItem(container, item.key) || createMessageEntryItem(item, block);
      syncMessageEntryItem(entry, item);
      syncMessageEntryScopeAttributes(entry, block);
      updateMessageEntryItemCount(entry, item, messageEntryCounts);
      if (entry.parentElement !== block || entry.nextElementSibling) {
        block.appendChild(entry);
      }
      hasEntry = true;
    });

    if (hasEntry) {
      loadMessageEntryCounts()
        .then(updateMessageEntryCounts)
        .catch(() => {});
    }
  });
}

function removeMessageEntries() {
  document
    .querySelectorAll(`.${MESSAGE_ENTRY_CLASS}, .${MESSAGE_ENTRY_ITEM_CLASS}`)
    .forEach((node) => node.remove());
  document.querySelectorAll(`[${MESSAGE_ENTRY_ORIGINAL_ATTRIBUTE}="1"]`).forEach((node) => {
    restoreOriginalMessageEntry(node);
  });
  document.querySelectorAll(`.${MESSAGE_ENTRY_HOST_CLASS}`).forEach((node) => {
    node.classList.remove(MESSAGE_ENTRY_HOST_CLASS);
  });
}

function getMessageEntryBlocks(container) {
  return Array.from(container.children).filter((child) => {
    return child.classList.contains("stat-block") && !child.classList.contains(MESSAGE_ENTRY_CLASS);
  });
}

function getMessageEntryItem(container, key) {
  const selector = `.${MESSAGE_ENTRY_ITEM_CLASS}[data-nsh-message-entry="${key}"]`;
  const entries = Array.from(container.querySelectorAll(selector));
  entries.slice(1).forEach((entry) => entry.remove());
  return entries[0] || null;
}

function removeStaleMessageEntryItems(container) {
  const keys = new Set(MESSAGE_ENTRY_LINKS.map((item) => item.key));
  container.querySelectorAll(`.${MESSAGE_ENTRY_ITEM_CLASS}`).forEach((entry) => {
    if (!keys.has(entry.dataset.nshMessageEntry)) {
      entry.remove();
    }
  });
}

function syncOriginalNotificationEntry(container, item, counts) {
  const entry = getOriginalMessageEntry(container);
  if (!entry) {
    return false;
  }

  if (entry.getAttribute(MESSAGE_ENTRY_ORIGINAL_ATTRIBUTE) !== "1") {
    entry.dataset.nshMessageEntryOriginalHtml = entry.innerHTML;
    entry.setAttribute(MESSAGE_ENTRY_ORIGINAL_ATTRIBUTE, "1");
  }

  syncMessageEntryItem(entry, item);
  syncMessageEntryScopeAttributes(entry, entry.closest(".stat-block") || container);
  updateMessageEntryItemCount(entry, item, counts);
  return true;
}

function getOriginalMessageEntry(container) {
  const existing = container.querySelector(`[${MESSAGE_ENTRY_ORIGINAL_ATTRIBUTE}="1"]`);
  if (existing) {
    return existing;
  }

  return Array.from(container.querySelectorAll(".stat-block > div")).find((entry) => {
    const link = entry.querySelector("a[href]");
    if (!link || entry.classList.contains(MESSAGE_ENTRY_ITEM_CLASS)) {
      return false;
    }

    const href = link.getAttribute("href") || "";
    const text = cleanText(link.textContent);
    return href === "/notification" || text.startsWith("通知");
  }) || null;
}

function restoreOriginalMessageEntry(entry) {
  if (entry.dataset.nshMessageEntryOriginalHtml) {
    entry.innerHTML = entry.dataset.nshMessageEntryOriginalHtml;
  }
  delete entry.dataset.nshMessageEntryOriginalHtml;
  delete entry.dataset.nshMessageEntry;
  entry.removeAttribute(MESSAGE_ENTRY_ORIGINAL_ATTRIBUTE);
}

function createMessageEntryItem(item, block) {
  const entry = document.createElement("div");
  entry.className = MESSAGE_ENTRY_ITEM_CLASS;
  entry.dataset.nshMessageEntry = item.key;

  const link = document.createElement("a");
  link.className = "nsh-message-entry-link";
  entry.appendChild(link);
  syncMessageEntryItem(entry, item);
  syncMessageEntryScopeAttributes(entry, block);
  return entry;
}

function syncMessageEntryItem(entry, item) {
  if (entry.dataset.nshMessageEntry !== item.key) {
    entry.dataset.nshMessageEntry = item.key;
  }
  let link = entry.querySelector("a");
  if (!link) {
    link = document.createElement("a");
    link.className = "nsh-message-entry-link";
    entry.appendChild(link);
  }

  link.classList.add("nsh-message-entry-link");
  if (link.getAttribute("href") !== item.url) {
    link.setAttribute("href", item.url);
  }
  bindNotificationPreview(link, item);
  if (link.dataset.nshMessageEntryVersion === MESSAGE_ENTRY_VERSION) {
    return;
  }

  const label = document.createElement("span");
  label.className = MESSAGE_ENTRY_LABEL_CLASS;
  label.textContent = `${item.label} `;

  const children = [
    createMessageEntryIcon(item),
    document.createTextNode(" "),
    label
  ];
  if (item.showCount !== false) {
    const count = document.createElement("span");
    count.className = MESSAGE_ENTRY_COUNT_CLASS;
    count.textContent = "0";
    children.push(count);
  }
  link.replaceChildren(...children);
  link.dataset.nshMessageEntryVersion = MESSAGE_ENTRY_VERSION;
}

function bindNotificationPreview(link, item) {
  if (link.dataset.nshPreviewBound === "1") return;
  link.dataset.nshPreviewBound = "1";
  link.addEventListener("mouseenter", () => showNotificationPreview(link, item));
  link.addEventListener("focus", () => showNotificationPreview(link, item));
  link.addEventListener("mouseleave", scheduleHideNotificationPreview);
  link.addEventListener("blur", scheduleHideNotificationPreview);
}

async function showNotificationPreview(anchor, item) {
  if (!featureOptions.messageEntryEnabled) return;
  window.clearTimeout(notificationPreviewHideTimer);
  const requestId = `${Date.now()}-${Math.random()}`;
  anchor.dataset.nshPreviewRequest = requestId;
  const popup = ensureNotificationPreview();
  popup.replaceChildren(createNotificationPreviewHeading(item), createNotificationPreviewMessage("加载中…"));
  positionNotificationPreview(popup, anchor);
  popup.classList.add("is-open");

  try {
    const entries = await loadNotificationPreviewEntries(item.key);
    if (anchor.dataset.nshPreviewRequest !== requestId) return;
    renderNotificationPreviewEntries(popup, item, entries);
    positionNotificationPreview(popup, anchor);
  } catch (_error) {
    if (anchor.dataset.nshPreviewRequest === requestId) {
      popup.replaceChildren(createNotificationPreviewHeading(item), createNotificationPreviewMessage("暂时无法加载"));
    }
  }
}

function ensureNotificationPreview() {
  if (notificationPreview?.isConnected) return notificationPreview;
  const popup = document.createElement("section");
  popup.className = "nsh-notification-preview";
  popup.setAttribute("role", "dialog");
  popup.addEventListener("mouseenter", () => window.clearTimeout(notificationPreviewHideTimer));
  popup.addEventListener("mouseleave", scheduleHideNotificationPreview);
  document.body.appendChild(popup);
  notificationPreview = popup;
  return popup;
}

function createNotificationPreviewHeading(item) {
  const heading = document.createElement("div");
  heading.className = "nsh-notification-preview-heading";
  const title = document.createElement("span");
  title.textContent = `${item.label || "通知"}预览`;
  heading.appendChild(title);
  if (item.key === "at" || item.key === "reply" || item.key === "message") {
    const markAll = document.createElement("button");
    markAll.type = "button";
    markAll.className = "nsh-notification-preview-mark-read";
    markAll.textContent = `${item.label}全部已读`;
    markAll.title = `将所有${item.label}标记为已读并刷新未读数`;
    markAll.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      markAllNotificationsRead(item, markAll);
    });
    heading.appendChild(markAll);
  }
  return heading;
}

async function markAllNotificationsRead(item, button) {
  if (button.disabled) return;
  button.disabled = true;
  button.textContent = "标记中…";
  button.classList.remove("is-error");
  try {
    const response = await fetch(getNotificationMarkAllUrl(item.key), {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" }
    });
    const result = await response.json();
    if (!response.ok || result?.success !== true) {
      throw new Error(result?.message || `HTTP ${response.status}`);
    }

    const cached = notificationPreviewCache.get(item.key);
    cached?.entries.forEach((entry) => { entry.viewed = 1; });
    updateNotificationPreviewReadState(item.key);
    button.textContent = `${item.label}已读`;
    button.title = `所有${item.label}已标记为已读`;
    button.classList.add("is-read");
    await refreshMessageEntryCounts().catch(() => {});
  } catch (_error) {
    button.disabled = false;
    button.textContent = "重试标记已读";
    button.title = "标记失败，点击重试";
    button.classList.add("is-error");
  }
}

function getNotificationMarkAllUrl(key) {
  const paths = {
    at: "/api/notification/at-me/markViewed?all=true",
    reply: "/api/notification/reply-to-me/markViewed?all=true",
    message: "/api/notification/message/markViewed?all=true"
  };
  return paths[key] || "";
}

function createNotificationPreviewMessage(text) {
  const message = document.createElement("div");
  message.className = "nsh-notification-preview-message";
  message.textContent = text;
  return message;
}

async function loadNotificationPreviewEntries(key) {
  const cached = notificationPreviewCache.get(key);
  if (cached && Date.now() - cached.loadedAt < NOTIFICATION_PREVIEW_TTL_MS) return cached.entries;
  const paths = {
    at: "/api/notification/at-me/list?page=1",
    reply: "/api/notification/reply-to-me/list?page=1",
    message: "/api/notification/message/list"
  };
  const response = await fetch(paths[key], {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data?.success !== true) throw new Error("通知接口返回异常");
  let entries = key === "message" ? data.msgArray : data.data;
  if (!Array.isArray(entries)) throw new Error("通知列表格式异常");
  if (key === "message") {
    const currentUserId = getNotificationPreviewCurrentUserId();
    if (!currentUserId) throw new Error("无法识别当前账号");
    entries = filterIncomingNotificationMessages(entries, currentUserId);
  }
  notificationPreviewCache.set(key, { loadedAt: Date.now(), entries });
  return entries;
}

function getNotificationPreviewCurrentUserId() {
  const profileLink = document.querySelector(
    "#nsk-right-panel-container .user-card:not(.hover-user-card) a[href^='/space/']"
  );
  return String(profileLink?.getAttribute("href") || "").match(/^\/space\/(\d+)/)?.[1] || "";
}

function filterIncomingNotificationMessages(entries, currentUserId) {
  const userId = String(currentUserId || "").trim();
  if (!userId || !Array.isArray(entries)) return [];
  return entries.filter((entry) => {
    const senderId = String(entry?.sender_id ?? "").trim();
    const receiverId = String(entry?.receiver_id ?? "").trim();
    return senderId !== "" && senderId !== userId && receiverId === userId;
  });
}

function renderNotificationPreviewEntries(popup, item, entries) {
  popup.replaceChildren(createNotificationPreviewHeading(item));
  const list = document.createElement("ul");
  list.className = "nsh-notification-preview-list";
  const visibleEntries = [...entries]
    .sort((left, right) => (Date.parse(right.created_at || "") || 0) - (Date.parse(left.created_at || "") || 0))
    .slice(0, 10);
  visibleEntries.forEach((entry) => {
    const row = document.createElement("li");
    row.className = "nsh-notification-preview-row";
    row.dataset.notificationKey = item.key;
    row.dataset.notificationId = String(entry.id ?? "");
    row.classList.toggle("is-unread", isNotificationPreviewEntryUnread(entry));
    const link = document.createElement("a");
    link.className = "nsh-notification-preview-item";
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        markNotificationPreviewEntryRead(item.key, entry).catch(() => {});
        return;
      }

      event.preventDefault();
      markNotificationPreviewEntryRead(item.key, entry)
        .catch(() => false)
        .finally(() => location.assign(link.href));
    });
    const avatar = createNotificationPreviewAvatar(
      item.key === "message" ? (entry.sender_name || entry.receiver_name) : entry.commenter_name,
      item.key === "message" ? (entry.sender_id || entry.receiver_id) : entry.commenter_id
    );
    const copy = document.createElement("span");
    copy.className = "nsh-notification-preview-copy";
    if (item.key === "message") {
      link.href = buildNotificationMessageUrl(entry);
      const sender = document.createElement("strong");
      sender.textContent = entry.sender_name || entry.receiver_name || "NodeSeek 用户";
      const body = document.createElement("span");
      body.textContent = cleanNotificationPreviewText(entry.content) || "（无文本内容）";
      const date = document.createElement("time");
      date.textContent = formatNotificationPreviewDate(entry.created_at);
      copy.append(sender, body);
      link.append(avatar, copy, date);
    } else {
      link.href = buildNotificationPostUrl(entry);
      const lead = document.createElement("strong");
      lead.textContent = `${entry.commenter_name || "NodeSeek 用户"} ${item.key === "at" ? "提及了你" : "回复了你的帖子"}`;
      const title = document.createElement("span");
      title.textContent = entry.title || "NodeSeek 帖子";
      const date = document.createElement("time");
      date.textContent = formatNotificationPreviewDate(entry.created_at);
      copy.append(lead, title);
      link.append(avatar, copy, date);
    }
    row.appendChild(link);
    list.appendChild(row);
  });
  if (visibleEntries.length === 0) {
    list.appendChild(createNotificationPreviewMessage("暂无通知"));
  }
  popup.appendChild(list);
}

function createNotificationPreviewAvatar(name, userId) {
  const avatar = document.createElement("span");
  avatar.className = "nsh-notification-preview-avatar";
  avatar.setAttribute("aria-hidden", "true");
  const initial = Array.from(String(name || "N"))[0] || "N";
  avatar.textContent = initial;
  const id = String(userId || "").replace(/\D/g, "");
  if (id) {
    const image = document.createElement("img");
    image.src = `/avatar/${id}`;
    image.alt = "";
    image.addEventListener("error", () => {
      avatar.textContent = initial;
    }, { once: true });
    avatar.replaceChildren(image);
  }
  return avatar;
}

function isNotificationPreviewEntryUnread(entry) {
  return Number(entry?.viewed) === 0;
}

function getNotificationMarkReadRequest(key, entry) {
  const id = entry?.id;
  if (id == null) return null;
  if (key === "at") {
    return { url: "/api/notification/at-me/markViewed", body: { atMe: [id] } };
  }
  if (key === "reply") {
    return { url: "/api/notification/reply-to-me/markViewed", body: { replys: [id] } };
  }
  return null;
}

async function markNotificationPreviewEntryRead(key, entry) {
  if (!isNotificationPreviewEntryUnread(entry)) return true;
  const request = getNotificationMarkReadRequest(key, entry);
  if (!request) return false;

  try {
    const response = await fetch(request.url, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request.body)
    });
    const result = await response.json();
    if (!response.ok || result?.success !== true) {
      throw new Error(result?.message || `HTTP ${response.status}`);
    }

    entry.viewed = 1;
    notificationPreview?.querySelectorAll(".nsh-notification-preview-row").forEach((row) => {
      if (row.dataset.notificationKey === key && row.dataset.notificationId === String(entry.id)) {
        row.classList.remove("is-unread");
      }
    });
    await refreshMessageEntryCounts().catch(() => {});
    return true;
  } catch (_error) {
    return false;
  }
}

function updateNotificationPreviewReadState(key) {
  notificationPreview?.querySelectorAll(".nsh-notification-preview-row").forEach((row) => {
    if (row.dataset.notificationKey === key) row.classList.remove("is-unread");
  });
}

async function refreshMessageEntryCounts() {
  messageEntryCounts = null;
  messageEntryCountsPromise = null;
  messageEntryCountsLoadedAt = 0;
  updateMessageEntryCounts(await loadMessageEntryCounts());
}

function buildNotificationPostUrl(entry) {
  const postId = String(entry?.post_id || "").replace(/\D/g, "");
  if (!postId) return "/notification#/reply";
  const floor = entry?.floor_id ?? entry?.floor_index;
  const floorNumber = Number(floor);
  const pageNumber = Number.isInteger(floorNumber) && floorNumber > 0
    ? Math.ceil(floorNumber / NOTIFICATION_COMMENT_PAGE_SIZE)
    : 1;
  const url = new URL(`/post-${postId}-${pageNumber}`, location.origin);
  if (entry.comment_id != null) url.searchParams.set("nshComment", String(entry.comment_id));
  if (floor != null) url.searchParams.set("nshFloor", String(floor));
  return url.href;
}

function buildNotificationMessageUrl(entry) {
  const userId = String(entry?.sender_id || entry?.receiver_id || "").replace(/\D/g, "");
  return userId ? `/notification#/message?mode=talk&to=${encodeURIComponent(userId)}` : "/notification#/message?mode=list";
}

function cleanNotificationPreviewText(value) {
  const parsed = new DOMParser().parseFromString(String(value || ""), "text/html");
  return (parsed.body.textContent || "").replace(/\s+/g, " ").trim().slice(0, 180);
}

function formatNotificationPreviewDate(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : "";
}

function handleNotificationJumpTarget() {
  const params = new URLSearchParams(location.search);
  const commentId = params.get("nshComment") || "";
  const floorId = params.get("nshFloor") || "";
  if (!commentId && !floorId) return;

  let attempts = 0;
  const findTarget = () => {
    const nodes = Array.from(document.querySelectorAll(".comment-container .content-item, .comment-container [id], .comment-container [data-comment-id], .comment-container [data-floor-id]"));
    const target = nodes.find((node) => {
      return (commentId && (node.id === commentId || node.dataset.commentId === commentId))
        || (floorId && (node.dataset.floorId === floorId || node.dataset.floor === floorId));
    });
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("nsh-notification-target-highlight");
      window.setTimeout(() => target.classList.remove("nsh-notification-target-highlight"), 3000);
      return true;
    }

    const floor = Number(floorId);
    const comments = Array.from(document.querySelectorAll(".comment-container li.content-item"));
    if (Number.isInteger(floor) && floor > 0 && floor <= comments.length) {
      comments[floor - 1].scrollIntoView({ behavior: "smooth", block: "center" });
      comments[floor - 1].classList.add("nsh-notification-target-highlight");
      window.setTimeout(() => comments[floor - 1].classList.remove("nsh-notification-target-highlight"), 3000);
      return true;
    }
    return false;
  };

  if (findTarget()) return;
  const observer = new MutationObserver(() => {
    attempts += 1;
    if (findTarget() || attempts >= 60) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
}

function positionNotificationPreview(popup, anchor) {
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(560, window.innerWidth - 16);
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
  const popupHeight = popup.offsetHeight || 420;
  const below = rect.bottom + 8;
  const top = below + popupHeight <= window.innerHeight - 8
    ? below
    : rect.top - popupHeight - 8 >= 8
      ? rect.top - popupHeight - 8
      : Math.max(8, window.innerHeight - popupHeight - 8);
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.width = `${width}px`;
}

function scheduleHideNotificationPreview() {
  window.clearTimeout(notificationPreviewHideTimer);
  notificationPreviewHideTimer = window.setTimeout(() => {
    notificationPreview?.classList.remove("is-open");
  }, NOTIFICATION_PREVIEW_HIDE_MS);
}

function loadMessageEntryCounts() {
  const now = Date.now();
  if (
    messageEntryCountsPromise
    && (!messageEntryCounts || now - messageEntryCountsLoadedAt < MESSAGE_ENTRY_COUNTS_TTL_MS)
  ) {
    return messageEntryCountsPromise;
  }

  messageEntryCountsPromise = fetch("/api/notification/unread-count", {
    credentials: "include",
    headers: {
      Accept: "application/json"
    }
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      messageEntryCounts = normalizeMessageEntryCounts(data?.unreadCount);
      messageEntryCountsLoadedAt = Date.now();
      return messageEntryCounts;
    })
    .catch((error) => {
      messageEntryCountsPromise = null;
      throw error;
    });

  return messageEntryCountsPromise;
}

function normalizeMessageEntryCounts(counts) {
  return Object.fromEntries(
    ALL_MESSAGE_ENTRY_LINKS.map((item) => [item.countKey, normalizeMessageEntryCount(counts?.[item.countKey])])
  );
}

function normalizeMessageEntryCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

function updateMessageEntryCounts(counts) {
  ALL_MESSAGE_ENTRY_LINKS.forEach((item) => {
    document
      .querySelectorAll(`[data-nsh-message-entry="${item.key}"]`)
      .forEach((entry) => updateMessageEntryItemCount(entry, item, counts));
  });
}

function updateMessageEntryItemCount(entry, item, counts) {
  if (item.showCount === false) return;
  const countNode = entry.querySelector(`.${MESSAGE_ENTRY_COUNT_CLASS}`);
  if (!countNode) {
    return;
  }

  const count = normalizeMessageEntryCount(counts?.[item.countKey]);
  const countText = String(count);
  if (countNode.textContent !== countText) {
    countNode.textContent = countText;
  }
  countNode.classList.toggle(MESSAGE_ENTRY_COUNT_POSITIVE_CLASS, count > 0);
}

function syncMessageEntryScopeAttributes(entry, block) {
  const scopeAttributes = getMessageEntryScopeAttributes(block);
  const scopedNodes = [entry, ...entry.querySelectorAll("*")];
  scopedNodes.forEach((node) => {
    scopeAttributes.forEach((attributeName) => {
      if (!node.hasAttribute(attributeName)) {
        node.setAttribute(attributeName, "");
      }
    });
  });
}

function getMessageEntryScopeAttributes(block) {
  const names = new Set();
  [block, block.firstElementChild, block.querySelector("a")].forEach((node) => {
    if (!node) {
      return;
    }

    Array.from(node.attributes).forEach((attribute) => {
      if (attribute.name.startsWith("data-v-")) {
        names.add(attribute.name);
      }
    });
  });
  return [...names];
}

function createMessageEntryIcon(item) {
  const icon = document.createElementNS(SVG_NAMESPACE, "svg");
  icon.classList.add("iconpark-icon", "nsh-message-entry-icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");

  if (item.icon === "reply") {
    appendSvgPath(icon, "M10 9 5 14l5 5");
    appendSvgPath(icon, "M5 14h10a4 4 0 0 0 0-8h-1");
    return icon;
  }

  if (item.icon === "message") {
    appendSvgPath(icon, "M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z");
    appendSvgPath(icon, "M8 8h8");
    appendSvgPath(icon, "M8 12h5");
    return icon;
  }

  appendSvgCircle(icon, "12", "12", "4");
  appendSvgPath(icon, "M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8");
  return icon;
}

function appendSvgPath(icon, data) {
  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("d", data);
  icon.appendChild(path);
}

function appendSvgCircle(icon, cx, cy, radius) {
  const circle = document.createElementNS(SVG_NAMESPACE, "circle");
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", radius);
  icon.appendChild(circle);
}
