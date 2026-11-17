document.addEventListener("DOMContentLoaded", initOptions);
let telegramTargets = [];
let telegramDirectTopics = [];
let telegramDirectNextOffset = null;
let selectedTelegramDirectTopic = null;
let telegramValidatedToken = "";
let telegramTokenValidationState = "empty";
let telegramTokenValidationTimer = 0;
let telegramTokenValidationRequestId = 0;
let telegramKeywordRules = [];
let telegramKeywordEditingRuleId = "";
let selectedTelegramHistoryKeys = new Set();
let selectedTelegramManagedTopicIds = new Set();
form.addEventListener("submit", saveOptions);
form.addEventListener("input", handleOptionsFormInput);
form.addEventListener("change", handleOptionsFormInput);
resetButton.addEventListener("click", confirmResetOptions);
clearProfileCacheButton.addEventListener("click", openClearProfileDialog);
importConfigButton.addEventListener("click", openConfigImportPicker);
exportConfigButton.addEventListener("click", exportConfig);
importDataButton.addEventListener("click", openDataImportPicker);
exportDataButton.addEventListener("click", exportDatabaseData);
importConfigFileInput.addEventListener("change", importConfigFromFile);
importDataFileInput.addEventListener("change", importDatabaseDataFromFile);
toggleApiKeyButton.addEventListener("click", toggleApiKeyVisibility);
menuButtons.forEach((button) => {
  button.addEventListener("click", () => showPanel(button.dataset.panelTarget));
});
cancelDeleteButton.addEventListener("click", closeDeleteDialog);
confirmDeleteButton.addEventListener("click", confirmPendingDelete);
cancelDeleteVisitHistoryButton.addEventListener("click", closeVisitHistoryDeleteDialog);
confirmDeleteVisitHistoryButton.addEventListener("click", confirmPendingVisitHistoryDelete);
cancelClearProfileButton.addEventListener("click", closeClearProfileDialog);
confirmClearProfileButton.addEventListener("click", confirmClearProfileCache);
cancelConfirmDialogButton.addEventListener("click", closeConfirmDialog);
confirmDialogActionButton.addEventListener("click", confirmPendingDialogAction);
form.luckyNotificationsEnabled.addEventListener("change", saveLuckyNotificationsEnabled);
form.luckyAutoAddEnabled.addEventListener("change", saveLuckyAutoAddEnabled);
form.readingNavigationEnabled.addEventListener("change", syncReadingNavigationControls);
form.autoPageEnabled.addEventListener("change", syncAutoPageModeControls);
form.autoPageAppendEnabled.addEventListener("change", syncAutoPageModeControls);
form.quickPhrasesEnabled.addEventListener("change", syncQuickPhraseControls);
addQuickPhraseButton.addEventListener("click", openQuickPhraseEditor);
cancelQuickPhraseButton.addEventListener("click", closeQuickPhraseEditor);
confirmQuickPhraseButton.addEventListener("click", confirmQuickPhrase);
readingShortcutInputs.forEach((input) => {
  input.addEventListener("keydown", handleShortcutInputKeyDown);
  input.addEventListener("paste", handleShortcutInputPaste);
});
luckyStatusFilter.addEventListener("change", () => {
  luckyPage = 0;
  renderLuckyNotifications();
});
luckyTitleSearch.addEventListener("input", () => {
  luckyPage = 0;
  renderLuckyNotifications();
});
luckyDrawFrom.addEventListener("change", () => {
  luckyPage = 0;
  renderLuckyNotifications();
});
luckyDrawTo.addEventListener("change", () => {
  luckyPage = 0;
  renderLuckyNotifications();
});
visitHistoryTitleSearch.addEventListener("input", () => {
  visitHistoryPage = 0;
  renderVisitHistory();
});
visitHistoryAuthorSearch.addEventListener("input", () => {
  visitHistoryPage = 0;
  renderVisitHistory();
});
visitHistoryPostedFrom.addEventListener("change", () => {
  visitHistoryPage = 0;
  renderVisitHistory();
});
visitHistoryPostedTo.addEventListener("change", () => {
  visitHistoryPage = 0;
  renderVisitHistory();
});
deleteDialog.addEventListener("click", (event) => {
  if (event.target === deleteDialog) {
    closeDeleteDialog();
  }
});
deleteVisitHistoryDialog.addEventListener("click", (event) => {
  if (event.target === deleteVisitHistoryDialog) {
    closeVisitHistoryDeleteDialog();
  }
});
clearProfileDialog.addEventListener("click", (event) => {
  if (event.target === clearProfileDialog) {
    closeClearProfileDialog();
  }
});
confirmDialog.addEventListener("click", (event) => {
  if (event.target === confirmDialog) {
    closeConfirmDialog();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (!deleteDialog.hidden) {
    closeDeleteDialog();
  }

  if (!deleteVisitHistoryDialog.hidden) {
    closeVisitHistoryDeleteDialog();
  }

  if (!clearProfileDialog.hidden) {
    closeClearProfileDialog();
  }

  if (!confirmDialog.hidden) {
    closeConfirmDialog();
  }
});
setApiKeyVisibility(false);

function initOptions() {
  document.querySelector("#telegram-panel").appendChild(document.querySelector("#telegramConfigGroup"));
  initializeOptionsSync();
  renderProfileLabelFields();
  restoreOptions();
  renderLuckyNotifications();
  renderVisitHistory();
  renderAbout();
  restoreTelegramConfig();
  showPanel("label-panel");
}

async function restoreTelegramConfig() {
  const config = await chrome.storage.local.get({
    telegramMessageNotificationsEnabled: true,
    telegramPostNotificationsEnabled: true,
    telegramMentionNotificationsEnabled: null,
    telegramReplyNotificationsEnabled: null,
    telegramSystemFollowNotificationsEnabled: false,
    telegramSystemFeedNotificationsEnabled: true,
    telegramSystemLikeNotificationsEnabled: true,
    telegramMentionReplyNotificationsEnabled: null,
    telegramMonitorIntervalSeconds: 30,
    telegramOfflineMessageSyncEnabled: true,
    telegramSilentPushEnabled: false,
    telegramBotToken: "",
    telegramChatId: "",
    telegramTargets: [],
    telegramKeywordRules: [],
    telegramBlockedKeywords: [],
    telegramBoardSlugs: [],
    telegramMonitorPaused: false,
    telegramMonitorLastCheck: 0,
    telegramMonitorLastError: "",
    telegramPersonalStartWatchUntil: 0,
    telegramPendingPersonalChatId: "",
    telegramRssHistory: [],
    telegramManagedTopics: [],
    telegramSettingsTopics: [],
    telegramNotificationDefaultsMigrationV1: false
  });
  const mentionNotificationsEnabled = typeof config.telegramMentionNotificationsEnabled === "boolean"
    ? config.telegramMentionNotificationsEnabled
    : config.telegramMentionReplyNotificationsEnabled === true;
  const replyNotificationsEnabled = typeof config.telegramReplyNotificationsEnabled === "boolean"
    ? config.telegramReplyNotificationsEnabled
    : config.telegramMentionReplyNotificationsEnabled === true;
  if (typeof config.telegramMentionNotificationsEnabled !== "boolean"
      || typeof config.telegramReplyNotificationsEnabled !== "boolean"
      || config.telegramMentionReplyNotificationsEnabled !== null) {
    await chrome.storage.local.set({
      telegramMentionNotificationsEnabled: mentionNotificationsEnabled,
      telegramReplyNotificationsEnabled: replyNotificationsEnabled
    });
    await chrome.storage.local.remove("telegramMentionReplyNotificationsEnabled");
  }
  document.querySelector("#telegramBotToken").value = config.telegramBotToken;
  telegramTargets = normalizeTelegramTargets(config.telegramTargets);
  if (telegramTargets.length === 0 && config.telegramChatId) {
    telegramTargets = [{
      id: crypto.randomUUID(),
      name: "个人聊天",
      type: "personal",
      chatId: String(config.telegramChatId).trim(),
      topicId: "",
      enabled: true
    }];
    await chrome.storage.local.set({ telegramTargets });
    await chrome.storage.local.remove("telegramChatId");
  }
  const hasEnabledTarget = telegramTargets.some((target) => target.enabled !== false && target.chatId);
  if (!config.telegramNotificationDefaultsMigrationV1 && hasEnabledTarget) {
    if (config.telegramMessageNotificationsEnabled === false
        && config.telegramPostNotificationsEnabled === false
        && !mentionNotificationsEnabled
        && !replyNotificationsEnabled) {
      config.telegramMessageNotificationsEnabled = true;
      config.telegramPostNotificationsEnabled = true;
      await chrome.storage.local.set({
        telegramMessageNotificationsEnabled: true,
        telegramPostNotificationsEnabled: true
      });
    }
    await chrome.storage.local.set({ telegramNotificationDefaultsMigrationV1: true });
  }
  document.querySelector("#telegramMessageNotificationsEnabled").checked = config.telegramMessageNotificationsEnabled;
  document.querySelector("#telegramPostNotificationsEnabled").checked = config.telegramPostNotificationsEnabled;
  document.querySelector("#telegramMentionNotificationsEnabled").checked = mentionNotificationsEnabled;
  document.querySelector("#telegramReplyNotificationsEnabled").checked = replyNotificationsEnabled;
  document.querySelector("#telegramSystemFollowNotificationsEnabled").checked = config.telegramSystemFollowNotificationsEnabled;
  document.querySelector("#telegramSystemFeedNotificationsEnabled").checked = config.telegramSystemFeedNotificationsEnabled;
  document.querySelector("#telegramSystemLikeNotificationsEnabled").checked = config.telegramSystemLikeNotificationsEnabled;
  const monitorIntervalSeconds = Number(config.telegramMonitorIntervalSeconds);
  document.querySelector("#telegramMonitorIntervalSeconds").value =
    [10, 30, 60, 300, 900].includes(monitorIntervalSeconds) ? String(monitorIntervalSeconds) : "30";
  telegramKeywordRules = normalizeTelegramKeywordRules(config.telegramKeywordRules);
  renderTelegramKeywordRules();
  document.querySelector("#telegramBlockedKeywords").value = config.telegramBlockedKeywords.join("\n");
  const boardInputs = Array.from(document.querySelectorAll("[data-telegram-board]"));
  const selectedBoards = config.telegramBoardSlugs.length
    ? new Set(config.telegramBoardSlugs)
    : new Set(boardInputs.map((input) => input.value));
  boardInputs.forEach((input) => {
    input.checked = selectedBoards.has(input.value);
  });
  renderTelegramTargets();
  renderTelegramMonitorStatus(config);
  renderTelegramOfflineMessageSync(config);
  renderTelegramSilentPush(config);
  renderTelegramHistory(config.telegramRssHistory);
  renderTelegramManagedTopics(getTelegramManagedTopicEntries(config));
  syncTelegramTargetFields();
  const savedToken = String(config.telegramBotToken || "").trim();
  if (savedToken) {
    await verifyTelegramToken(savedToken);
  } else {
    telegramTokenValidationState = "empty";
    setTelegramTokenStatus("");
    syncTelegramSetupVisibility();
  }
  if (telegramTokenValidationState === "valid" && config.telegramPendingPersonalChatId) {
    await ensureTelegramPersonalTarget(config.telegramPendingPersonalChatId, config.telegramPendingPersonalTargetName);
  }
}

document.querySelector("#openTelegramBot").addEventListener("click", openTelegramBot);
document.querySelector("#telegramDirectTopicPickerButton").addEventListener("click", toggleTelegramDirectTopicPicker);
document.querySelector("#telegramDirectTopicMenu").addEventListener("click", handleTelegramDirectTopicMenuClick);
document.querySelector("#telegramBotToken").addEventListener("input", handleTelegramBotTokenInput);
document.querySelector("#telegramMessageNotificationsEnabled").addEventListener("change", scheduleTelegramConfigSave);
document.querySelector("#telegramPostNotificationsEnabled").addEventListener("change", scheduleTelegramConfigSave);
document.querySelector("#telegramMentionNotificationsEnabled").addEventListener("change", scheduleTelegramConfigSave);
document.querySelector("#telegramReplyNotificationsEnabled").addEventListener("change", scheduleTelegramConfigSave);
document.querySelector("#telegramSystemFollowNotificationsEnabled").addEventListener("change", scheduleTelegramConfigSave);
document.querySelector("#telegramSystemFeedNotificationsEnabled").addEventListener("change", scheduleTelegramConfigSave);
document.querySelector("#telegramSystemLikeNotificationsEnabled").addEventListener("change", scheduleTelegramConfigSave);
document.querySelector("#telegramMonitorIntervalSeconds").addEventListener("change", saveTelegramMonitorInterval);
document.querySelector("#toggleTelegramOfflineMessageSync").addEventListener("click", toggleTelegramOfflineMessageSync);
document.querySelector("#toggleTelegramSilentPush").addEventListener("click", toggleTelegramSilentPush);
document.querySelector("#telegramBlockedKeywords").addEventListener("input", scheduleTelegramConfigSave);
document.querySelectorAll("[data-telegram-board]").forEach((input) => {
  input.addEventListener("change", scheduleTelegramConfigSave);
});
document.querySelector("#telegramTargetType").addEventListener("change", handleTelegramTargetTypeChange);
document.querySelector("#telegramTargetChatId").addEventListener("input", handleTelegramChannelInput);
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.telegramTargets) {
    telegramTargets = normalizeTelegramTargets(changes.telegramTargets.newValue);
    renderTelegramTargets();
  }
  if (changes.telegramRssHistory) {
    renderTelegramHistory(changes.telegramRssHistory.newValue);
  }
  if (changes.telegramSilentPushEnabled) {
    renderTelegramSilentPush({ telegramSilentPushEnabled: changes.telegramSilentPushEnabled.newValue });
  }
  if (changes.telegramManagedTopics || changes.telegramSettingsTopics) {
    refreshTelegramManagedTopics();
  }
  const chatId = changes.telegramPendingPersonalChatId?.newValue;
  if (chatId) {
    ensureTelegramPersonalTarget(chatId, changes.telegramPendingPersonalTargetName?.newValue);
  }
});
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "telegram:personalChatIdDetected") {
    applyTelegramDetectedChatId(message);
  }
  if (message?.type === "telegram:personalStartWatchTimeout") {
    showToast("没有收到 /start，监听已停止；点 Start 重试", "error");
  }
  if (message?.type === "telegram:personalStartWatchError") {
    showToast(`监听失败：${message.error || "Telegram 更新读取失败"}`, "error");
  }
  if (message?.type === "telegram:personalChatIdReplyFailed") {
    showToast(`接收目标已添加，但机器人回复失败：${message.error || "发送失败"}`, "error");
  }
});
document.querySelector("#telegramTargetList").addEventListener("click", handleTelegramTargetListClick);
document.querySelector("#telegramTargetList").addEventListener("change", handleTelegramTargetEnabledChange);
document.querySelector("#telegramRssHistory").addEventListener("change", handleTelegramHistorySelectionChange);
document.querySelector("#telegramHistoryReset").addEventListener("click", resetTelegramHistory);
document.querySelector("#telegramHistorySelectAll").addEventListener("click", selectAllTelegramHistory);
document.querySelector("#telegramHistoryDeleteSelected").addEventListener("click", deleteSelectedTelegramHistory);
document.querySelector("#telegramHistoryDone").addEventListener("click", clearTelegramHistorySelection);
document.querySelector("#telegramManagedTopics").addEventListener("change", handleTelegramManagedTopicSelectionChange);
document.querySelector("#telegramTopicSelectAll").addEventListener("click", selectAllTelegramManagedTopics);
document.querySelector("#telegramTopicDeleteSelected").addEventListener("click", deleteSelectedTelegramManagedTopics);
document.querySelector("#telegramTopicDone").addEventListener("click", clearTelegramManagedTopicSelection);
document.querySelector("#resetTelegramConfig").addEventListener("click", resetTelegramConfig);
document.addEventListener("click", closeTelegramDirectTopicMenuOutside);
document.querySelector("#toggleTelegramPause").addEventListener("click", toggleTelegramPause);
document.querySelector("#addTelegramKeyword").addEventListener("click", addTelegramKeywordRule);
[
  document.querySelector("#telegramKeywordInput"),
  document.querySelector("#telegramKeywordExcludeInput")
].forEach((input) => input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addTelegramKeywordRule();
  }
}));
document.querySelector("#telegramKeywordRuleList").addEventListener("change", handleTelegramKeywordRuleChange);
document.querySelector("#telegramKeywordRuleList").addEventListener("click", handleTelegramKeywordRuleClick);
document.querySelector("#selectAllTelegramBoards").addEventListener("click", () => {
  document.querySelectorAll("[data-telegram-board]").forEach((input) => { input.checked = true; });
  scheduleTelegramConfigSave();
});

