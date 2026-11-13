document.addEventListener("DOMContentLoaded", initOptions);
let telegramTargets = [];
let telegramDirectTopics = [];
let telegramDirectNextOffset = null;
let selectedTelegramDirectTopic = null;
let telegramPersonalStartPollTimer = null;
let telegramPersonalStartWatchUntil = 0;
let telegramKeywordRules = [];
form.addEventListener("submit", saveOptions);
document.querySelector("#grantShortLinkPermissions").addEventListener("click", requestShortLinkPermissions);
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
    telegramMessageNotificationsEnabled: false,
    telegramPostNotificationsEnabled: false,
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
    telegramRssHistory: []
  });
  document.querySelector("#telegramMessageNotificationsEnabled").checked = config.telegramMessageNotificationsEnabled;
  document.querySelector("#telegramPostNotificationsEnabled").checked = config.telegramPostNotificationsEnabled;
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
  renderTelegramHistory(config.telegramRssHistory);
  syncTelegramTargetFields();
  if (config.telegramPendingPersonalChatId && document.querySelector("#telegramTargetType").value === "personal") {
    document.querySelector("#telegramTargetChatId").value = String(config.telegramPendingPersonalChatId);
  }
  syncTelegramPersonalStartPolling(config.telegramPersonalStartWatchUntil);
}

function syncTelegramPersonalStartPolling(watchUntilValue) {
  const watchUntil = Number(watchUntilValue) || 0;
  telegramPersonalStartWatchUntil = watchUntil;
  if (watchUntil > Date.now()) {
    if (telegramPersonalStartPollTimer) return;
    const poll = () => {
      if (telegramPersonalStartWatchUntil <= Date.now()) {
        clearInterval(telegramPersonalStartPollTimer);
        telegramPersonalStartPollTimer = null;
        return;
      }
      chrome.runtime.sendMessage({ type: "telegram:checkPersonalStartWatch" }).catch(() => {});
    };
    poll();
    telegramPersonalStartPollTimer = setInterval(poll, 3000);
    return;
  }
  if (telegramPersonalStartPollTimer) clearInterval(telegramPersonalStartPollTimer);
  telegramPersonalStartPollTimer = null;
}

document.querySelector("#testTelegramConfig").addEventListener("click", sendTelegramTest);
document.querySelector("#openTelegramBot").addEventListener("click", openTelegramBot);
document.querySelector("#addTelegramTarget").addEventListener("click", addTelegramTarget);
document.querySelector("#telegramDirectTopicPickerButton").addEventListener("click", toggleTelegramDirectTopicPicker);
document.querySelector("#telegramDirectTopicMenu").addEventListener("click", handleTelegramDirectTopicMenuClick);
document.querySelector("#telegramBotToken").addEventListener("input", scheduleTelegramConfigSave);
document.querySelector("#telegramMessageNotificationsEnabled").addEventListener("change", scheduleTelegramConfigSave);
document.querySelector("#telegramPostNotificationsEnabled").addEventListener("change", scheduleTelegramConfigSave);
document.querySelector("#telegramBlockedKeywords").addEventListener("input", scheduleTelegramConfigSave);
document.querySelectorAll("[data-telegram-board]").forEach((input) => {
  input.addEventListener("change", scheduleTelegramConfigSave);
});
document.querySelector("#telegramTargetType").addEventListener("change", handleTelegramTargetTypeChange);
document.querySelector("#telegramTargetType").addEventListener("change", fillPendingTelegramPersonalChatId);
document.querySelector("#telegramTargetChatId").addEventListener("input", handleTelegramChannelInput);
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.telegramPersonalStartWatchUntil) {
    syncTelegramPersonalStartPolling(changes.telegramPersonalStartWatchUntil.newValue);
  }
  const chatId = changes.telegramPendingPersonalChatId?.newValue;
  if (chatId && document.querySelector("#telegramTargetType").value === "personal") {
    applyTelegramDetectedChatId(chatId);
  }
});
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "telegram:personalChatIdDetected") {
    applyTelegramDetectedChatId(message.chatId);
  }
  if (message?.type === "telegram:personalStartWatchTimeout") {
    document.querySelector("#telegramTargetChatId").placeholder = "点击上方按钮后等待 /start 自动填入";
    showToast("5 分钟内未收到 /start，监听已停止；请重新点击上方按钮", "error");
  }
  if (message?.type === "telegram:personalStartWatchError") {
    document.querySelector("#telegramTargetChatId").placeholder = "点击上方按钮后等待 /start 自动填入";
    showToast(`监听失败：${message.error || "Telegram 更新读取失败"}`, "error");
  }
  if (message?.type === "telegram:personalChatIdReplyFailed") {
    showToast(`Chat ID 已填入，但机器人回复失败：${message.error || "发送失败"}`, "error");
  }
});
document.querySelector("#telegramTargetList").addEventListener("click", handleTelegramTargetListClick);
document.querySelector("#telegramTargetList").addEventListener("change", handleTelegramTargetEnabledChange);
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

