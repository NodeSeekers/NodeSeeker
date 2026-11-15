const DEFAULT_LEVEL_COLORS = {
  1: "#ffffff",
  2: "#2ea043",
  3: "#0969da",
  4: "#8250df",
  5: "#ff61c0",
  6: "#fb8500"
};

const PROFILE_FIELD_DEFINITIONS = [
  { key: "member_id", label: "ID" },
  { key: "member_name", label: "用户" },
  { key: "isAdmin", label: "管理" },
  { key: "rank", label: "Lv", enabledByDefault: true },
  { key: "coin", label: "鸡腿", enabledByDefault: true },
  { key: "stardust", label: "星辰" },
  { key: "created_at", label: "注册" },
  { key: "nPost", label: "主题", enabledByDefault: true },
  { key: "nComment", label: "评论", enabledByDefault: true },
  { key: "follows", label: "关注" },
  { key: "fans", label: "粉丝" },
  { key: "collectionCount", label: "收藏" },
  { key: "created_at_str", label: "加入", enabledByDefault: true },
  { key: "roles", label: "角色" },
  { key: "followed", label: "已关注" }
];
const DEFAULT_PROFILE_LABEL_KEYS = PROFILE_FIELD_DEFINITIONS
  .filter((field) => field.enabledByDefault)
  .map((field) => field.key);
const PROFILE_LABEL_SIZE_OPTIONS = ["large", "standard", "small"];
const DEFAULT_PROFILE_LABEL_SIZE = "standard";
const DEFAULT_FOLLOW_RULES = {
  keywordGroups: [],
  userGroups: []
};

const DEFAULT_OPTIONS = {
  imageUploadEnabled: true,
  apiKey: "",
  userStatsEnabled: true,
  profileTrend7DaysEnabled: true,
  profileTrend30DaysEnabled: true,
  profileHoverSignatureEnabled: true,
  profileHoverTrendEnabled: false,
  userCacheHours: 24,
  profileRetentionDays: 0,
  blockFilterEnabled: true,
  blockFilterQuickKeywordEnabled: true,
  blockFilterQuickUserEnabled: true,
  blockedKeywords: [],
  blockedUsers: [],
  followRules: DEFAULT_FOLLOW_RULES,
  readingNavigationEnabled: true,
  attendanceReminderEnabled: true,
  autoAttendanceEnabled: false,
  autoAttendanceMode: "random",
  quickJumpEnabled: true,
  imagePreviewEnabled: true,
  messageEntryEnabled: true,
  editorToolsEnabled: true,
  postSwitcherEnabled: true,
  autoPageEnabled: true,
  autoPageAppendEnabled: true,
  autoPageDelayMs: 100,
  ...DEFAULT_READING_SHORTCUTS,
  quickPhrasesEnabled: true,
  quickPhrases: [],
  luckyNotificationsEnabled: true,
  luckyAutoAddEnabled: true,
  profileLabelKeys: DEFAULT_PROFILE_LABEL_KEYS,
  profileLabelSize: DEFAULT_PROFILE_LABEL_SIZE,
  levelColors: DEFAULT_LEVEL_COLORS
};
const TELEGRAM_SYNC_CONFIG_DEFAULTS = {
  telegramMessageNotificationsEnabled: true,
  telegramPostNotificationsEnabled: true,
  telegramMentionNotificationsEnabled: false,
  telegramReplyNotificationsEnabled: false,
  telegramMonitorIntervalSeconds: 30,
  telegramRssMonitorIntervalSeconds: 60,
  telegramMonitorPaused: false,
  telegramBotToken: "",
  telegramTargets: [],
  telegramKeywordRules: [],
  telegramBlockedKeywords: [],
  telegramBoardSlugs: []
};
const SYNC_CONFIG_DEFAULTS = {
  ...DEFAULT_OPTIONS,
  ...TELEGRAM_SYNC_CONFIG_DEFAULTS,
  uploadFieldName: "image",
  markdownAltText: "image"
};
const SYNC_CONFIG_KEYS = Object.keys(SYNC_CONFIG_DEFAULTS);
const MIN_USER_CACHE_HOURS = 12;
const MIN_AUTO_PAGE_DELAY_MS = 0;
const LUCKY_PAGE_SIZE = 50;
const VISIT_HISTORY_PAGE_SIZE = 50;