let telegramConfigSaveTimer = 0;

function handleTelegramBotTokenInput() {
  window.clearTimeout(telegramTokenValidationTimer);
  telegramTokenValidationRequestId += 1;
  telegramValidatedToken = "";
  const token = document.querySelector("#telegramBotToken").value.trim();
  if (!token) {
    telegramTokenValidationState = "empty";
    setTelegramTokenStatus("");
    syncTelegramSetupVisibility();
    scheduleTelegramConfigSave({ silent: true });
    return;
  }

  telegramTokenValidationState = "checking";
  setTelegramTokenStatus("输入完成后自动验证…", "checking");
  syncTelegramSetupVisibility();
  telegramTokenValidationTimer = window.setTimeout(() => {
    telegramTokenValidationTimer = 0;
    verifyTelegramToken(token, { persist: true });
  }, 650);
}

async function verifyTelegramToken(tokenValue, { persist = false } = {}) {
  const token = String(tokenValue || "").trim();
  if (!token) {
    telegramValidatedToken = "";
    telegramTokenValidationState = "empty";
    setTelegramTokenStatus("");
    syncTelegramSetupVisibility();
    return false;
  }

  const requestId = ++telegramTokenValidationRequestId;
  telegramTokenValidationState = "checking";
  setTelegramTokenStatus("正在验证 Bot Token…", "checking");
  syncTelegramSetupVisibility();

  try {
    const response = await chrome.runtime.sendMessage({
      type: "telegram:validateToken",
      payload: { token }
    });
    if (requestId !== telegramTokenValidationRequestId
        || document.querySelector("#telegramBotToken").value.trim() !== token) {
      return false;
    }
    if (!response?.ok || !response.result?.username) {
      const error = new Error(response?.error || "Telegram 未返回机器人用户名");
      error.invalidToken = response?.invalidToken === true;
      throw error;
    }

    telegramValidatedToken = token;
    telegramTokenValidationState = "valid";
    setTelegramTokenStatus(`Token 有效：@${response.result.username}`, "valid");
    syncTelegramSetupVisibility();

    if (persist) {
      const saved = await saveTelegramConfig({ silent: true });
      if (!saved && requestId === telegramTokenValidationRequestId) {
        telegramValidatedToken = "";
        telegramTokenValidationState = "error";
        setTelegramTokenStatus("Token 已验证，但配置保存失败，请重试。", "error");
        syncTelegramSetupVisibility();
        return false;
      }
    }
    return true;
  } catch (error) {
    if (requestId !== telegramTokenValidationRequestId) return false;

    telegramValidatedToken = "";
    telegramTokenValidationState = error.invalidToken ? "invalid" : "error";
    setTelegramTokenStatus(
      error.invalidToken
        ? "Token 无效，请检查后重新输入。"
        : `暂时无法验证 Token：${error.message || "请检查网络后重试"}`,
      telegramTokenValidationState
    );
    syncTelegramSetupVisibility();

    if (error.invalidToken) {
      const saved = await chrome.storage.local.get({ telegramBotToken: "" });
      if (requestId === telegramTokenValidationRequestId
          && String(saved.telegramBotToken || "").trim() === token) {
        await chrome.storage.local.set({ telegramBotToken: "" });
      }
    }
    return false;
  }
}

