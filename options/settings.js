async function sendExtensionMessage(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, payload });
  if (!response?.ok) {
    throw new Error(response?.error || "扩展后台响应异常");
  }

  return response.result;
}

const OPTIONS_PENDING_SAVE_IGNORED_FIELDS = new Set([
  "quickPhraseInput",
  "luckyNotificationsEnabled",
  "luckyAutoAddEnabled",
  "luckyTitleSearch",
  "luckyStatusFilter",
  "luckyDrawFrom",
  "luckyDrawTo",
  "visitHistoryTitleSearch",
  "visitHistoryAuthorSearch",
  "visitHistoryPostedFrom",
  "visitHistoryPostedTo"
]);
const OPTIONS_STORAGE_KEYS = new Set(Object.keys(DEFAULT_OPTIONS));
const OPTIONS_SYNC_DELAY_MS = 60;
const OPTIONS_AUTOSAVE_DELAY_MS = 450;
let draggedProfileLabelKeys = "";
let optionsDirty = false;
let optionsSyncTimer = 0;
let optionsAutoSaveTimer = 0;
let optionsSyncInProgress = false;
let optionsSyncPending = false;
let lastStoredOptionsSignature = "";
let ignoredExternalOptionsSignature = "";
let optionsDialogObserver = null;

function showPanel(panelId) {
  const activePanel = panels.find((panel) => panel.id === panelId);
  const showActions = !["lucky-panel", "visit-history-panel", "sync-panel", "telegram-panel", "about-panel"].includes(panelId);

  panels.forEach((panel) => {
    panel.hidden = panel.id !== panelId;
  });

  actionsNode.hidden = !showActions;
  if (showActions && activePanel && actionsNode.parentElement !== activePanel) {
    activePanel.appendChild(actionsNode);
  }

  menuButtons.forEach((button) => {
    const active = button.dataset.panelTarget === panelId;
    button.classList.toggle("active", active);
    button.toggleAttribute("aria-current", active);
  });
}

function initializeOptionsSync() {
  chrome.storage.onChanged.addListener(handleOptionsStorageChanged);
  window.addEventListener("focus", scheduleOptionsSync);
  document.addEventListener("visibilitychange", handleOptionsVisibilityChanged);

  optionsDialogObserver = new MutationObserver(() => {
    if (optionsSyncPending && !hasOpenOptionsDialog()) {
      optionsSyncPending = false;
      scheduleOptionsSync();
    }
  });
  document.querySelectorAll(".dialog-backdrop").forEach((dialog) => {
    optionsDialogObserver.observe(dialog, {
      attributes: true,
      attributeFilter: ["hidden"]
    });
  });
}

function handleOptionsStorageChanged(changes, areaName) {
  if (
    areaName !== "local"
    || !Object.keys(changes).some((key) => OPTIONS_STORAGE_KEYS.has(key))
  ) {
    return;
  }

  scheduleOptionsSync();
}

function handleOptionsVisibilityChanged() {
  if (!document.hidden) {
    scheduleOptionsSync();
  }
}

function scheduleOptionsSync() {
  window.clearTimeout(optionsSyncTimer);
  optionsSyncTimer = window.setTimeout(() => {
    optionsSyncTimer = 0;
    syncOptionsFromStorage();
  }, OPTIONS_SYNC_DELAY_MS);
}

async function syncOptionsFromStorage() {
  if (optionsSyncInProgress) {
    optionsSyncPending = true;
    return;
  }

  optionsSyncInProgress = true;
  try {
    const options = await readStoredOptions();
    const signature = getOptionsSignature(options);
    if (!lastStoredOptionsSignature) {
      applyOptionsSnapshot(options);
      return;
    }
    if (signature === lastStoredOptionsSignature || signature === ignoredExternalOptionsSignature) {
      return;
    }
    if (hasOpenOptionsDialog()) {
      optionsSyncPending = true;
      return;
    }
    if (optionsDirty) {
      ignoredExternalOptionsSignature = signature;
      openConfirmDialog({
        title: "设置已在其他页面更新",
        message: "检测到论坛页面或其他扩展页面修改了设置。重新加载将放弃当前页面尚未保存的修改。",
        confirmText: "重新加载",
        cancelText: "保留当前编辑"
      }, () => {
        applyOptionsSnapshot(options);
        showToast("已加载其他页面的最新设置");
      });
      return;
    }

    applyOptionsSnapshot(options);
    showToast("已同步其他页面的最新设置");
  } catch (error) {
    showToast(formatToastError(error, "同步设置失败"), "error");
  } finally {
    optionsSyncInProgress = false;
    if (optionsSyncPending && !hasOpenOptionsDialog()) {
      optionsSyncPending = false;
      scheduleOptionsSync();
    }
  }
}