function scheduleTelegramConfigSave() {
  window.clearTimeout(telegramConfigSaveTimer);
  telegramConfigSaveTimer = window.setTimeout(() => {
    telegramConfigSaveTimer = 0;
    saveTelegramConfig();
  }, 450);
}

async function saveTelegramConfig({ allowIncompleteConfig = false } = {}) {
  window.clearTimeout(telegramConfigSaveTimer);
  telegramConfigSaveTimer = 0;
  const enabled = document.querySelector("#telegramMessageNotificationsEnabled").checked;
  const postsEnabled = document.querySelector("#telegramPostNotificationsEnabled").checked;
  const token = document.querySelector("#telegramBotToken").value.trim();
  const enabledTargets = telegramTargets.filter((target) => target.enabled !== false && target.chatId);
  if (!allowIncompleteConfig && (enabled || postsEnabled) && (!token || enabledTargets.length === 0)) {
    showToast("启用通知前请填写 Bot Token 并添加推送目标", "error");
    return false;
  }

  try {
    await chrome.storage.local.set({
      telegramMessageNotificationsEnabled: enabled,
      telegramPostNotificationsEnabled: postsEnabled,
      telegramBotToken: token,
      telegramTargets,
      telegramKeywordRules,
      telegramBlockedKeywords: parseTelegramTextList(document.querySelector("#telegramBlockedKeywords").value),
      telegramBoardSlugs: getSelectedTelegramBoards()
    });
    showToast("保存成功");
    return true;
  } catch (error) {
    showToast(formatToastError(error, "保存 Telegram 配置失败"), "error");
    return false;
  }
}

async function sendTelegramTest() {
  const button = document.querySelector("#testTelegramConfig");
  if (!await saveTelegramConfig()) return;
  button.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: "telegram:test" });
    if (!response?.ok) throw new Error(response?.error || "发送测试通知失败");
    showToast("Telegram 测试通知已发送");
  } catch (error) {
    showToast(formatToastError(error, "发送测试通知失败"), "error");
  } finally {
    button.disabled = false;
  }
}

async function openTelegramBot() {
  if (!await saveTelegramConfig()) return;
  try {
    const response = await chrome.runtime.sendMessage({ type: "telegram:openBot" });
    if (!response?.ok) throw new Error(response?.error || "无法打开 Telegram 机器人");
    document.querySelector("#telegramTargetChatId").placeholder = "正在监听 /start（5 分钟）…";
    showToast("已打开机器人，正在监听 /start（5 分钟）；请在 Telegram 中点击 Start");
  } catch (error) {
    showToast(formatToastError(error, "打开 Telegram 机器人失败"), "error");
  }
}