function scheduleTelegramConfigSave({ silent = false } = {}) {
  window.clearTimeout(telegramConfigSaveTimer);
  telegramConfigSaveTimer = window.setTimeout(() => {
    telegramConfigSaveTimer = 0;
    saveTelegramConfig({ silent });
  }, 450);
}

async function saveTelegramConfig({ silent = false } = {}) {
  window.clearTimeout(telegramConfigSaveTimer);
  telegramConfigSaveTimer = 0;
  const enabled = document.querySelector("#telegramMessageNotificationsEnabled").checked;
  const postsEnabled = document.querySelector("#telegramPostNotificationsEnabled").checked;
  const mentionEnabled = document.querySelector("#telegramMentionNotificationsEnabled").checked;
  const replyEnabled = document.querySelector("#telegramReplyNotificationsEnabled").checked;
  const systemFollowEnabled = document.querySelector("#telegramSystemFollowNotificationsEnabled").checked;
  const systemFeedEnabled = document.querySelector("#telegramSystemFeedNotificationsEnabled").checked;
  const systemLikeEnabled = document.querySelector("#telegramSystemLikeNotificationsEnabled").checked;
  const token = document.querySelector("#telegramBotToken").value.trim();
  if (token && (telegramTokenValidationState !== "valid" || token !== telegramValidatedToken)) {
    if (!silent) showToast("请先验证 Bot Token", "error");
    return false;
  }
  try {
    await chrome.storage.local.set({
      telegramMessageNotificationsEnabled: enabled,
      telegramPostNotificationsEnabled: postsEnabled,
      telegramMentionNotificationsEnabled: mentionEnabled,
      telegramReplyNotificationsEnabled: replyEnabled,
      telegramSystemFollowNotificationsEnabled: systemFollowEnabled,
      telegramSystemFeedNotificationsEnabled: systemFeedEnabled,
      telegramSystemLikeNotificationsEnabled: systemLikeEnabled,
      telegramBotToken: token,
      telegramTargets,
      telegramKeywordRules,
      telegramBlockedKeywords: parseTelegramTextList(document.querySelector("#telegramBlockedKeywords").value),
      telegramBoardSlugs: getSelectedTelegramBoards()
    });
    if (!silent) showToast("保存成功");
    return true;
  } catch (error) {
    showToast(formatToastError(error, "保存 Telegram 配置失败"), "error");
    return false;
  }
}

async function saveTelegramMonitorInterval() {
  const select = document.querySelector("#telegramMonitorIntervalSeconds");
  const intervalSeconds = Number(select.value);
  if (![10, 30, 60, 300, 900].includes(intervalSeconds)) {
    showToast("请选择有效的检查间隔", "error");
    return;
  }
  try {
    await chrome.storage.local.set({ telegramMonitorIntervalSeconds: intervalSeconds });
    showToast(`检查间隔已设为${intervalSeconds < 60 ? `${intervalSeconds} 秒` : `${intervalSeconds / 60} 分钟`}`);
  } catch (error) {
    showToast(formatToastError(error, "保存检查间隔失败"), "error");
  }
}

async function sendTelegramTest(event) {
  const button = event.currentTarget;
  const targetId = button.dataset.telegramTargetTest;
  if (!targetId || !await saveTelegramConfig({ silent: true })) return;
  button.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: "telegram:test", payload: { targetId } });
    if (!response?.ok) throw new Error(response?.error || "发送测试通知失败");
    showToast("测试通知已发送");
  } catch (error) {
    showToast(formatToastError(error, "发送测试通知失败"), "error");
  } finally {
    button.disabled = false;
  }
}

async function openTelegramBot() {
  if (!await saveTelegramConfig({ silent: true })) return;
  try {
    await chrome.storage.local.set({
      telegramPendingPersonalTargetName: document.querySelector("#telegramTargetName").value.trim() || "个人聊天"
    });
    const response = await chrome.runtime.sendMessage({ type: "telegram:openBot" });
    if (!response?.ok) throw new Error(response?.error || "无法打开 Telegram 机器人");
    showToast("已打开机器人，点击 Telegram 中的 Start 即可添加目标");
  } catch (error) {
    showToast(formatToastError(error, "打开 Telegram 机器人失败"), "error");
  }
}