function hasOpenOptionsDialog() {
  return Boolean(document.querySelector(".dialog-backdrop:not([hidden])"));
}

async function readStoredOptions() {
  const options = await chrome.storage.local.get(DEFAULT_OPTIONS);
  return normalizeStoredOptions(options);
}

function getOptionsSignature(options) {
  return JSON.stringify(options);
}

function rememberOptionsSnapshot(options) {
  lastStoredOptionsSignature = getOptionsSignature(options);
  ignoredExternalOptionsSignature = "";
}

function applyOptionsSnapshot(options) {
  rememberOptionsSnapshot(options);
  setFormValues(options);
  optionsDirty = false;
}

async function restoreOptions() {
  try {
    applyOptionsSnapshot(await readStoredOptions());
  } catch (error) {
    showToast(formatToastError(error, "加载设置失败"), "error");
  }
}

async function saveOptions(event) {
  event?.preventDefault();
  window.clearTimeout(optionsAutoSaveTimer);
  optionsAutoSaveTimer = 0;

  try {
    const options = {
      imageUploadEnabled: form.imageUploadEnabled.checked,
      apiKey: form.apiKey.value.trim(),
      userStatsEnabled: form.userStatsEnabled.checked,
      profileHoverSignatureEnabled: form.profileHoverSignatureEnabled.checked,
      profileHoverTrendEnabled: form.profileHoverTrendEnabled.checked,
      userCacheHours: normalizeUserCacheHours(form.userCacheHours.value),
      profileRetentionDays: normalizeProfileRetentionDays(form.profileRetentionDays.value),
      blockFilterEnabled: form.blockFilterEnabled.checked,
      blockFilterQuickKeywordEnabled: form.blockFilterQuickKeywordEnabled.checked,
      blockFilterQuickUserEnabled: form.blockFilterQuickUserEnabled.checked,
      blockedKeywords: normalizeBlockFilterList(form.blockedKeywords.value),
      blockedUsers: normalizeBlockFilterList(form.blockedUsers.value),
      followRules: readFollowRulesFromForm(),
      readingNavigationEnabled: form.readingNavigationEnabled.checked,
      attendanceReminderEnabled: form.attendanceReminderEnabled.checked,
      autoAttendanceEnabled: form.autoAttendanceEnabled.checked,
      autoAttendanceMode: form.autoAttendanceMode.value === "fixed" ? "fixed" : "random",
      quickJumpEnabled: form.quickJumpEnabled.checked,
      imagePreviewEnabled: form.imagePreviewEnabled.checked,
      messageEntryEnabled: form.messageEntryEnabled.checked,
      editorToolsEnabled: form.editorToolsEnabled.checked,
      postSwitcherEnabled: form.postSwitcherEnabled.checked,
      autoPageEnabled: form.autoPageEnabled.checked,
      autoPageAppendEnabled: form.autoPageAppendEnabled.checked,
      autoPageDelayMs: normalizeAutoPageDelayMs(form.autoPageDelayMs.value),
      postPagePreviousShortcut: normalizeShortcut(form.postPagePreviousShortcut.value),
      postPageNextShortcut: normalizeShortcut(form.postPageNextShortcut.value),
      postSwitcherPreviousShortcut: normalizeShortcut(form.postSwitcherPreviousShortcut.value),
      postSwitcherNextShortcut: normalizeShortcut(form.postSwitcherNextShortcut.value),
      quickReplyShortcut: normalizeShortcut(form.quickReplyShortcut.value),
      replySubmitShortcut: normalizeShortcut(form.replySubmitShortcut.value),
      quickPhrasesEnabled: form.quickPhrasesEnabled.checked,
      quickPhraseShortcut: normalizeShortcut(form.quickPhraseShortcut.value),
      quickPhrases: normalizeQuickPhrases(quickPhrases),
      luckyNotificationsEnabled: form.luckyNotificationsEnabled.checked,
      luckyAutoAddEnabled: form.luckyAutoAddEnabled.checked,
      profileLabelKeys: readProfileLabelKeysFromForm(),
      profileLabelSize: normalizeProfileLabelSize(form.profileLabelSize.value),
      levelColors: readLevelColorsFromForm()
    };

    await chrome.storage.local.set(options);
    rememberOptionsSnapshot(await readStoredOptions());
    optionsDirty = false;
    showToast("保存成功");
  } catch (error) {
    showToast(formatToastError(error, "保存失败"), "error");
  }
}

