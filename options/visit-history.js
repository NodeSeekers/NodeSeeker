const visitHistoryEditor = createListEditor({
  listNode: visitHistoryNode,
  itemSelector: ".visit-history-item[data-list-item-id]",
  deleteTitle: "删除访问足迹",
  deleteItemName: "访问足迹",
  deleteMessageType: "visitHistory:delete",
  deleteFailureMessage: "删除访问足迹失败",
  getDeletePayload: (postId) => ({ postId }),
  render: renderVisitHistory,
  renderControls: () => renderVisitHistoryListControls(visitHistoryEditor.total)
});

async function renderVisitHistory() {
  const result = await readVisitHistory();
  const pageCount = Math.max(1, Math.ceil(result.total / VISIT_HISTORY_PAGE_SIZE));
  if (visitHistoryPage > pageCount - 1) {
    visitHistoryPage = pageCount - 1;
    await renderVisitHistory();
    return;
  }

  const items = result.items;
  visitHistoryEditor.prepareRender(result.total, items.map(getVisitHistoryItemKey).filter(Boolean));
  visitHistoryNode.replaceChildren();
  renderVisitHistoryListControls(result.total);

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "暂无访问足迹";
    visitHistoryNode.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    visitHistoryNode.appendChild(createVisitHistoryItem(item));
  });
}

async function readVisitHistory() {
  return sendExtensionMessage("visitHistory:list", {
    titleQuery: visitHistoryTitleSearch.value,
    authorQuery: visitHistoryAuthorSearch.value,
    postedAtFrom: visitHistoryPostedFrom.value,
    postedAtTo: visitHistoryPostedTo.value,
    offset: visitHistoryPage * VISIT_HISTORY_PAGE_SIZE,
    limit: VISIT_HISTORY_PAGE_SIZE
  });
}

function refreshVisitHistory() {
  renderVisitHistory();
}

function resetVisitHistoryFilters() {
  visitHistoryTitleSearch.value = "";
  visitHistoryAuthorSearch.value = "";
  visitHistoryPostedFrom.value = "";
  visitHistoryPostedTo.value = "";
  visitHistoryPage = 0;
  renderVisitHistory();
}

function renderVisitHistoryListControls(total) {
  const pageCount = Math.max(1, Math.ceil(total / VISIT_HISTORY_PAGE_SIZE));
  visitHistoryPage = Math.min(visitHistoryPage, pageCount - 1);

  renderListControls(visitHistoryListControlNodes, {
    total,
    page: visitHistoryPage,
    pageCount,
    ...visitHistoryEditor.getControls(),
    onRefresh: refreshVisitHistory,
    onReset: resetVisitHistoryFilters,
    onPrevious: () => {
      visitHistoryPage = Math.max(0, visitHistoryPage - 1);
      renderVisitHistory();
    },
    onNext: () => {
      visitHistoryPage = Math.min(pageCount - 1, visitHistoryPage + 1);
      renderVisitHistory();
    }
  });
}

function createVisitHistoryItem(historyItem) {
  const item = document.createElement("article");
  item.className = "visit-history-item";
  const itemId = getVisitHistoryItemKey(historyItem);
  visitHistoryEditor.decorateItem(item, itemId);

  const header = document.createElement("div");
  header.className = "visit-history-header";

  const title = document.createElement("a");
  title.className = "visit-history-title";
  title.href = historyItem.postUrl || "#";
  title.target = "_blank";
  title.rel = "noreferrer";
  title.textContent = historyItem.title || "NodeSeek 帖子";
  header.appendChild(title);
  if (!visitHistoryEditor.isEditing) {
    header.appendChild(createVisitHistoryDeleteButton(historyItem));
  }
  item.appendChild(header);

  const meta = document.createElement("div");
  meta.className = "visit-history-meta";
  meta.appendChild(createVisitHistoryAuthorItem(historyItem));
  meta.appendChild(createVisitHistoryPostTimeItem(historyItem));
  meta.appendChild(createVisitHistoryMetaItem("最近访问", historyItem.visitedAt));
  if (Number(historyItem.visitCount) > 1) {
    const count = document.createElement("span");
    count.textContent = `访问 ${historyItem.visitCount} 次`;
    meta.appendChild(count);
  }
  item.appendChild(meta);

  return item;
}

function getVisitHistoryItemKey(historyItem) {
  return normalizeListItemKey(historyItem?.postId || historyItem?.id);
}

function createVisitHistoryAuthorItem(historyItem) {
  const item = document.createElement("span");
  item.textContent = "发帖人 ";

  if (!historyItem.authorName) {
    item.append("-");
    return item;
  }

  if (historyItem.authorUrl) {
    const link = document.createElement("a");
    link.href = historyItem.authorUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = historyItem.authorName;
    item.appendChild(link);
    return item;
  }

  item.append(historyItem.authorName);
  return item;
}

function createVisitHistoryPostTimeItem(historyItem) {
  const item = document.createElement("span");
  const timestamp = Number(historyItem.postedAt) || 0;
  const text = timestamp
    ? formatVisitHistoryDate(timestamp)
    : historyItem.postedAtText || "-";
  item.textContent = `发帖时间 ${text}`;
  return item;
}

function createVisitHistoryDeleteButton(historyItem) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "delete-visit-history";
  button.title = "删除访问足迹";
  button.setAttribute("aria-label", "删除访问足迹");
  button.appendChild(createDeleteIcon());
  button.addEventListener("click", () => openVisitHistoryDeleteDialog(historyItem));
  return button;
}

function openVisitHistoryDeleteDialog(historyItem) {
  pendingDeleteVisitHistory = historyItem;
  deleteVisitHistoryDialogMessage.textContent = `确定永久删除「${historyItem.title || "这条访问足迹"}」吗？`;
  deleteVisitHistoryDialog.hidden = false;
  cancelDeleteVisitHistoryButton.focus();
}

function closeVisitHistoryDeleteDialog() {
  pendingDeleteVisitHistory = null;
  deleteVisitHistoryDialog.hidden = true;
}

async function confirmPendingVisitHistoryDelete() {
  if (!pendingDeleteVisitHistory) {
    return;
  }

  const postId = pendingDeleteVisitHistory.postId;
  closeVisitHistoryDeleteDialog();
  try {
    await deleteVisitHistory(postId);
  } catch (error) {
    showToast(formatToastError(error, "删除访问足迹失败"), "error");
  }
}

async function deleteVisitHistory(postId) {
  await sendExtensionMessage("visitHistory:delete", { postId });
  await renderVisitHistory();
}

function createVisitHistoryMetaItem(label, timestamp) {
  const item = document.createElement("span");
  item.textContent = `${label} ${timestamp ? formatVisitHistoryDate(timestamp) : "-"}`;
  return item;
}

function formatVisitHistoryDate(timestamp) {
  return new Date(timestamp).toLocaleString("zh-CN", {
    hour12: false
  });
}