const form = document.querySelector("#options-form");
const actionsNode = document.querySelector(".actions");
const toastRoot = document.querySelector("#toastRoot");
const resetButton = document.querySelector("#reset");
const clearProfileCacheButton = document.querySelector("#clearProfileCache");
const apiKeyInput = document.querySelector("#apiKey");
const toggleApiKeyButton = document.querySelector("#toggleApiKey");
const eyeIcon = toggleApiKeyButton.querySelector(".eye-icon");
const eyeOffIcon = toggleApiKeyButton.querySelector(".eye-off-icon");
const luckyNotificationsNode = document.querySelector("#luckyNotifications");
const luckyStatusFilter = document.querySelector("#luckyStatusFilter");
const luckyTitleSearch = document.querySelector("#luckyTitleSearch");
const luckyDrawFrom = document.querySelector("#luckyDrawFrom");
const luckyDrawTo = document.querySelector("#luckyDrawTo");
const luckyListControlNodes = Array.from(document.querySelectorAll("[data-list-controls='lucky']"));
const visitHistoryNode = document.querySelector("#visitHistory");
const visitHistoryTitleSearch = document.querySelector("#visitHistoryTitleSearch");
const visitHistoryAuthorSearch = document.querySelector("#visitHistoryAuthorSearch");
const visitHistoryPostedFrom = document.querySelector("#visitHistoryPostedFrom");
const visitHistoryPostedTo = document.querySelector("#visitHistoryPostedTo");
const visitHistoryListControlNodes = Array.from(document.querySelectorAll("[data-list-controls='visitHistory']"));
const quickPhraseListNode = document.querySelector("#quickPhraseList");
const quickPhraseEditorNode = document.querySelector("#quickPhraseEditor");
const quickPhraseInput = document.querySelector("#quickPhraseInput");
const addQuickPhraseButton = document.querySelector("#addQuickPhrase");
const cancelQuickPhraseButton = document.querySelector("#cancelQuickPhrase");
const confirmQuickPhraseButton = document.querySelector("#confirmQuickPhrase");
const importConfigButton = document.querySelector("#importConfig");
const exportConfigButton = document.querySelector("#exportConfig");
const importDataButton = document.querySelector("#importData");
const exportDataButton = document.querySelector("#exportData");
const importConfigFileInput = document.querySelector("#importConfigFile");
const importDataFileInput = document.querySelector("#importDataFile");
const extensionVersionNode = document.querySelector("#extensionVersion");
const profileLabelFieldsNode = document.querySelector("#profileLabelFields");
const autoPageDelayOption = document.querySelector("#autoPageDelayOption");
const menuButtons = Array.from(document.querySelectorAll(".menu-button"));
const panels = Array.from(document.querySelectorAll(".options-panel"));
const colorInputs = Array.from(document.querySelectorAll("[data-level-color]"));
const colorAlphaInputs = Array.from(document.querySelectorAll("[data-level-alpha]"));
const readingShortcutInputs = Array.from(document.querySelectorAll("[data-shortcut-input]"));
const deleteDialog = document.querySelector("#deleteDialog");
const deleteDialogMessage = document.querySelector("#deleteDialogMessage");
const cancelDeleteButton = document.querySelector("#cancelDelete");
const confirmDeleteButton = document.querySelector("#confirmDelete");
const deleteVisitHistoryDialog = document.querySelector("#deleteVisitHistoryDialog");
const deleteVisitHistoryDialogMessage = document.querySelector("#deleteVisitHistoryDialogMessage");
const cancelDeleteVisitHistoryButton = document.querySelector("#cancelDeleteVisitHistory");
const confirmDeleteVisitHistoryButton = document.querySelector("#confirmDeleteVisitHistory");
const clearProfileDialog = document.querySelector("#clearProfileDialog");
const cancelClearProfileButton = document.querySelector("#cancelClearProfile");
const confirmClearProfileButton = document.querySelector("#confirmClearProfile");
const confirmDialog = document.querySelector("#confirmDialog");
const confirmDialogTitle = document.querySelector("#confirmDialogTitle");
const confirmDialogMessage = document.querySelector("#confirmDialogMessage");
const cancelConfirmDialogButton = document.querySelector("#cancelConfirmDialog");
const confirmDialogActionButton = document.querySelector("#confirmDialogAction");
let pendingDeleteNotification = null;
let pendingDeleteVisitHistory = null;
let pendingConfirmDialogAction = null;
let draggedProfileLabelOption = null;
let quickPhrases = [];
let editingQuickPhraseIndex = -1;
let luckyPage = 0;
let visitHistoryPage = 0;
let toastTimer = 0;