async function resetOptions() {
  try {
    await chrome.storage.local.remove([
      "telegramMessageNotificationsEnabled",
      "telegramPostNotificationsEnabled",
      "telegramMentionNotificationsEnabled",
      "telegramReplyNotificationsEnabled",
      "telegramSystemFollowNotificationsEnabled",
      "telegramSystemFeedNotificationsEnabled",
      "telegramSystemLikeNotificationsEnabled",
      "telegramMentionReplyNotificationsEnabled",
      "telegramMonitorIntervalSeconds",
      "telegramOfflineMessageSyncEnabled",
      "telegramSilentPushEnabled",
      "telegramRssMonitorIntervalSeconds",
      "telegramBotToken",
      "telegramTargets",
      "telegramKeywordRules",
      "telegramBlockedKeywords",
      "telegramBoardSlugs",
      "telegramMessageCursors",
      "telegramMentionReplyCursors",
      "telegramRssSeenIds",
      "telegramRssInitialized",
      "telegramRssHistory",
      "telegramMonitorPaused",
      "telegramMonitorLastCheck",
      "telegramMonitorLastError",
      "telegramPendingDirectTopics",
      "telegramPendingPersonalChatId",
      "telegramPendingPersonalTargetName",
      "telegramPersonalStartWatchUntil",
      "telegramPersonalStartWatchSince",
      "telegramPersonalStartOffset",
      "telegramPersonalStartRepliedUpdateId",
      "telegramPendingPersonalStartUpdateId"
    ]);
    await chrome.storage.local.set({
      ...DEFAULT_OPTIONS,
      profileLabelKeys: [...DEFAULT_PROFILE_LABEL_KEYS],
      levelColors: { ...DEFAULT_LEVEL_COLORS }
    });
    applyOptionsSnapshot(await readStoredOptions());
    await restoreTelegramConfig();
    showToast("已恢复默认");
  } catch (error) {
    showToast(formatToastError(error, "恢复默认失败"), "error");
  }
}

function confirmResetOptions() {
  openConfirmDialog({
    title: "恢复默认",
    message: "确定将所有设置恢复为默认值吗？",
    confirmText: "恢复",
    danger: true
  }, resetOptions);
}

async function saveLuckyNotificationsEnabled() {
  try {
    await chrome.storage.local.set({
      luckyNotificationsEnabled: form.luckyNotificationsEnabled.checked
    });
    rememberOptionsSnapshot(await readStoredOptions());
    showToast("保存成功");
  } catch (error) {
    showToast(formatToastError(error, "保存失败"), "error");
  }
}

async function saveLuckyAutoAddEnabled() {
  try {
    await chrome.storage.local.set({
      luckyAutoAddEnabled: form.luckyAutoAddEnabled.checked
    });
    rememberOptionsSnapshot(await readStoredOptions());
    showToast("保存成功");
  } catch (error) {
    showToast(formatToastError(error, "保存失败"), "error");
  }
}

function setFormValues(options) {
  form.imageUploadEnabled.checked = options.imageUploadEnabled;
  form.apiKey.value = options.apiKey;
  form.userStatsEnabled.checked = options.userStatsEnabled;
  form.profileHoverSignatureEnabled.checked = options.profileHoverSignatureEnabled;
  form.profileHoverTrendEnabled.checked = options.profileHoverTrendEnabled;
  form.userCacheHours.value = normalizeUserCacheHours(options.userCacheHours);
  form.profileRetentionDays.value = String(normalizeProfileRetentionDays(options.profileRetentionDays));
  form.blockFilterEnabled.checked = options.blockFilterEnabled;
  form.blockFilterQuickKeywordEnabled.checked = options.blockFilterQuickKeywordEnabled;
  form.blockFilterQuickUserEnabled.checked = options.blockFilterQuickUserEnabled;
  form.blockedKeywords.value = normalizeBlockFilterList(options.blockedKeywords).join("\n");
  form.blockedUsers.value = normalizeBlockFilterList(options.blockedUsers).join("\n");
  setBlockRulesEditorValue();
  setFollowRulesEditorValue(options.followRules);
  form.readingNavigationEnabled.checked = options.readingNavigationEnabled;
  form.attendanceReminderEnabled.checked = options.attendanceReminderEnabled;
  form.autoAttendanceEnabled.checked = options.autoAttendanceEnabled;
  form.autoAttendanceMode.value = options.autoAttendanceMode;
  form.quickJumpEnabled.checked = options.quickJumpEnabled;
  form.imagePreviewEnabled.checked = options.imagePreviewEnabled;
  form.messageEntryEnabled.checked = options.messageEntryEnabled;
  form.editorToolsEnabled.checked = options.editorToolsEnabled;
  form.postSwitcherEnabled.checked = options.postSwitcherEnabled;
  form.autoPageEnabled.checked = options.autoPageEnabled;
  form.autoPageAppendEnabled.checked = options.autoPageAppendEnabled;
  form.autoPageDelayMs.value = normalizeAutoPageDelayMs(options.autoPageDelayMs);
  syncReadingNavigationControls();
  form.postPagePreviousShortcut.value = formatShortcutForDisplay(options.postPagePreviousShortcut);
  form.postPageNextShortcut.value = formatShortcutForDisplay(options.postPageNextShortcut);
  form.postSwitcherPreviousShortcut.value = formatShortcutForDisplay(options.postSwitcherPreviousShortcut);
  form.postSwitcherNextShortcut.value = formatShortcutForDisplay(options.postSwitcherNextShortcut);
  form.quickReplyShortcut.value = formatShortcutForDisplay(options.quickReplyShortcut);
  form.replySubmitShortcut.value = formatShortcutForDisplay(options.replySubmitShortcut);
  form.quickPhrasesEnabled.checked = options.quickPhrasesEnabled;
  form.quickPhraseShortcut.value = formatShortcutForDisplay(options.quickPhraseShortcut);
  quickPhrases = normalizeQuickPhrases(options.quickPhrases);
  closeQuickPhraseEditor();
  renderQuickPhrases();
  syncQuickPhraseControls();
  form.luckyNotificationsEnabled.checked = options.luckyNotificationsEnabled;
  form.luckyAutoAddEnabled.checked = options.luckyAutoAddEnabled;
  form.profileLabelSize.value = normalizeProfileLabelSize(options.profileLabelSize);
  setProfileLabelValues(options.profileLabelKeys);
  setLevelColorValues(options.levelColors);
}