async function addTelegramTarget() {
  const type = document.querySelector("#telegramTargetType").value;
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
  if (type === "personal" && !chatId) {
    showToast("请填写个人 Chat ID", "error");
    return;
  }
  if (type === "direct" && telegramTargets.some((target) => target.type === "direct"
    && String(target.chatId) === chatId && String(target.topicId) === topicId)) {
    showToast("这个 Direct 会话已经添加", "error");
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
  document.querySelector("#telegramTargetName").value = "";
  const remainingTopics = type === "direct"
    ? telegramDirectTopics.filter((topic) => !telegramTargets.some((target) => target.type === "direct"
      && String(target.chatId) === String(topic.chatId) && String(target.topicId) === String(topic.topicId)))
    : [];
  telegramDirectTopics = remainingTopics;
  selectedTelegramDirectTopic = null;
  renderTelegramDirectTopicMenu();
  document.querySelector("#telegramDirectTopicPickerLabel").textContent = remainingTopics.length > 0
    ? `选择另一个会话（${remainingTopics.length}）`
    : telegramDirectNextOffset != null ? "继续读取下一批接收对话" : "读取可用接收对话";
  document.querySelector("#telegramDirectTopicMenu").hidden = true;
  document.querySelector("#telegramDirectTopicPickerButton").setAttribute("aria-expanded", "false");
  if (type === "personal") document.querySelector("#telegramTargetChatId").value = "";
  renderTelegramTargets();
  syncTelegramTargetFields();
  const saved = await saveTelegramConfig();
  if (saved) {
    if (type === "personal") {
      const pending = await chrome.storage.local.get("telegramPendingPersonalChatId");
      if (String(pending.telegramPendingPersonalChatId || "") === chatId) {
        await chrome.storage.local.remove("telegramPendingPersonalChatId");
      }
    }
    showToast("目标添加并保存成功");
  }
}

async function handleTelegramTargetListClick(event) {
  const button = event.target.closest("[data-remove-telegram-target]");
  if (!button) return;
  telegramTargets = telegramTargets.filter((target) => target.id !== button.dataset.removeTelegramTarget);
  const hasTarget = telegramTargets.some((target) => target.enabled !== false && target.chatId);
  if (!hasTarget) {
    document.querySelector("#telegramMessageNotificationsEnabled").checked = false;
    document.querySelector("#telegramPostNotificationsEnabled").checked = false;
  }
  renderTelegramTargets();
  const saved = await saveTelegramConfig();
  if (saved) showToast(hasTarget ? "目标删除并保存成功" : "目标删除、通知已关闭并保存成功");
}

async function handleTelegramTargetEnabledChange(event) {
  const input = event.target.closest("[data-telegram-target-enabled]");
  if (!input) return;
  const target = telegramTargets.find((item) => item.id === input.dataset.telegramTargetEnabled);
  if (!target) return;
  target.enabled = input.checked;
  await saveTelegramConfig({ allowIncompleteConfig: true });
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
    return;
  }
  telegramTargets.forEach((target) => {
    const item = document.createElement("li");
    item.className = "telegram-target-item";
    item.classList.toggle("is-disabled", target.enabled === false);
    const label = document.createElement("span");
    label.textContent = target.type === "direct"
      ? `${target.name} · 频道 Direct`
      : `${target.name} · 个人聊天 · ${target.chatId}`;
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
    controls.append(toggleLabel, remove);
    item.append(label, controls);
    list.appendChild(item);
  });
}