async function addTelegramTarget() {
  const type = "direct";
  const channelInput = document.querySelector("#telegramTargetChatId").value.trim();
  const channelChatId = type === "direct" ? normalizeTelegramChannelInput(channelInput) : "";
  const selectedTopic = type === "direct" ? selectedTelegramDirectTopic : null;
  const chatId = type === "direct" ? String(selectedTopic?.chatId || "") : channelInput;
  const topicId = type === "direct" ? String(selectedTopic?.topicId || "") : "";
  const name = document.querySelector("#telegramTargetName").value.trim()
    || (type === "direct" ? selectedTopic?.topicUser || "频道 Direct" : "个人聊天");
  if (type === "direct" && !channelChatId) {
    showToast("请填写频道公开分享链接，例如 https://t.me/channel", "error");
    return;
  }
  if (type === "direct" && !selectedTopic) {
    showToast("读取并选择一个通知接收对话", "error");
    return;
  }
  if (type === "direct" && selectedTopic.sourceChannel !== normalizeTelegramChannelInput(channelChatId)) {
    showToast("频道链接已更改，请重新读取接收对话", "error");
    return;
  }
  if (telegramTargets.some((target) => target.type === "direct"
    && String(target.chatId) === chatId && String(target.topicId) === topicId)) {
    showToast("这个接收对话已经添加", "error");
    return;
  }
  if (telegramTargets.length >= 10) {
    showToast("最多添加 10 个推送目标", "error");
    return;
  }
  telegramTargets.push({
    id: crypto.randomUUID(),
    name,
    type,
    chatId,
    topicId: type === "direct" ? topicId : "",
    channelChatId: type === "direct" ? channelChatId : "",
    enabled: true
  });
  document.querySelector("#telegramTargetName").value = "NodeSeeker 通知";
  const remainingTopics = telegramDirectTopics.filter((topic) => !telegramTargets.some((target) => target.type === "direct"
    && String(target.chatId) === String(topic.chatId) && String(target.topicId) === String(topic.topicId)));
  telegramDirectTopics = remainingTopics;
  selectedTelegramDirectTopic = null;
  renderTelegramDirectTopicMenu();
  document.querySelector("#telegramDirectTopicPickerLabel").textContent = remainingTopics.length > 0
    ? `选择另一个会话（${remainingTopics.length}）`
    : telegramDirectNextOffset != null ? "继续读取下一批接收对话" : "读取可用接收对话";
  document.querySelector("#telegramDirectTopicMenu").hidden = true;
  document.querySelector("#telegramDirectTopicPickerButton").setAttribute("aria-expanded", "false");
  renderTelegramTargets();
  syncTelegramTargetFields();
  if (await saveTelegramConfig({ silent: true })) showToast("接收目标已添加");
}

async function handleTelegramTargetListClick(event) {
  const testButton = event.target.closest("[data-telegram-target-test]");
  if (testButton) {
    await sendTelegramTest({ currentTarget: testButton });
    return;
  }
  const button = event.target.closest("[data-remove-telegram-target]");
  if (!button) return;
  telegramTargets = telegramTargets.filter((target) => target.id !== button.dataset.removeTelegramTarget);
  renderTelegramTargets();
  const saved = await saveTelegramConfig({ silent: true });
  if (saved) showToast("推送目标已删除并保存成功");
}

async function handleTelegramTargetEnabledChange(event) {
  const input = event.target.closest("[data-telegram-target-enabled]");
  if (!input) return;
  const target = telegramTargets.find((item) => item.id === input.dataset.telegramTargetEnabled);
  if (!target) return;
  target.enabled = input.checked;
  await saveTelegramConfig();
  renderTelegramTargets();
}

function renderTelegramTargets() {
  const list = document.querySelector("#telegramTargetList");
  list.replaceChildren();
  if (telegramTargets.length === 0) {
    const empty = document.createElement("li");
    empty.className = "config-description telegram-target-empty";
    empty.textContent = "还没有添加接收目标。";
    list.appendChild(empty);
    syncTelegramSetupVisibility();
    return;
  }
  telegramTargets.forEach((target) => {
    const item = document.createElement("li");
    item.className = "telegram-target-item";
    item.classList.toggle("is-disabled", target.enabled === false);
    const label = document.createElement("span");
    label.textContent = target.type === "direct"
      ? `${target.name} · 频道 Direct`
      : `${target.name} · 个人聊天`;
    const controls = document.createElement("div");
    controls.className = "telegram-target-controls";
    const toggleLabel = document.createElement("label");
    toggleLabel.className = "telegram-target-toggle";
    const toggleStatus = document.createElement("span");
    toggleStatus.textContent = target.enabled === false ? "已关闭" : "已开启";
    const toggleSwitch = document.createElement("span");
    toggleSwitch.className = "switch switch-small";
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "switch-input";
    toggle.checked = target.enabled !== false;
    toggle.dataset.telegramTargetEnabled = target.id;
    toggle.setAttribute("role", "switch");
    toggle.setAttribute("aria-label", `启用${target.name}通知`);
    const track = document.createElement("span");
    track.className = "switch-track";
    track.setAttribute("aria-hidden", "true");
    toggleSwitch.append(toggle, track);
    toggleLabel.append(toggleStatus, toggleSwitch);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "移除";
    remove.dataset.removeTelegramTarget = target.id;
    const test = document.createElement("button");
    test.type = "button";
    test.textContent = "测试";
    test.dataset.telegramTargetTest = target.id;
    controls.append(test, toggleLabel, remove);
    item.append(label, controls);
    list.appendChild(item);
  });
  syncTelegramSetupVisibility();
}

function syncTelegramTargetFields() {
  const isDirect = document.querySelector("#telegramTargetType").value === "direct";
  document.querySelector("#telegramDirectFields").hidden = !isDirect;
  document.querySelector("#openTelegramBot").hidden = isDirect;
}

function syncTelegramSetupVisibility() {
  const token = document.querySelector("#telegramBotToken").value.trim();
  const hasValidToken = telegramTokenValidationState === "valid"
    && Boolean(token)
    && token === telegramValidatedToken;
  document.querySelector("#telegramProtectedSettings").hidden = !hasValidToken;
  document.querySelector("#telegramTargetDependentSettings").hidden = !hasValidToken
    || !telegramTargets.some((target) => String(target?.chatId || "").trim());
}

function setTelegramTokenStatus(message, state = "") {
  const status = document.querySelector("#telegramTokenStatus");
  status.textContent = message;
  status.dataset.state = state;
  status.hidden = !message;
}

function normalizeTelegramChannelInput(value) {
  const input = String(value || "").trim();
  if (/^-100\d+$/.test(input)) return input;

  const usernameMatch = input.match(/^@?([a-z][a-z0-9_]{4,31})$/i);
  if (usernameMatch) return usernameMatch[1].toLocaleLowerCase();

  let url;
  try {
    const normalizedUrl = /^(?:https?:\/\/)/i.test(input) ? input : `https://${input}`;
    url = new URL(normalizedUrl);
  } catch (_error) {
    return "";
  }
  if (!["t.me", "www.t.me", "telegram.me", "www.telegram.me"].includes(url.hostname.toLocaleLowerCase())) {
    return "";
  }

  let segments = url.pathname.split("/").filter(Boolean);
  if (segments[0]?.toLocaleLowerCase() === "s") segments = segments.slice(1);
  if (segments[0]?.toLocaleLowerCase() === "c" && /^\d+$/.test(segments[1] || "")) {
    return `-100${segments[1]}`;
  }
  const channelUsername = segments[0] || "";
  const sharedUsernameMatch = channelUsername.match(/^([a-z][a-z0-9_]{4,31})$/i);
  return sharedUsernameMatch ? sharedUsernameMatch[1].toLocaleLowerCase() : "";
}

function handleTelegramTargetTypeChange() {
  const isDirect = document.querySelector("#telegramTargetType").value === "direct";
  telegramDirectTopics = [];
  telegramDirectNextOffset = null;
  selectedTelegramDirectTopic = null;
  renderTelegramDirectTopicMenu();
  document.querySelector("#telegramDirectTopicMenu").hidden = true;
  document.querySelector("#telegramDirectTopicPickerButton").setAttribute("aria-expanded", "false");
  document.querySelector("#telegramDirectTopicPickerLabel").textContent = "读取可用接收对话";
  if (isDirect && !document.querySelector("#telegramTargetChatId").value.trim()) {
    const savedTarget = telegramTargets.find((target) => target.type === "direct" && target.channelChatId);
    if (savedTarget) document.querySelector("#telegramTargetChatId").value = savedTarget.channelChatId;
  }
  syncTelegramTargetFields();
}