function normalizeStoredOptions(options) {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    imageUploadEnabled: options.imageUploadEnabled !== false,
    userStatsEnabled: options.userStatsEnabled !== false,
    profileHoverSignatureEnabled: options.profileHoverSignatureEnabled !== false,
    profileHoverTrendEnabled: options.profileHoverTrendEnabled === true,
    userCacheHours: normalizeUserCacheHours(options.userCacheHours),
    profileRetentionDays: normalizeProfileRetentionDays(options.profileRetentionDays),
    blockFilterEnabled: options.blockFilterEnabled !== false,
    blockFilterQuickKeywordEnabled: options.blockFilterQuickKeywordEnabled !== false,
    blockFilterQuickUserEnabled: options.blockFilterQuickUserEnabled !== false,
    blockedKeywords: normalizeBlockFilterList(options.blockedKeywords),
    blockedUsers: normalizeBlockFilterList(options.blockedUsers),
    followRules: normalizeFollowRules(options.followRules),
    readingNavigationEnabled: options.readingNavigationEnabled === true,
    attendanceReminderEnabled: options.attendanceReminderEnabled !== false,
    autoAttendanceEnabled: options.autoAttendanceEnabled === true,
    autoAttendanceMode: options.autoAttendanceMode === "fixed" ? "fixed" : "random",
    quickJumpEnabled: options.quickJumpEnabled !== false,
    imagePreviewEnabled: options.imagePreviewEnabled !== false,
    messageEntryEnabled: options.messageEntryEnabled !== false,
    editorToolsEnabled: options.editorToolsEnabled !== false,
    postSwitcherEnabled: options.postSwitcherEnabled === true,
    autoPageEnabled: options.autoPageEnabled !== false,
    autoPageAppendEnabled: options.autoPageAppendEnabled === true,
    autoPageDelayMs: normalizeAutoPageDelayMs(options.autoPageDelayMs),
    postPagePreviousShortcut: normalizeShortcut(
      options.postPagePreviousShortcut,
      DEFAULT_OPTIONS.postPagePreviousShortcut
    ),
    postPageNextShortcut: normalizeShortcut(
      options.postPageNextShortcut,
      DEFAULT_OPTIONS.postPageNextShortcut
    ),
    postSwitcherPreviousShortcut: normalizeShortcut(
      options.postSwitcherPreviousShortcut,
      DEFAULT_OPTIONS.postSwitcherPreviousShortcut
    ),
    postSwitcherNextShortcut: normalizeShortcut(
      options.postSwitcherNextShortcut,
      DEFAULT_OPTIONS.postSwitcherNextShortcut
    ),
    quickReplyShortcut: normalizeShortcut(
      options.quickReplyShortcut,
      DEFAULT_OPTIONS.quickReplyShortcut
    ),
    replySubmitShortcut: normalizeShortcut(
      options.replySubmitShortcut,
      DEFAULT_OPTIONS.replySubmitShortcut
    ),
    quickPhrasesEnabled: options.quickPhrasesEnabled !== false,
    quickPhraseShortcut: normalizeShortcut(
      options.quickPhraseShortcut,
      DEFAULT_OPTIONS.quickPhraseShortcut
    ),
    quickPhrases: normalizeQuickPhrases(options.quickPhrases),
    luckyNotificationsEnabled: options.luckyNotificationsEnabled !== false,
    luckyAutoAddEnabled: options.luckyAutoAddEnabled === true,
    profileLabelKeys: normalizeProfileLabelKeys(options.profileLabelKeys),
    profileLabelSize: normalizeProfileLabelSize(options.profileLabelSize),
    levelColors: normalizeLevelColors(options.levelColors)
  };
}