function renderListControls(nodes, options) {
  nodes.forEach((node) => {
    node.replaceChildren();
    if (node.dataset.listControlsPlacement === "bottom") {
      renderListPaginationControls(node, options);
      return;
    }

    renderListActionControls(node, options);
  });
}

function renderListActionControls(node, options) {
  const actions = document.createElement("div");
  actions.className = "list-control-actions";

  const refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.textContent = "刷新";
  refreshButton.addEventListener("click", options.onRefresh);

  const resetButtonNode = document.createElement("button");
  resetButtonNode.type = "button";
  resetButtonNode.textContent = "重置";
  resetButtonNode.addEventListener("click", options.onReset);

  actions.append(refreshButton, resetButtonNode);

  const editActions = document.createElement("div");
  editActions.className = "list-control-edit-actions";

  if (options.isEditing) {
    const selectAllButton = document.createElement("button");
    selectAllButton.type = "button";
    selectAllButton.textContent = "全选";
    selectAllButton.disabled = options.total <= 0;
    selectAllButton.addEventListener("click", options.onSelectAll);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger-button";
    deleteButton.textContent = "删除";
    deleteButton.disabled = options.selectedCount <= 0;
    deleteButton.addEventListener("click", options.onDeleteSelected);

    const doneButton = document.createElement("button");
    doneButton.type = "button";
    doneButton.textContent = "完成";
    doneButton.addEventListener("click", options.onDone);

    editActions.append(selectAllButton, deleteButton, doneButton);
  } else {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "编辑";
    editButton.disabled = options.total <= 0;
    editButton.addEventListener("click", options.onEdit);
    editActions.appendChild(editButton);
  }

  node.append(actions, editActions);
}

function renderListPaginationControls(node, options) {
  const pagination = document.createElement("div");
  pagination.className = "list-control-pagination";

  const summary = document.createElement("span");
  summary.className = "list-control-summary";
  summary.textContent = `共 ${options.total} 条`;

  const previousButton = document.createElement("button");
  previousButton.type = "button";
  previousButton.textContent = "上一页";
  previousButton.disabled = options.page <= 0;
  previousButton.addEventListener("click", options.onPrevious);

  const page = document.createElement("span");
  page.className = "list-control-page";
  page.textContent = `${options.page + 1}/${options.pageCount}`;

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.textContent = "下一页";
  nextButton.disabled = options.page >= options.pageCount - 1;
  nextButton.addEventListener("click", options.onNext);

  pagination.append(summary, previousButton, page, nextButton);
  node.appendChild(pagination);
}