function handleTelegramChannelInput() {
  if (document.querySelector("#telegramTargetType").value !== "direct") return;
  telegramDirectTopics = [];
  telegramDirectNextOffset = null;
  selectedTelegramDirectTopic = null;
  renderTelegramDirectTopicMenu();
  document.querySelector("#telegramDirectTopicMenu").hidden = true;
  document.querySelector("#telegramDirectTopicPickerButton").setAttribute("aria-expanded", "false");
  document.querySelector("#telegramDirectTopicPickerLabel").textContent = "读取可用接收对话";
}

async function ensureTelegramPersonalTarget(value, targetName = "个人聊天", notify = false) {
  const chatId = String(value || "").trim();
  if (!chatId) return;
  const stored = await chrome.storage.local.get({ telegramTargets: [] });
  telegramTargets = normalizeTelegramTargets(stored.telegramTargets);
  let added = false;
  if (!telegramTargets.some((target) => target.type === "personal" && target.chatId === chatId)) {
    if (telegramTargets.length >= 10) {
      if (notify) showToast("推送目标已满，无法添加这个聊天", "error");
      return;
    }
    telegramTargets.push({
      id: crypto.randomUUID(),
      name: String(targetName || "个人聊天").trim().slice(0, 40) || "个人聊天",
      type: "personal",
      chatId,
      topicId: "",
      channelChatId: "",
      enabled: true
    });
    added = true;
  }
  await chrome.storage.local.set({ telegramTargets });
  await chrome.storage.local.remove(["telegramPendingPersonalChatId", "telegramPendingPersonalTargetName"]);
  renderTelegramTargets();
  if (notify) showToast(added ? "已收到 /start，接收目标已添加" : "这个聊天已在推送目标中");
}

async function applyTelegramDetectedChatId(message) {
  await restoreTelegramConfig();
  if (message?.targetAdded === false) {
    if (message.alreadyExists) {
      showToast("这个聊天已在推送目标中");
      return;
    }
    showToast(message.error || "已收到 /start，但无法添加接收目标", "error");
    return;
  }
  showToast("已收到 /start，接收目标已添加");
}

async function toggleTelegramDirectTopicPicker() {
  const menu = document.querySelector("#telegramDirectTopicMenu");
  if (!menu.hidden) {
    menu.hidden = true;
    document.querySelector("#telegramDirectTopicPickerButton").setAttribute("aria-expanded", "false");
    return;
  }
  if (telegramDirectTopics.length > 0 || telegramDirectNextOffset != null) {
    menu.hidden = false;
    document.querySelector("#telegramDirectTopicPickerButton").setAttribute("aria-expanded", "true");
    return;
  }
  await loadTelegramDirectTopics();
}

async function loadTelegramDirectTopics({ nextPage = false } = {}) {
  const button = document.querySelector("#telegramDirectTopicPickerButton");
  const channelInput = document.querySelector("#telegramTargetChatId").value.trim();
  const channelChatId = normalizeTelegramChannelInput(channelInput);
  if (!channelChatId) {
    showToast("先填写频道公开分享链接，例如 https://t.me/channel", "error");
    return;
  }
  if (!nextPage) {
    telegramDirectTopics = [];
    telegramDirectNextOffset = null;
  }
  button.disabled = true;
  document.querySelector("#telegramDirectTopicPickerLabel").textContent = "正在读取会话…";
  document.querySelector("#telegramDirectTopicMenu").hidden = true;
  button.setAttribute("aria-expanded", "false");
  try {
    const response = await chrome.runtime.sendMessage({
      type: "telegram:detectDirectTopicId",
      payload: {
        chatId: channelChatId,
        offset: nextPage ? telegramDirectNextOffset : null
      }
    });
    if (!response?.ok) throw new Error(response?.error || "读取 Direct 会话失败");
    const newTopics = (Array.isArray(response.result?.topics) ? response.result.topics : [])
      .map((topic) => ({ ...topic, sourceChannel: normalizeTelegramChannelInput(channelChatId) }));
    const existingKeys = new Set(telegramDirectTopics.map((topic) => `${topic.chatId}:${topic.topicId}`));
    const uniqueNewTopics = newTopics.filter((topic) => !existingKeys.has(`${topic.chatId}:${topic.topicId}`));
    telegramDirectTopics = [...uniqueNewTopics, ...telegramDirectTopics];
    telegramDirectNextOffset = response.result?.nextOffset ?? null;
    if (telegramDirectTopics.length === 0 && telegramDirectNextOffset == null) {
      throw new Error(response.result?.message || "没有找到接收对话。请使用频道创建者以外的 Telegram 账号打开频道分享链接，向频道 Direct 发一条消息后重新读取。");
    }
    selectedTelegramDirectTopic = null;
    renderTelegramDirectTopicMenu();
    document.querySelector("#telegramDirectTopicPickerLabel").textContent = telegramDirectTopics.length > 0
      ? "选择通知接收对话"
      : "没有找到接收对话";
    document.querySelector("#telegramDirectTopicMenu").hidden = false;
    button.setAttribute("aria-expanded", "true");
    if (telegramDirectTopics.length === 0) showToast(response.result?.message || "没有找到接收对话");
  } catch (error) {
    if (!nextPage) {
      telegramDirectTopics = [];
      telegramDirectNextOffset = null;
      selectedTelegramDirectTopic = null;
    }
    renderTelegramDirectTopicMenu();
    const canContinue = telegramDirectTopics.length > 0 || telegramDirectNextOffset != null;
    document.querySelector("#telegramDirectTopicMenu").hidden = !canContinue;
    button.setAttribute("aria-expanded", String(canContinue));
    document.querySelector("#telegramDirectTopicPickerLabel").textContent = telegramDirectTopics.length > 0
      ? "选择通知接收对话"
      : "选择通知接收对话";
    showToast(formatToastError(error, "请检查频道分享链接，并确认频道创建者以外的 Telegram 账号已向频道 Direct 发过消息"), "error");
  } finally {
    button.disabled = false;
  }
}

function renderTelegramDirectTopicMenu() {
  const menu = document.querySelector("#telegramDirectTopicMenu");
  menu.replaceChildren();
  if (telegramDirectTopics.length > 0 || telegramDirectNextOffset != null) {
    const refresh = document.createElement("button");
    refresh.type = "button";
    refresh.className = "telegram-direct-topic-refresh";
    refresh.dataset.nextTelegramDirectTopics = "true";
    refresh.textContent = "读取下一批（最多 100 条更新）";
    menu.appendChild(refresh);
  }
  telegramDirectTopics.forEach((topic) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "telegram-direct-topic-option";
    option.setAttribute("role", "option");
    option.dataset.directTopicKey = `${topic.chatId}:${topic.topicId}`;
    option.textContent = topic.topicUser
      || (topic.topicUsername ? `@${topic.topicUsername}` : "Direct 会话");
    menu.appendChild(option);
  });
}

async function handleTelegramDirectTopicMenuClick(event) {
  if (event.target.closest("[data-next-telegram-direct-topics]")) {
    loadTelegramDirectTopics({ nextPage: true });
    return;
  }
  const option = event.target.closest("[data-direct-topic-key]");
  if (!option) return;
  selectedTelegramDirectTopic = telegramDirectTopics.find((topic) =>
    `${topic.chatId}:${topic.topicId}` === option.dataset.directTopicKey) || null;
  if (!selectedTelegramDirectTopic) return;
  document.querySelector("#telegramDirectTopicPickerLabel").textContent =
    selectedTelegramDirectTopic.topicUser
      || (selectedTelegramDirectTopic.topicUsername ? `@${selectedTelegramDirectTopic.topicUsername}` : "Direct 会话");
  document.querySelector("#telegramDirectTopicMenu").hidden = true;
  document.querySelector("#telegramDirectTopicPickerButton").setAttribute("aria-expanded", "false");
  await addTelegramTarget();
}