function renderProfileLabelFields() {
  profileLabelFieldsNode.replaceChildren();
  PROFILE_FIELD_DEFINITIONS.forEach((field) => {
    const label = document.createElement("label");
    label.className = "label-field-option";
    label.draggable = true;
    label.dataset.profileLabelKey = field.key;
    label.addEventListener("dragstart", handleProfileLabelDragStart);
    label.addEventListener("dragover", handleProfileLabelDragOver);
    label.addEventListener("drop", handleProfileLabelDrop);
    label.addEventListener("dragend", handleProfileLabelDragEnd);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "profileLabelKey";
    input.value = field.key;

    const text = document.createElement("span");
    text.textContent = field.label;

    label.appendChild(input);
    label.appendChild(text);
    profileLabelFieldsNode.appendChild(label);
  });
}

function readProfileLabelKeysFromForm() {
  return Array.from(form.querySelectorAll("input[name='profileLabelKey']:checked"), (input) => input.value);
}

function setProfileLabelValues(keys) {
  const orderedKeys = normalizeProfileLabelKeys(keys);
  const enabledKeys = new Set(orderedKeys);
  const optionNodes = new Map(
    Array.from(profileLabelFieldsNode.querySelectorAll(".label-field-option")).map((node) => {
      return [node.dataset.profileLabelKey, node];
    })
  );
  [
    ...orderedKeys,
    ...PROFILE_FIELD_DEFINITIONS.map((field) => field.key).filter((key) => !enabledKeys.has(key))
  ].forEach((key) => {
    const node = optionNodes.get(key);
    if (node) {
      profileLabelFieldsNode.appendChild(node);
    }
  });

  form.querySelectorAll("input[name='profileLabelKey']").forEach((input) => {
    input.checked = enabledKeys.has(input.value);
  });
}

function handleProfileLabelDragStart(event) {
  draggedProfileLabelKeys = readProfileLabelKeysFromForm().join("\n");
  draggedProfileLabelOption = event.currentTarget;
  draggedProfileLabelOption.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedProfileLabelOption.dataset.profileLabelKey);
}

function handleProfileLabelDragOver(event) {
  event.preventDefault();
  const target = event.currentTarget;
  if (!draggedProfileLabelOption || target === draggedProfileLabelOption) {
    return;
  }

  const rect = target.getBoundingClientRect();
  const afterTarget = event.clientY > rect.top + rect.height / 2
    || (event.clientY >= rect.top && event.clientY <= rect.bottom && event.clientX > rect.left + rect.width / 2);
  profileLabelFieldsNode.insertBefore(
    draggedProfileLabelOption,
    afterTarget ? target.nextElementSibling : target
  );
}

function handleProfileLabelDrop(event) {
  event.preventDefault();
}

function handleProfileLabelDragEnd() {
  const changed = draggedProfileLabelKeys !== readProfileLabelKeysFromForm().join("\n");
  draggedProfileLabelOption?.classList.remove("dragging");
  draggedProfileLabelOption = null;
  draggedProfileLabelKeys = "";
  if (changed) {
    showPendingSaveToast();
  }
}

function normalizeProfileLabelKeys(value) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_PROFILE_LABEL_KEYS];
  }

  const allowedKeys = new Set(PROFILE_FIELD_DEFINITIONS.map((field) => field.key));
  return [...new Set(value.filter((key) => allowedKeys.has(key)))];
}

function normalizeProfileLabelSize(value) {
  return PROFILE_LABEL_SIZE_OPTIONS.includes(value) ? value : DEFAULT_PROFILE_LABEL_SIZE;
}