function syncTelegramTargetFields() {
  const isDirect = document.querySelector("#telegramTargetType").value === "direct";
  document.querySelector("#telegramTargetChatIdLabel").textContent = isDirect
    ? "频道分享链接"
    : "个人 Chat ID";
  document.querySelector("#telegramTargetChatId").placeholder = isDirect
    ? "https://t.me/channel"
    : "点击上方按钮后等待 /start 自动填入";
  document.querySelector("#telegramDirectTopicPickerField").hidden = !isDirect;
  document.querySelector("#telegramPersonalTargetHelp").hidden = isDirect;
  document.querySelector("#telegramDirectTargetHelp").hidden = !isDirect;
  document.querySelector("#telegramPersonalBotStart").hidden = isDirect;
  document.querySelector("#telegramTargetActionHint").textContent = isDirect
    ? "选好接收通知的小号对话后，添加到下方目标列表。"
    : "点上方按钮开始监听；收到 /start 后自动填入 Chat ID。";
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

async function fillPendingTelegramPersonalChatId() {
  if (document.querySelector("#telegramTargetType").value !== "personal") return;
  const config = await chrome.storage.local.get("telegramPendingPersonalChatId");
  const chatId = String(config.telegramPendingPersonalChatId || "");
  if (chatId) document.querySelector("#telegramTargetChatId").value = chatId;
}

function applyTelegramDetectedChatId(value) {
  if (document.querySelector("#telegramTargetType").value !== "personal") return;
  const input = document.querySelector("#telegramTargetChatId");
  const chatId = String(value || "");
  if (!chatId || input.value === chatId) return;
  input.value = chatId;
  showToast("已收到机器人 /start，Chat ID 已自动填入");
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
    document.querySelector("#telegramDirectTopicPickerLabel").textContent =
      telegramDirectTopics.length > 0
        ? `已读取 ${telegramDirectTopics.length} 个会话，点击选择`
        : "本批没有接收对话，可继续读取下一批";
    document.querySelector("#telegramDirectTopicMenu").hidden = false;
    button.setAttribute("aria-expanded", "true");
    showToast(telegramDirectTopics.length > 0
      ? `本次检查 ${response.result?.updatesRead || 0} 条更新，找到 ${telegramDirectTopics.length} 个接收对话`
      : response.result?.message || "本批没有接收对话，可继续读取下一批");
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
      ? `已读取 ${telegramDirectTopics.length} 个会话`
      : "读取失败或本批没有接收对话";
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

function handleTelegramDirectTopicMenuClick(event) {
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
}

function handleTelegramTargetTypeChange() {
  const isDirect = document.querySelector("#telegramTargetType").value === "direct";
  telegramDirectTopics = [];
  telegramDirectNextOffset = null;
  selectedTelegramDirectTopic = null;
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

function closeTelegramDirectTopicMenuOutside(event) {
  const picker = document.querySelector("#telegramDirectTopicPickerField");
  if (picker.contains(event.target)) return;
  document.querySelector("#telegramDirectTopicMenu").hidden = true;
  document.querySelector("#telegramDirectTopicPickerButton").setAttribute("aria-expanded", "false");
}

function parseTelegramKeywordRules(value) {
  return String(value || "").split(/\r?\n/)
    .map((line) => line.split(/[,，]/).map((term) => term.trim()).filter(Boolean))
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
  const hasConflictingTerms = additions.some((rule) => {
    const excluded = new Set(rule.excludeTerms.map((term) => term.toLocaleLowerCase()));
    return rule.terms.some((term) => excluded.has(term.toLocaleLowerCase()));
  });
  if (hasConflictingTerms) {
    showToast("同一关键词不能同时作为命中词和排除词", "error");
    return;
  }
  const existing = new Set(telegramKeywordRules.map(getTelegramKeywordRuleIdentity));
  additions.forEach((rule) => {
    const key = getTelegramKeywordRuleIdentity(rule);
    if (!existing.has(key)) {
      telegramKeywordRules.push({ ...rule, id: crypto.randomUUID(), enabled: true });
      existing.add(key);
    }
  });
  input.value = "";
  document.querySelector("#telegramKeywordExcludeInput").value = "";
  renderTelegramKeywordRules();
  persistTelegramKeywordRules();
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
    item.className = `telegram-keyword-rule${rule.enabled ? " is-enabled" : " is-disabled"}${rule.excludeTerms.length ? " has-exclusions" : ""}`;
    item.dataset.telegramRuleId = rule.id;
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
  if (!button) return;
  telegramKeywordRules = telegramKeywordRules.filter((rule) => rule.id !== button.dataset.removeTelegramRule);
  renderTelegramKeywordRules();
  persistTelegramKeywordRules();
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
  return [...new Set(String(value || "").split(/[\r\n,，]+/).map((term) => term.trim()).filter(Boolean))];
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

function renderTelegramMonitorStatus(config) {
  const status = document.querySelector("#telegramMonitorStatus");
  const enabled = config.telegramMessageNotificationsEnabled || config.telegramPostNotificationsEnabled;
  const targetReady = telegramTargets.some((target) => target.enabled !== false && target.chatId);
  const state = config.telegramMonitorPaused ? "已暂停"
    : enabled && targetReady ? "监控中（浏览器需保持运行）" : "未启用";
  const lastCheck = Number(config.telegramMonitorLastCheck) > 0
    ? new Date(config.telegramMonitorLastCheck).toLocaleString()
    : "尚无检查记录";
  status.textContent = `状态：${state}；上次检查：${lastCheck}${config.telegramMonitorLastError ? `；错误：${config.telegramMonitorLastError}` : ""}`;
  document.querySelector("#toggleTelegramPause").textContent = config.telegramMonitorPaused ? "恢复监控" : "暂停监控";
}

function renderTelegramHistory(history) {
  const list = document.querySelector("#telegramRssHistory");
  list.replaceChildren();
  const entries = Array.isArray(history) ? history.slice(0, 20) : [];
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "config-description";
    empty.textContent = "暂无新帖推送记录";
    list.appendChild(empty);
    return;
  }
  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "telegram-target-item";
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
    item.appendChild(link);
    list.appendChild(item);
  });
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