function closeTelegramDirectTopicMenuOutside(event) {
  const picker = document.querySelector("#telegramDirectTopicPickerField");
  if (picker.contains(event.target)) return;
  document.querySelector("#telegramDirectTopicMenu").hidden = true;
  document.querySelector("#telegramDirectTopicPickerButton").setAttribute("aria-expanded", "false");
}

function parseTelegramKeywordRules(value) {
  return String(value || "").split(/\r?\n/)
    .map((line) => line.split(/[,，\s]+|和/g).map((term) => term.trim()).filter(Boolean))
    .filter((terms) => terms.length > 0)
    .map((terms) => ({ terms, enabled: true }));
}

function normalizeTelegramKeywordRules(value) {
  if (!Array.isArray(value)) return [];
  return value.map((rule) => {
    const terms = (Array.isArray(rule?.terms) ? rule.terms : [])
      .map((term) => String(term || "").trim()).filter(Boolean);
    if (terms.length === 0) return null;
    return {
      id: String(rule.id || crypto.randomUUID()),
      terms,
      mode: rule.mode === "all" ? "all" : "any",
      excludeTerms: parseTelegramTextList(rule.excludeTerms),
      enabled: rule.enabled !== false
    };
  }).filter(Boolean);
}

function addTelegramKeywordRule() {
  const input = document.querySelector("#telegramKeywordInput");
  const mode = document.querySelector("#telegramKeywordMode").value === "any" ? "any" : "all";
  const excludeTerms = parseTelegramTextList(document.querySelector("#telegramKeywordExcludeInput").value);
  const additions = parseTelegramKeywordRules(input.value).map((rule) => ({
    ...rule,
    mode,
    excludeTerms
  }));
  if (additions.length === 0) return;
  const editingRule = telegramKeywordRules.find((rule) => rule.id === telegramKeywordEditingRuleId);
  if (editingRule && additions.length !== 1) {
    showToast("编辑时一次只能修改一条规则", "error");
    return;
  }
  const hasConflictingTerms = additions.some((rule) => {
    const excluded = new Set(rule.excludeTerms.map((term) => term.toLocaleLowerCase()));
    return rule.terms.some((term) => excluded.has(term.toLocaleLowerCase()));
  });
  if (hasConflictingTerms) {
    showToast("同一关键词不能同时作为命中词和排除词", "error");
    return;
  }
  if (editingRule) {
    const duplicate = telegramKeywordRules.some((rule) => {
      return rule.id !== editingRule.id
        && getTelegramKeywordRuleIdentity(rule) === getTelegramKeywordRuleIdentity(additions[0]);
    });
    if (duplicate) {
      showToast("相同规则已存在", "error");
      return;
    }
    Object.assign(editingRule, {
      terms: additions[0].terms,
      mode: additions[0].mode,
      excludeTerms: additions[0].excludeTerms
    });
  } else {
    const existing = new Set(telegramKeywordRules.map(getTelegramKeywordRuleIdentity));
    additions.forEach((rule) => {
      const key = getTelegramKeywordRuleIdentity(rule);
      if (!existing.has(key)) {
        telegramKeywordRules.push({ ...rule, id: crypto.randomUUID(), enabled: true });
        existing.add(key);
      }
    });
  }
  setTelegramKeywordEditingRule(null);
  renderTelegramKeywordRules();
  persistTelegramKeywordRules();
}

function setTelegramKeywordEditingRule(rule) {
  telegramKeywordEditingRuleId = rule?.id || "";
  document.querySelector("#telegramKeywordInput").value = rule?.terms.join(", ") || "";
  document.querySelector("#telegramKeywordExcludeInput").value = rule?.excludeTerms.join(", ") || "";
  document.querySelector("#telegramKeywordMode").value = rule?.mode === "any" ? "any" : "all";
  const button = document.querySelector("#addTelegramKeyword");
  button.textContent = rule ? "修改" : "添加";
  button.title = rule ? "保存对这条规则的修改" : "添加关键词规则";
}

function getTelegramKeywordRuleIdentity(rule) {
  return JSON.stringify({
    terms: rule.terms.map((term) => term.toLocaleLowerCase()),
    mode: rule.mode,
    excludeTerms: rule.excludeTerms.map((term) => term.toLocaleLowerCase())
  });
}