function normalizeBlockFilterList(value) {
  const entries = Array.isArray(value)
    ? value
    : String(value || "").split(/\r?\n/);

  return [...new Set(
    entries
      .map((entry) => String(entry || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
  )];
}

function normalizeQuickPhrases(value) {
  const entries = Array.isArray(value)
    ? value
    : (String(value || "").trim() ? [value] : []);
  const seen = new Set();
  const phrases = [];

  entries.forEach((entry) => {
    const phrase = String(entry || "").replace(/\r\n?/g, "\n").trim();
    if (!phrase || seen.has(phrase)) {
      return;
    }

    seen.add(phrase);
    phrases.push(phrase);
  });

  return phrases;
}

function renderQuickPhrases() {
  quickPhraseListNode.replaceChildren();

  if (!quickPhrases.length) {
    const empty = document.createElement("p");
    empty.className = "quick-phrase-empty";
    empty.textContent = "暂无快捷短语";
    quickPhraseListNode.appendChild(empty);
    return;
  }

  quickPhrases.forEach((phrase, index) => {
    const item = document.createElement("article");
    item.className = "quick-phrase-item";
    item.classList.toggle("editing", index === editingQuickPhraseIndex);

    const preview = document.createElement("pre");
    preview.className = "quick-phrase-preview";
    preview.textContent = phrase;

    const actions = document.createElement("div");
    actions.className = "quick-phrase-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "quick-phrase-edit";
    editButton.textContent = "编辑";
    editButton.disabled = !form.quickPhrasesEnabled.checked;
    editButton.addEventListener("click", () => editQuickPhrase(index));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger-button quick-phrase-delete";
    deleteButton.textContent = "删除";
    deleteButton.disabled = !form.quickPhrasesEnabled.checked;
    deleteButton.addEventListener("click", () => deleteQuickPhrase(index));

    actions.append(editButton, deleteButton);
    item.append(preview, actions);
    quickPhraseListNode.appendChild(item);
  });
}

function openQuickPhraseEditor() {
  if (!form.quickPhrasesEnabled.checked) {
    return;
  }

  editingQuickPhraseIndex = -1;
  quickPhraseInput.value = "";
  confirmQuickPhraseButton.textContent = "添加";
  quickPhraseEditorNode.hidden = false;
  quickPhraseInput.focus();
}

function closeQuickPhraseEditor() {
  editingQuickPhraseIndex = -1;
  quickPhraseEditorNode.hidden = true;
  quickPhraseInput.value = "";
  confirmQuickPhraseButton.textContent = "添加";
  renderQuickPhrases();
}

function confirmQuickPhrase() {
  const phrase = normalizeQuickPhrases([quickPhraseInput.value])[0] || "";
  if (!phrase) {
    showToast("短语内容不能为空", "error");
    quickPhraseInput.focus();
    return;
  }

  const duplicateIndex = quickPhrases.findIndex((item) => item === phrase);
  if (duplicateIndex !== -1 && duplicateIndex !== editingQuickPhraseIndex) {
    showToast("短语已存在", "error");
    quickPhraseInput.focus();
    return;
  }

  const previousPhrases = JSON.stringify(quickPhrases);
  if (editingQuickPhraseIndex >= 0 && editingQuickPhraseIndex < quickPhrases.length) {
    quickPhrases = quickPhrases.map((item, index) => index === editingQuickPhraseIndex ? phrase : item);
  } else {
    quickPhrases = [...quickPhrases, phrase];
  }
  closeQuickPhraseEditor();
  renderQuickPhrases();
  syncQuickPhraseControls();
  if (previousPhrases !== JSON.stringify(quickPhrases)) {
    showPendingSaveToast();
  }
}

function editQuickPhrase(index) {
  if (!form.quickPhrasesEnabled.checked || !quickPhrases[index]) {
    return;
  }

  editingQuickPhraseIndex = index;
  quickPhraseInput.value = quickPhrases[index];
  confirmQuickPhraseButton.textContent = "完成";
  quickPhraseEditorNode.hidden = false;
  renderQuickPhrases();
  quickPhraseInput.focus();
}

function deleteQuickPhrase(index) {
  if (index === editingQuickPhraseIndex) {
    closeQuickPhraseEditor();
  }

  quickPhrases = quickPhrases.filter((_phrase, phraseIndex) => phraseIndex !== index);
  if (editingQuickPhraseIndex > index) {
    editingQuickPhraseIndex -= 1;
  }
  renderQuickPhrases();
  showPendingSaveToast();
}

function syncQuickPhraseControls() {
  const enabled = form.quickPhrasesEnabled.checked;
  addQuickPhraseButton.disabled = !enabled;
  quickPhraseInput.disabled = !enabled;
  confirmQuickPhraseButton.disabled = !enabled;
  setQuickPhraseControlDisabled(form.quickPhraseShortcut, !enabled);
  quickPhraseListNode.classList.toggle("disabled", !enabled);
  quickPhraseEditorNode.classList.toggle("disabled", !enabled);

  if (!enabled) {
    closeQuickPhraseEditor();
  }

  quickPhraseListNode
    .querySelectorAll(".quick-phrase-edit, .quick-phrase-delete")
    .forEach((button) => {
      button.disabled = !enabled;
    });
}

function setQuickPhraseControlDisabled(control, disabled) {
  control.disabled = disabled;
  control.toggleAttribute("aria-disabled", disabled);
  control.closest(".shortcut-grid label")?.classList.toggle("disabled", disabled);
}

function normalizeUserCacheHours(value) {
  const hours = Number(value);
  return Number.isFinite(hours)
    ? Math.max(Math.floor(hours), MIN_USER_CACHE_HOURS)
    : DEFAULT_OPTIONS.userCacheHours;
}

function normalizeProfileRetentionDays(value) {
  const days = Number(value);
  return [30, 90, 180, 270, 360].includes(days) ? days : 0;
}

function normalizeAutoPageDelayMs(value) {
  const delay = Number(value);
  return Number.isFinite(delay)
    ? Math.max(Math.floor(delay), MIN_AUTO_PAGE_DELAY_MS)
    : DEFAULT_OPTIONS.autoPageDelayMs;
}

function syncReadingNavigationControls() {
  const enabled = form.readingNavigationEnabled.checked;
  [
    form.attendanceReminderEnabled,
    form.messageEntryEnabled,
    form.postSwitcherEnabled,
    form.autoPageEnabled,
    form.postPagePreviousShortcut,
    form.postPageNextShortcut,
    form.postSwitcherPreviousShortcut,
    form.postSwitcherNextShortcut,
    form.quickReplyShortcut
  ].forEach((control) => setReadingNavigationControlDisabled(control, !enabled));
  syncAutoPageModeControls();
}

function syncAutoPageModeControls() {
  const readingEnabled = form.readingNavigationEnabled.checked;
  const autoPageEnabled = readingEnabled && form.autoPageEnabled.checked;
  const appendDisabled = !autoPageEnabled;
  const delayDisabled = !autoPageEnabled;

  setReadingNavigationControlDisabled(form.autoPageAppendEnabled, appendDisabled);
  setReadingNavigationControlDisabled(form.autoPageDelayMs, delayDisabled);
  autoPageDelayOption.classList.toggle("disabled", delayDisabled);
}

function setReadingNavigationControlDisabled(control, disabled) {
  control.disabled = disabled;
  control.toggleAttribute("aria-disabled", disabled);
  control
    .closest(".quick-page-option, .auto-page-delay-option, .shortcut-grid label")
    ?.classList.toggle("disabled", disabled);
}

function readLevelColorsFromForm() {
  return Object.fromEntries(
    colorInputs.map((input) => {
      const level = input.dataset.levelColor;
      const alphaInput = colorAlphaInputs.find((node) => node.dataset.levelAlpha === level);
      const color = normalizeColor(input.value, DEFAULT_LEVEL_COLORS[level]);
      const alpha = normalizeColorAlphaPercent(alphaInput?.value, getColorAlphaPercent(DEFAULT_LEVEL_COLORS[level]));
      return [level, withColorAlpha(color, alpha)];
    })
  );
}

function setLevelColorValues(colors) {
  const normalizedColors = normalizeLevelColors(colors);
  colorInputs.forEach((input) => {
    input.value = getColorRgb(normalizedColors[input.dataset.levelColor]);
  });
  colorAlphaInputs.forEach((input) => {
    input.value = String(getColorAlphaPercent(normalizedColors[input.dataset.levelAlpha]));
  });
}

function normalizeLevelColors(colors) {
  return Object.fromEntries(
    Object.entries(DEFAULT_LEVEL_COLORS).map(([level, defaultColor]) => {
      return [level, normalizeColor(colors?.[level], defaultColor)];
    })
  );
}

function normalizeColor(value, fallback) {
  const text = String(value || "").trim();
  if (/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(text)) {
    return text;
  }

  const color = parseRgbColor(text);
  return color ? formatHexColor(color) : fallback;
}

function getColorRgb(value) {
  return normalizeColor(value, "#000000").slice(0, 7);
}

function getColorAlphaPercent(value) {
  const color = normalizeColor(value, "#000000");
  if (color.length !== 9) {
    return 100;
  }

  return Math.round(parseInt(color.slice(7, 9), 16) / 255 * 100);
}

function normalizeColorAlphaPercent(value, fallback = 100) {
  const alpha = Number(value);
  return Number.isFinite(alpha) ? Math.min(100, Math.max(0, Math.round(alpha))) : fallback;
}

function withColorAlpha(color, alphaPercent) {
  const rgb = getColorRgb(color);
  const alpha = normalizeColorAlphaPercent(alphaPercent);
  if (alpha >= 100) {
    return rgb;
  }

  return `${rgb}${Math.round(alpha / 100 * 255).toString(16).padStart(2, "0")}`;
}

function parseRgbColor(value) {
  const match = String(value || "").trim().match(/^rgba?\((.+)\)$/i);
  if (!match) {
    return null;
  }

  const [colorPart, alphaPart = ""] = match[1].split("/").map((part) => part.trim());
  const parts = colorPart.includes(",")
    ? colorPart.split(",").map((part) => part.trim()).filter(Boolean)
    : colorPart.split(/\s+/).filter(Boolean);
  const alphaValue = alphaPart || (parts.length === 4 ? parts.pop() : "");

  if (parts.length !== 3) {
    return null;
  }

  const channels = parts.map(parseColorChannel);
  const alpha = alphaValue ? parseColorAlpha(alphaValue) : 1;
  if (channels.some((channel) => channel === null) || alpha === null) {
    return null;
  }

  return {
    red: channels[0],
    green: channels[1],
    blue: channels[2],
    alpha
  };
}

function parseColorChannel(value) {
  const text = String(value || "").trim();
  const number = text.endsWith("%") ? Number(text.slice(0, -1)) / 100 * 255 : Number(text);
  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.min(255, Math.max(0, Math.round(number)));
}

function parseColorAlpha(value) {
  const text = String(value || "").trim();
  const alpha = text.endsWith("%") ? Number(text.slice(0, -1)) / 100 : Number(text);
  if (!Number.isFinite(alpha)) {
    return null;
  }

  return Math.min(1, Math.max(0, alpha));
}

function formatHexColor(color) {
  const rgb = [color.red, color.green, color.blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");
  const alpha = Math.round(color.alpha * 255);

  return alpha >= 255 ? `#${rgb}` : `#${rgb}${alpha.toString(16).padStart(2, "0")}`;
}

function toggleApiKeyVisibility() {
  setApiKeyVisibility(apiKeyInput.type === "password");
}

function setApiKeyVisibility(visible) {
  apiKeyInput.type = visible ? "text" : "password";
  toggleApiKeyButton.setAttribute("aria-label", visible ? "隐藏 API Key" : "显示 API Key");
  toggleApiKeyButton.title = visible ? "隐藏 API Key" : "显示 API Key";
  eyeIcon.toggleAttribute("hidden", visible);
  eyeOffIcon.toggleAttribute("hidden", !visible);
}

function openConfirmDialog(options, onConfirm) {
  confirmDialogTitle.textContent = options.title || "确认操作";
  confirmDialogMessage.textContent = options.message || "";
  cancelConfirmDialogButton.textContent = options.cancelText || "取消";
  confirmDialogActionButton.textContent = options.confirmText || "确定";
  confirmDialogActionButton.classList.toggle("danger-button", options.danger === true);
  pendingConfirmDialogAction = typeof onConfirm === "function" ? onConfirm : null;
  confirmDialog.hidden = false;
  cancelConfirmDialogButton.focus();
}

function closeConfirmDialog() {
  confirmDialog.hidden = true;
  pendingConfirmDialogAction = null;
  cancelConfirmDialogButton.textContent = "取消";
  confirmDialogActionButton.classList.remove("danger-button");
}

function confirmPendingDialogAction() {
  const action = pendingConfirmDialogAction;
  closeConfirmDialog();
  action?.();
}

function handleOptionsFormInput(event) {
  const fieldName = event.target?.name || "";
  if (!fieldName || OPTIONS_PENDING_SAVE_IGNORED_FIELDS.has(fieldName)) {
    return;
  }

  showPendingSaveToast();
}

function showToast(text, type = "success") {
  const normalizedType = ["error", "warning"].includes(type) ? type : "success";
  const toast = document.createElement("div");
  toast.className = `toast toast-${normalizedType}`;
  toast.setAttribute("role", normalizedType === "error" ? "alert" : "status");
  toast.textContent = text;

  window.clearTimeout(toastTimer);
  toastRoot.replaceChildren(toast);
  const duration = normalizedType === "error" ? 6000 : normalizedType === "warning" ? 4000 : 2500;
  toastTimer = window.setTimeout(() => {
    toast.remove();
  }, duration);
}

function showPendingSaveToast() {
  optionsDirty = true;
  window.clearTimeout(optionsAutoSaveTimer);
  optionsAutoSaveTimer = window.setTimeout(() => {
    optionsAutoSaveTimer = 0;
    saveOptions();
  }, OPTIONS_AUTOSAVE_DELAY_MS);
}

function formatToastError(error, fallback) {
  return error?.message ? `${fallback}：${error.message}` : fallback;
}

function renderAbout() {
  extensionVersionNode.textContent = chrome.runtime.getManifest().version;
}