function createListEditor(options) {
  const state = {
    isEditing: false,
    total: 0,
    visibleIds: [],
    selectedIds: new Set()
  };

  function prepareRender(total, visibleIds) {
    state.total = total;
    state.visibleIds = visibleIds;
    syncSelectionWithVisibleItems();
    options.listNode.classList.toggle("list-editing", state.isEditing);
  }

  function getControls() {
    return {
      isEditing: state.isEditing,
      selectedCount: state.selectedIds.size,
      onEdit: enterEditMode,
      onSelectAll: selectAllVisibleItems,
      onDeleteSelected: confirmDeleteSelectedItems,
      onDone: leaveEditMode
    };
  }

  function decorateItem(item, itemId) {
    if (!itemId) {
      return;
    }

    item.dataset.listItemId = itemId;
    if (!state.isEditing) {
      return;
    }

    const selected = state.selectedIds.has(itemId);
    item.classList.add("list-selectable");
    item.classList.toggle("selected", selected);
    item.tabIndex = 0;
    item.setAttribute("role", "checkbox");
    item.setAttribute("aria-checked", selected ? "true" : "false");
    item.addEventListener("click", (event) => toggleSelection(event, itemId));
    item.addEventListener("keydown", (event) => handleItemKeyDown(event, itemId));
  }

  function syncSelectionWithVisibleItems() {
    if (!state.isEditing || state.total <= 0) {
      state.isEditing = false;
      state.selectedIds.clear();
      return;
    }

    const visibleIds = new Set(state.visibleIds);
    Array.from(state.selectedIds).forEach((itemId) => {
      if (!visibleIds.has(itemId)) {
        state.selectedIds.delete(itemId);
      }
    });
  }

  function enterEditMode() {
    state.isEditing = true;
    state.selectedIds.clear();
    options.render();
  }

  function leaveEditMode() {
    state.isEditing = false;
    state.selectedIds.clear();
    options.render();
  }

  function selectAllVisibleItems() {
    if (!state.isEditing) {
      return;
    }

    state.visibleIds.forEach((itemId) => {
      state.selectedIds.add(itemId);
    });
    updateSelectionState();
    options.renderControls();
  }

  function toggleSelection(event, itemId) {
    if (!state.isEditing) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleSelectionById(itemId);
  }

  function handleItemKeyDown(event, itemId) {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    toggleSelectionById(itemId);
  }

  function toggleSelectionById(itemId) {
    if (!itemId) {
      return;
    }

    if (state.selectedIds.has(itemId)) {
      state.selectedIds.delete(itemId);
    } else {
      state.selectedIds.add(itemId);
    }
    updateSelectionState();
    options.renderControls();
  }

  function updateSelectionState() {
    options.listNode.querySelectorAll(options.itemSelector).forEach((item) => {
      const selected = state.selectedIds.has(item.dataset.listItemId);
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-checked", selected ? "true" : "false");
    });
  }

  function confirmDeleteSelectedItems() {
    const selectedCount = state.selectedIds.size;
    if (selectedCount <= 0) {
      return;
    }

    openConfirmDialog({
      title: options.deleteTitle,
      message: `确定永久删除选中的 ${selectedCount} 条${options.deleteItemName}吗？`,
      confirmText: "删除",
      danger: true
    }, deleteSelectedItems);
  }

  async function deleteSelectedItems() {
    const itemIds = Array.from(state.selectedIds);
    if (itemIds.length === 0) {
      return;
    }

    try {
      await Promise.all(itemIds.map((itemId) => {
        return sendExtensionMessage(options.deleteMessageType, options.getDeletePayload(itemId));
      }));
      state.selectedIds.clear();
      state.isEditing = false;
      await options.render();
      showToast(`已删除 ${itemIds.length} 条${options.deleteItemName}`);
    } catch (error) {
      showToast(formatToastError(error, options.deleteFailureMessage), "error");
      await options.render();
    }
  }

  return {
    get isEditing() {
      return state.isEditing;
    },
    get total() {
      return state.total;
    },
    prepareRender,
    getControls,
    decorateItem
  };
}

function normalizeListItemKey(value) {
  return String(value || "");
}