function renderTelegramKeywordRules() {
  const list = document.querySelector("#telegramKeywordRuleList");
  list.replaceChildren();
  telegramKeywordRules.forEach((rule) => {
    const item = document.createElement("li");
    item.className = `telegram-keyword-rule is-editable${rule.enabled ? " is-enabled" : " is-disabled"}${rule.excludeTerms.length ? " has-exclusions" : ""}${rule.id === telegramKeywordEditingRuleId ? " is-editing" : ""}`;
    item.dataset.telegramRuleId = rule.id;
    item.title = "点击卡片编辑规则";
    const enabledLabel = document.createElement("label");
    enabledLabel.className = "telegram-keyword-toggle";
    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.checked = rule.enabled;
    enabled.dataset.telegramRuleToggle = "1";
    enabled.setAttribute("aria-label", `启用规则 ${rule.terms.join("、")}`);
    enabledLabel.append(enabled, document.createTextNode(rule.enabled ? "监控中" : "已暂停"));
    const tags = document.createElement("div");
    tags.className = "telegram-keyword-tags";
    rule.terms.forEach((term, index) => {
      if (index > 0) {
        const joiner = document.createElement("span");
        joiner.className = "telegram-keyword-joiner";
        joiner.textContent = rule.mode === "all" ? "且" : "或";
        tags.appendChild(joiner);
      }
      const tag = document.createElement("span");
      tag.className = "telegram-keyword-tag";
      tag.textContent = term;
      tags.appendChild(tag);
    });
    if (rule.excludeTerms.length > 0) {
      const excludes = document.createElement("div");
      excludes.className = "telegram-keyword-excludes";
      const label = document.createElement("span");
      label.textContent = "排除：";
      excludes.appendChild(label);
      rule.excludeTerms.forEach((term) => {
        const tag = document.createElement("span");
        tag.className = "telegram-keyword-exclude-tag";
        tag.textContent = term;
        excludes.appendChild(tag);
      });
      item.appendChild(excludes);
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "telegram-keyword-remove";
    remove.dataset.removeTelegramRule = rule.id;
    remove.textContent = "删除";
    item.append(enabledLabel, tags, remove);
    list.appendChild(item);
  });
  if (telegramKeywordRules.length === 0) {
    const empty = document.createElement("li");
    empty.className = "config-description telegram-keyword-empty";
    empty.textContent = "暂无规则。添加规则后，可单独启用或暂停。";
    list.appendChild(empty);
  }
}

function handleTelegramKeywordRuleChange(event) {
  const input = event.target.closest("[data-telegram-rule-toggle]");
  const item = input?.closest("[data-telegram-rule-id]");
  const rule = telegramKeywordRules.find((entry) => entry.id === item?.dataset.telegramRuleId);
  if (!rule) return;
  rule.enabled = input.checked;
  renderTelegramKeywordRules();
  persistTelegramKeywordRules();
}

function handleTelegramKeywordRuleClick(event) {
  const button = event.target.closest("[data-remove-telegram-rule]");
  if (button) {
    const removedRuleId = button.dataset.removeTelegramRule;
    telegramKeywordRules = telegramKeywordRules.filter((rule) => rule.id !== removedRuleId);
    if (telegramKeywordEditingRuleId === removedRuleId) setTelegramKeywordEditingRule(null);
    renderTelegramKeywordRules();
    persistTelegramKeywordRules();
    return;
  }
  if (event.target.closest("button, input, label")) return;
  const item = event.target.closest("[data-telegram-rule-id]");
  const rule = telegramKeywordRules.find((entry) => entry.id === item?.dataset.telegramRuleId);
  if (!rule) return;
  setTelegramKeywordEditingRule(rule);
  renderTelegramKeywordRules();
  document.querySelector("#telegramKeywordInput").focus();
}

async function persistTelegramKeywordRules() {
  try {
    await chrome.storage.local.set({ telegramKeywordRules });
    showToast("保存成功");
  } catch (error) {
    showToast(formatToastError(error, "保存关键词规则失败"), "error");
  }
}

function getSelectedTelegramBoards() {
  return Array.from(document.querySelectorAll("[data-telegram-board]:checked"))
    .map((input) => input.value);
}

function parseTelegramTextList(value) {
  return [...new Set(String(value || "").split(/[,，\s]+|和/g).map((term) => term.trim()).filter(Boolean))];
}

function normalizeTelegramTargets(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((target) => target && typeof target === "object" && target.chatId)
    .slice(0, 10)
    .map((target) => ({
      id: String(target.id || crypto.randomUUID()),
      name: String(target.name || "Telegram 目标").slice(0, 40),
      type: target.type === "direct" ? "direct" : "personal",
      chatId: String(target.chatId).trim(),
      topicId: String(target.topicId || "").trim(),
      channelChatId: String(target.channelChatId || "").trim(),
      enabled: target.enabled !== false
    }));
}

async function toggleTelegramPause() {
  const state = await chrome.storage.local.get({ telegramMonitorPaused: false });
  await chrome.storage.local.set({ telegramMonitorPaused: !state.telegramMonitorPaused });
  await restoreTelegramConfig();
  showToast("保存成功");
}

async function toggleTelegramOfflineMessageSync() {
  const state = await chrome.storage.local.get({ telegramOfflineMessageSyncEnabled: true });
  const enabled = state.telegramOfflineMessageSyncEnabled === false;
  await chrome.storage.local.set({ telegramOfflineMessageSyncEnabled: enabled });
  renderTelegramOfflineMessageSync({ telegramOfflineMessageSyncEnabled: enabled });
  showToast("保存成功");
}

function renderTelegramOfflineMessageSync(config) {
  const enabled = config.telegramOfflineMessageSyncEnabled !== false;
  const button = document.querySelector("#toggleTelegramOfflineMessageSync");
  button.classList.toggle("is-monitoring", enabled);
  button.classList.toggle("is-paused", !enabled);
  button.setAttribute("aria-checked", String(enabled));
  button.setAttribute("aria-label", `离线消息：${enabled ? "已开启" : "已关闭"}`);
  button.title = enabled
    ? "浏览器重新启动后补发离线期间的新私信"
    : "浏览器重新启动后跳过离线期间的新私信";
}

async function toggleTelegramSilentPush() {
  const state = await chrome.storage.local.get({ telegramSilentPushEnabled: false });
  const enabled = state.telegramSilentPushEnabled !== true;
  await chrome.storage.local.set({ telegramSilentPushEnabled: enabled });
  renderTelegramSilentPush({ telegramSilentPushEnabled: enabled });
  showToast("保存成功");
}

function renderTelegramSilentPush(config) {
  const enabled = config.telegramSilentPushEnabled === true;
  const button = document.querySelector("#toggleTelegramSilentPush");
  button.classList.toggle("is-monitoring", enabled);
  button.setAttribute("aria-checked", String(enabled));
  button.setAttribute("aria-label", `静音通知：${enabled ? "已开启" : "已关闭"}`);
  button.title = enabled
    ? "已开启强制静音，所有推送都不播放提示音"
    : "关闭强制静音；前台显示 NodeSeek 时仍按原逻辑静音";
}

function renderTelegramMonitorStatus(config) {
  const paused = Boolean(config.telegramMonitorPaused);
  const card = document.querySelector("#telegramMonitorStatusCard");
  const button = document.querySelector("#toggleTelegramPause");
  card.classList.toggle("is-monitoring", !paused);
  card.classList.toggle("is-paused", paused);
  button.classList.toggle("is-monitoring", !paused);
  button.classList.toggle("is-paused", paused);
  button.setAttribute("aria-checked", String(!paused));
  button.setAttribute("aria-label", `监控状态：${paused ? "已关闭" : "已开启"}`);
  button.title = paused ? "点击开启监控" : "点击关闭监控";
}

function renderTelegramHistory(history) {
  const list = document.querySelector("#telegramRssHistory");
  const actions = document.querySelector(".telegram-history-actions");
  list.replaceChildren();
  const entries = Array.isArray(history) ? history.slice(0, 20) : [];
  actions.hidden = entries.length === 0;
  if (entries.length === 0) {
    selectedTelegramHistoryKeys.clear();
    const empty = document.createElement("li");
    empty.className = "config-description";
    empty.textContent = "暂无推送记录";
    list.appendChild(empty);
    updateTelegramHistoryActions();
    return;
  }
  entries.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "telegram-history-item";
    const key = getTelegramHistoryKey(entry, index);
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedTelegramHistoryKeys.has(key);
    checkbox.dataset.telegramHistoryKey = key;
    checkbox.setAttribute("aria-label", `选择${entry.title || "推送记录"}`);
    const checkWrap = document.createElement("label");
    checkWrap.className = "telegram-history-check";
    checkWrap.append(checkbox);
    const link = document.createElement("a");
    try {
      const url = new URL(entry.link);
      if (url.origin !== "https://www.nodeseek.com") throw new Error("invalid host");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noreferrer";
    } catch (_error) {
      link.removeAttribute("href");
    }
    link.textContent = `${entry.title || "NodeSeek 帖子"} · ${entry.notifiedAt ? new Date(entry.notifiedAt).toLocaleString() : ""}`;
    item.append(checkWrap, link);
    list.appendChild(item);
  });
  updateTelegramHistoryActions();
}

function getTelegramHistoryKey(entry) {
  return `${String(entry?.link || "")}|${String(entry?.notifiedAt || "")}|${String(entry?.title || "")}`;
}

function updateTelegramHistoryActions() {
  document.querySelector("#telegramHistoryDeleteSelected").disabled = selectedTelegramHistoryKeys.size === 0;
}

function handleTelegramHistorySelectionChange(event) {
  const checkbox = event.target.closest("[data-telegram-history-key]");
  if (!checkbox) return;
  if (checkbox.checked) selectedTelegramHistoryKeys.add(checkbox.dataset.telegramHistoryKey);
  else selectedTelegramHistoryKeys.delete(checkbox.dataset.telegramHistoryKey);
  updateTelegramHistoryActions();
}

async function selectAllTelegramHistory() {
  const stored = await chrome.storage.local.get({ telegramRssHistory: [] });
  selectedTelegramHistoryKeys = new Set((Array.isArray(stored.telegramRssHistory) ? stored.telegramRssHistory : [])
    .slice(0, 20).map((entry) => getTelegramHistoryKey(entry)));
  renderTelegramHistory(stored.telegramRssHistory);
}

function clearTelegramHistorySelection() {
  selectedTelegramHistoryKeys.clear();
  chrome.storage.local.get({ telegramRssHistory: [] }).then((stored) => renderTelegramHistory(stored.telegramRssHistory));
}

async function deleteSelectedTelegramHistory() {
  if (selectedTelegramHistoryKeys.size === 0) return;
  const stored = await chrome.storage.local.get({ telegramRssHistory: [] });
  const entries = Array.isArray(stored.telegramRssHistory) ? stored.telegramRssHistory : [];
  const retained = entries.filter((entry) => !selectedTelegramHistoryKeys.has(getTelegramHistoryKey(entry)));
  selectedTelegramHistoryKeys.clear();
  await chrome.storage.local.set({ telegramRssHistory: retained });
  renderTelegramHistory(retained);
}

async function resetTelegramHistory() {
  selectedTelegramHistoryKeys.clear();
  await chrome.storage.local.set({ telegramRssHistory: [] });
  renderTelegramHistory([]);
}

