const luckyEditor = createListEditor({
  listNode: luckyNotificationsNode,
  itemSelector: ".lucky-item[data-list-item-id]",
  deleteTitle: "删除抽奖通知",
  deleteItemName: "抽奖通知",
  deleteMessageType: "lucky:delete",
  deleteFailureMessage: "删除抽奖通知失败",
  getDeletePayload: (luckyUrl) => ({ luckyUrl }),
  render: renderLuckyNotifications,
  renderControls: () => renderLuckyListControls(luckyEditor.total)
});

async function renderLuckyNotifications() {
  const result = await readLuckyNotifications();
  const pageCount = Math.max(1, Math.ceil(result.total / LUCKY_PAGE_SIZE));
  if (luckyPage > pageCount - 1) {
    luckyPage = pageCount - 1;
    await renderLuckyNotifications();
    return;
  }

  const notifications = result.items;
  luckyEditor.prepareRender(result.total, notifications.map(getLuckyNotificationKey).filter(Boolean));
  luckyNotificationsNode.replaceChildren();
  renderLuckyListControls(result.total);

  if (notifications.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "暂无抽奖通知";
    luckyNotificationsNode.appendChild(empty);
    return;
  }

  notifications.forEach((notification) => {
    luckyNotificationsNode.appendChild(createLuckyItem(notification));
  });
}

async function readLuckyNotifications() {
  return sendExtensionMessage("lucky:list", {
    status: luckyStatusFilter.value,
    titleQuery: luckyTitleSearch.value,
    drawAtFrom: luckyDrawFrom.value,
    drawAtTo: luckyDrawTo.value,
    offset: luckyPage * LUCKY_PAGE_SIZE,
    limit: LUCKY_PAGE_SIZE
  });
}

function refreshLuckyNotifications() {
  renderLuckyNotifications();
}

function resetLuckyFilters() {
  luckyTitleSearch.value = "";
  luckyStatusFilter.value = "all";
  luckyDrawFrom.value = "";
  luckyDrawTo.value = "";
  luckyPage = 0;
  renderLuckyNotifications();
}

function renderLuckyListControls(total) {
  const pageCount = Math.max(1, Math.ceil(total / LUCKY_PAGE_SIZE));
  luckyPage = Math.min(luckyPage, pageCount - 1);

  renderListControls(luckyListControlNodes, {
    total,
    page: luckyPage,
    pageCount,
    ...luckyEditor.getControls(),
    onRefresh: refreshLuckyNotifications,
    onReset: resetLuckyFilters,
    onPrevious: () => {
      luckyPage = Math.max(0, luckyPage - 1);
      renderLuckyNotifications();
    },
    onNext: () => {
      luckyPage = Math.min(pageCount - 1, luckyPage + 1);
      renderLuckyNotifications();
    }
  });
}

function createLuckyItem(notification) {
  const item = document.createElement("article");
  item.className = "lucky-item";
  const itemId = getLuckyNotificationKey(notification);
  luckyEditor.decorateItem(item, itemId);

  const header = document.createElement("div");
  header.className = "lucky-header";

  const title = document.createElement("a");
  title.className = "lucky-title";
  if (notification.resultStatus === "won") {
    title.classList.add("lucky-title-won");
  }
  title.href = notification.postUrl || "#";
  title.target = "_blank";
  title.rel = "noreferrer";
  title.textContent = notification.title || "NodeSeek 帖子";
  header.appendChild(title);
  if (!luckyEditor.isEditing) {
    header.appendChild(createDeleteButton(notification));
  }
  item.appendChild(header);

  const meta = document.createElement("div");
  meta.className = "lucky-meta";
  const drawInfo = document.createElement("div");
  drawInfo.className = "draw-info";
  const status = createLuckyStatus(notification);
  if (status) {
    drawInfo.appendChild(status);
  }
  drawInfo.appendChild(createMetaItem("开奖时间", notification.drawAt));
  meta.appendChild(drawInfo);
  const author = createLuckyAuthorItem(notification);
  if (author) {
    meta.appendChild(author);
  }
  meta.appendChild(createMetaItem("添加于", notification.addedAt));
  item.appendChild(meta);

  return item;
}

function getLuckyNotificationKey(notification) {
  return normalizeListItemKey(notification?.luckyUrl || notification?.id);
}

function createDeleteButton(notification) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "delete-lucky";
  button.title = "删除抽奖通知";
  button.setAttribute("aria-label", "删除抽奖通知");
  button.appendChild(createDeleteIcon());
  button.addEventListener("click", () => openDeleteDialog(notification));
  return button;
}

function createDeleteIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1024 1024");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M799.2 874.4c0 34.4-28.001 62.4-62.4 62.4H287.2c-34.4 0-62.4-28-62.4-62.4V212h574.4v662.4zM349.6 100c0-7.2 5.6-12.8 12.8-12.8h300c7.2 0 12.8 5.6 12.8 12.8v37.6H349.6V100z m636.8 37.6H749.6V100c0-48.001-39.2-87.2-87.2-87.2h-300c-48 0-87.2 39.199-87.2 87.2v37.6H37.6C16.8 137.6 0 154.4 0 175.2s16.8 37.6 37.6 37.6h112v661.6c0 76 61.6 137.6 137.6 137.6h449.6c76 0 137.6-61.6 137.6-137.6V212h112c20.8 0 37.6-16.8 37.6-37.6s-16.8-36.8-37.6-36.8zM512 824c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6m-175.2 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0.8 20.8 17.6 37.6 37.6 37.6m350.4 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6");
  svg.appendChild(path);

  return svg;
}

function openDeleteDialog(notification) {
  pendingDeleteNotification = notification;
  deleteDialogMessage.textContent = `确定永久删除「${notification.title || "这条抽奖通知"}」吗？`;
  deleteDialog.hidden = false;
  cancelDeleteButton.focus();
}

function closeDeleteDialog() {
  pendingDeleteNotification = null;
  deleteDialog.hidden = true;
}

async function confirmPendingDelete() {
  if (!pendingDeleteNotification) {
    return;
  }

  const luckyUrl = pendingDeleteNotification.luckyUrl;
  closeDeleteDialog();
  try {
    await deleteLuckyNotification(luckyUrl);
  } catch (error) {
    showToast(formatToastError(error, "删除抽奖通知失败"), "error");
  }
}

async function deleteLuckyNotification(luckyUrl) {
  await sendExtensionMessage("lucky:delete", { luckyUrl });
  await renderLuckyNotifications();
}

function createMetaItem(label, timestamp) {
  const item = document.createElement("span");
  item.textContent = `${label} ${timestamp ? formatDate(timestamp) : "-"}`;
  return item;
}

function createLuckyAuthorItem(notification) {
  const authorName = String(notification?.authorName || "").trim();
  if (!authorName) {
    return null;
  }

  const item = document.createElement("span");
  item.textContent = "发起人 ";
  if (!notification.authorUrl) {
    item.append(authorName);
    return item;
  }

  const link = document.createElement("a");
  link.className = "lucky-author-link";
  link.href = notification.authorUrl;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = authorName;
  item.appendChild(link);
  return item;
}

function createDrawStatus(notification, drawn = false) {
  const item = document.createElement("a");
  const drawAt = notification.drawAt;
  item.className = drawn ? "draw-status draw-status-done" : "draw-status draw-status-pending";
  item.href = notification.luckyUrl || "#";
  item.target = "_blank";
  item.rel = "noreferrer";
  item.textContent = drawn ? "已开奖" : "未开奖";

  if (drawAt) {
    item.title = `开奖时间 ${formatDate(drawAt)}`;
  }

  return item;
}

function createLuckyStatus(notification) {
  const resultStatus = createLuckyResultStatus(notification);
  if (resultStatus) {
    return resultStatus;
  }

  return notification.status === "pending"
    ? createDrawStatus(notification)
    : createDrawStatus(notification, true);
}

function createLuckyResultStatus(notification) {
  if (notification.resultStatus !== "won" && notification.resultStatus !== "lost") {
    return null;
  }

  const item = document.createElement("a");
  item.className = `lucky-result lucky-result-${notification.resultStatus}`;
  item.href = notification.luckyUrl || "#";
  item.target = "_blank";
  item.rel = "noreferrer";
  item.textContent = getLuckyResultLabel(notification);

  const details = [];
  if (notification.resultRank) {
    details.push(`中奖序号 ${notification.resultRank}`);
  }
  if (notification.resultFloorId) {
    details.push(`楼层 ${notification.resultFloorId}`);
  }
  if (notification.resultCheckedAt) {
    details.push(`查询时间 ${formatDate(notification.resultCheckedAt)}`);
  }
  if (details.length) {
    item.title = details.join("；");
  }

  return item;
}

function getLuckyResultLabel(notification) {
  if (notification.resultStatus === "won") {
    return "已中奖";
  }

  if (notification.resultStatus === "lost") {
    return "未中奖";
  }
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString("zh-CN", {
    hour12: false
  });
}