function renderTelegramManagedTopics(value) {
  const list = document.querySelector("#telegramManagedTopics");
  const actions = document.querySelector("#telegramManagedTopicActions");
  const topics = Array.isArray(value) ? value.filter((topic) => topic?.id && topic?.chatId && topic?.topicId) : [];
  const topicIds = new Set(topics.map((topic) => String(topic.id)));
  selectedTelegramManagedTopicIds = new Set([...selectedTelegramManagedTopicIds].filter((id) => topicIds.has(id)));
  list.replaceChildren();
  actions.hidden = topics.length === 0;
  if (topics.length === 0) {
    const empty = document.createElement("li");
    empty.className = "config-description";
    empty.textContent = "暂无由插件创建的对话。";
    list.appendChild(empty);
    updateTelegramManagedTopicActions();
    return;
  }

  [...topics].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).forEach((topic) => {
    const item = document.createElement("li");
    item.className = "telegram-managed-topic-item";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedTelegramManagedTopicIds.has(String(topic.id));
    checkbox.dataset.telegramManagedTopicId = String(topic.id);
    checkbox.setAttribute("aria-label", `选择 Topic ${topic.name || "对话"}`);
    const name = document.createElement("span");
    name.className = "telegram-managed-topic-name";
    name.textContent = String(topic.name || "Telegram 对话");
    item.append(checkbox, name);
    list.appendChild(item);
  });
  updateTelegramManagedTopicActions();
}

function getTelegramManagedTopicEntries(storage) {
  return [
    ...(Array.isArray(storage?.telegramManagedTopics) ? storage.telegramManagedTopics : []),
    ...(Array.isArray(storage?.telegramSettingsTopics) ? storage.telegramSettingsTopics : [])
  ];
}

async function refreshTelegramManagedTopics() {
  const stored = await chrome.storage.local.get({ telegramManagedTopics: [], telegramSettingsTopics: [] });
  renderTelegramManagedTopics(getTelegramManagedTopicEntries(stored));
}

function updateTelegramManagedTopicActions() {
  document.querySelector("#telegramTopicDeleteSelected").disabled = selectedTelegramManagedTopicIds.size === 0;
}

function handleTelegramManagedTopicSelectionChange(event) {
  const checkbox = event.target.closest("[data-telegram-managed-topic-id]");
  if (!checkbox) return;
  if (checkbox.checked) selectedTelegramManagedTopicIds.add(checkbox.dataset.telegramManagedTopicId);
  else selectedTelegramManagedTopicIds.delete(checkbox.dataset.telegramManagedTopicId);
  updateTelegramManagedTopicActions();
}

async function selectAllTelegramManagedTopics() {
  const stored = await chrome.storage.local.get({ telegramManagedTopics: [], telegramSettingsTopics: [] });
  const topics = getTelegramManagedTopicEntries(stored);
  selectedTelegramManagedTopicIds = new Set(topics.map((topic) => String(topic.id)));
  renderTelegramManagedTopics(topics);
}

async function clearTelegramManagedTopicSelection() {
  selectedTelegramManagedTopicIds.clear();
  await refreshTelegramManagedTopics();
}

async function deleteSelectedTelegramManagedTopics() {
  const topicIds = [...selectedTelegramManagedTopicIds];
  if (topicIds.length === 0) return;
  const confirmed = window.confirm(`确定删除选中的 ${topicIds.length} 个 Telegram Topic？Topic 中的消息也会一并删除。`);
  if (!confirmed) return;
  const response = await chrome.runtime.sendMessage({
    type: "telegram:deleteManagedTopics",
    payload: { topicIds }
  });
  if (!response?.ok) {
    showToast(response?.error || "删除 Telegram Topic 失败", "error");
    return;
  }
  const result = response.result || { deleted: 0, failed: [] };
  const stored = await chrome.storage.local.get({ telegramManagedTopics: [], telegramSettingsTopics: [] });
  selectedTelegramManagedTopicIds = new Set((result.failed || []).map((topic) => String(topic.id)));
  renderTelegramManagedTopics(getTelegramManagedTopicEntries(stored));
  if (result.failed?.length) {
    showToast(`已删除 ${result.deleted || 0} 个，${result.failed.length} 个失败：${result.failed.map((topic) => topic.name).join("、")}`, "error");
  } else {
    selectedTelegramManagedTopicIds.clear();
    renderTelegramManagedTopics(getTelegramManagedTopicEntries(stored));
    showToast(`已删除 ${result.deleted || 0} 个 Topic`);
  }
}

async function resetTelegramConfig() {
  const telegramKeys = [
    "telegramMessageNotificationsEnabled", "telegramPostNotificationsEnabled",
    "telegramMentionNotificationsEnabled", "telegramReplyNotificationsEnabled", "telegramMentionReplyNotificationsEnabled",
    "telegramSystemFollowNotificationsEnabled", "telegramSystemFeedNotificationsEnabled", "telegramSystemLikeNotificationsEnabled",
    "telegramMonitorIntervalSeconds", "telegramRssMonitorIntervalSeconds",
    "telegramOfflineMessageSyncEnabled",
    "telegramSilentPushEnabled",
    "telegramBotToken", "telegramTargets",
    "telegramChatId", "telegramKeywordRules", "telegramBlockedKeywords", "telegramBoardSlugs",
    "telegramMessageCursors", "telegramSystemNotificationUserId", "telegramRssSeenIds", "telegramRssInitialized", "telegramRssHistory",
    "telegramManagedTopics", "telegramSettingsTopics", "telegramProcessedTopicUpdateIds", "telegramPendingTopicImageMarkdowns",
    "telegramPendingTopicReadUserIds",
    "telegramMentionReplyCursors",
    "telegramMonitorPaused", "telegramMonitorLastCheck", "telegramMonitorLastError",
    "telegramPendingDirectTopics", "telegramDirectTopicScanUntil",
    "telegramPendingPersonalChatId", "telegramPendingPersonalTargetName",
    "telegramPersonalStartWatchUntil", "telegramPersonalStartWatchSince", "telegramPersonalStartOffset",
    "telegramPersonalStartRepliedUpdateId", "telegramPendingPersonalStartUpdateId"
  ];
  try {
    await chrome.runtime.sendMessage({ type: "telegram:stopPersonalStartWatch" }).catch(() => {});
    await chrome.storage.local.remove(telegramKeys);
    selectedTelegramHistoryKeys.clear();
    selectedTelegramManagedTopicIds.clear();
    document.querySelector("#telegramBotToken").value = "";
    document.querySelector("#telegramTargetName").value = "NodeSeeker 通知";
    document.querySelector("#telegramTargetChatId").value = "";
    document.querySelector("#telegramTargetType").value = "personal";
    document.querySelector("#telegramMessageNotificationsEnabled").checked = true;
    document.querySelector("#telegramPostNotificationsEnabled").checked = true;
    document.querySelector("#telegramMentionNotificationsEnabled").checked = false;
    document.querySelector("#telegramReplyNotificationsEnabled").checked = false;
    document.querySelector("#telegramSystemFollowNotificationsEnabled").checked = false;
    document.querySelector("#telegramSystemFeedNotificationsEnabled").checked = true;
    document.querySelector("#telegramSystemLikeNotificationsEnabled").checked = true;
    document.querySelector("#telegramMonitorIntervalSeconds").value = "30";
    renderTelegramOfflineMessageSync({ telegramOfflineMessageSyncEnabled: true });
    renderTelegramSilentPush({ telegramSilentPushEnabled: false });
    document.querySelector("#telegramBlockedKeywords").value = "";
    document.querySelectorAll("[data-telegram-board]").forEach((input) => { input.checked = true; });
    telegramTargets = [];
    telegramKeywordRules = [];
    setTelegramKeywordEditingRule(null);
    renderTelegramKeywordRules();
    renderTelegramTargets();
    renderTelegramHistory([]);
    renderTelegramManagedTopics([]);
    syncTelegramTargetFields();
    syncTelegramSetupVisibility();
    renderTelegramMonitorStatus({ telegramMonitorPaused: false });
    showToast("Telegram 配置已恢复默认");
  } catch (error) {
    showToast(formatToastError(error, "恢复 Telegram 默认配置失败"), "error");
  }
}

function handleShortcutInputKeyDown(event) {
  if (event.key === "Tab") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (event.key === "Backspace" || event.key === "Delete") {
    const changed = event.currentTarget.value !== "";
    event.currentTarget.value = "";
    if (changed) {
      showPendingSaveToast();
    }
    return;
  }

  const shortcut = normalizeShortcutFromEvent(event);
  if (!shortcut) {
    return;
  }

  const value = formatShortcutForDisplay(shortcut);
  const changed = event.currentTarget.value !== value;
  event.currentTarget.value = value;
  if (changed) {
    showPendingSaveToast();
  }
}

function handleShortcutInputPaste(event) {
  event.preventDefault();
}
