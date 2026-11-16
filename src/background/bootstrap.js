discardLegacyStorage();
scheduleLuckyNotificationAlarmSync();
scheduleProfileRetentionPrune();
scheduleTelegramMonitorAlarm();
scheduleAutoAttendanceAlarm();

function scheduleTelegramMonitorForLifecycle({ checkImmediately = false } = {}) {
  return chrome.storage.local.get({ telegramOfflineMessageSyncEnabled: true })
    .then((config) => scheduleTelegramMonitorAlarm({
      resetMessageBaseline: config.telegramOfflineMessageSyncEnabled === false,
      checkImmediately
    }))
    .catch((error) => {
      console.warn("Telegram lifecycle check setup failed:", error?.message || "unknown error");
    });
}

chrome.runtime.onInstalled.addListener((details) => {
  importPreloadedConfiguration()
    .catch((error) => {
      console.warn("Bundled configuration import failed:", error?.message || "unknown error");
    })
    .finally(() => {
      discardLegacyStorage();
      scheduleLuckyNotificationAlarmSync();
      scheduleProfileRetentionPrune();
      scheduleTelegramMonitorForLifecycle({ checkImmediately: details?.reason === "update" });
      scheduleAutoAttendanceAlarm();
    });
});
chrome.runtime.onStartup.addListener(() => {
  discardLegacyStorage();
  scheduleLuckyNotificationAlarmSync();
  scheduleProfileRetentionPrune();
  scheduleTelegramMonitorForLifecycle({ checkImmediately: true });
  scheduleAutoAttendanceAlarm();
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes.luckyNotificationsEnabled) {
    scheduleLuckyNotificationAlarmSync();
  }

  if (changes.profileRetentionDays) {
    scheduleProfileRetentionPrune(true);
  }

  if (changes.autoAttendanceEnabled || changes.autoAttendanceMode) {
    scheduleAutoAttendanceAlarm(Boolean(changes.autoAttendanceEnabled?.newValue));
  }

  if ([
    "telegramBotToken",
    "telegramTargets",
    "telegramManagedTopics",
    "telegramMessageNotificationsEnabled",
    "telegramPostNotificationsEnabled",
    "telegramMentionNotificationsEnabled",
    "telegramReplyNotificationsEnabled",
    "telegramMonitorIntervalSeconds",
    "telegramRssMonitorIntervalSeconds",
    "telegramKeywordRules",
    "telegramBlockedKeywords",
    "telegramBoardSlugs",
    "telegramMonitorPaused",
    "telegramPersonalStartWatchUntil"
  ].some((key) => changes[key])) {
    const shouldCheckNodeSeek = [
      "telegramBotToken",
      "telegramTargets",
      "telegramManagedTopics",
      "telegramMessageNotificationsEnabled",
      "telegramMentionNotificationsEnabled",
      "telegramReplyNotificationsEnabled",
      "telegramKeywordRules",
      "telegramBlockedKeywords",
      "telegramBoardSlugs",
      "telegramMonitorPaused"
    ].some((key) => changes[key]);
    const shouldCheckRss = [
      "telegramBotToken",
      "telegramTargets",
      "telegramPostNotificationsEnabled",
      "telegramKeywordRules",
      "telegramBlockedKeywords",
      "telegramBoardSlugs",
      "telegramRssMonitorIntervalSeconds",
      "telegramMonitorPaused"
    ].some((key) => changes[key]);
    chrome.storage.local.get({
      telegramBotToken: "",
      telegramTargets: [],
      telegramManagedTopics: [],
      telegramMessageNotificationsEnabled: true,
      telegramPostNotificationsEnabled: true,
      telegramMentionNotificationsEnabled: null,
      telegramReplyNotificationsEnabled: null,
      telegramMentionReplyNotificationsEnabled: null,
      telegramMonitorPaused: false
    })
      .then((config) => scheduleTelegramMonitorAlarm(getTelegramBaselineResetOptions(changes, config)))
      .then(() => Promise.all([
        ...(shouldCheckNodeSeek ? [checkTelegramNotifications()] : []),
        ...(shouldCheckRss ? [checkTelegramRssNotifications()] : [])
      ]))
      .catch((error) => {
        console.warn("Telegram alarm setup failed:", error?.message || "unknown error");
      });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === LUCKY_ALARM_NAME) {
    handleLuckyAlarm();
  }
  if (alarm.name === TELEGRAM_MESSAGE_ALARM_NAME) {
    checkTelegramNotifications().catch((error) => {
      console.warn("Telegram monitor failed:", error?.message || "unknown error");
    });
  }
  if (TELEGRAM_FAST_MONITOR_ALARM_NAMES.includes(alarm.name)) {
    checkTelegramNotifications().catch((error) => {
      console.warn("Telegram monitor failed:", error?.message || "unknown error");
    });
  }
  if (alarm.name === TELEGRAM_RSS_ALARM_NAME) {
    checkTelegramRssNotifications().catch((error) => {
      console.warn("Telegram RSS monitor failed:", error?.message || "unknown error");
    });
  }
  if (alarm.name === TELEGRAM_UPDATES_WATCHDOG_ALARM_NAME) {
    ensureTelegramUpdatesLongPoll().catch((error) => {
      console.warn("Telegram long-poll recovery failed:", error?.message || "unknown error");
    });
  }
  if (alarm.name === TELEGRAM_PERSONAL_START_ALARM_NAME) {
    checkTelegramPersonalStartWatch().catch((error) => {
      console.warn("Telegram personal chat setup failed:", error?.message || "unknown error");
    });
  }
  if (alarm.name === AUTO_ATTENDANCE_ALARM_NAME) {
    runAutoAttendance().catch(() => {});
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith(LUCKY_NOTIFICATION_PREFIX)) {
    openLuckyNotification(notificationId);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return false;
  }

  if (message.type === "telegram:validateToken") {
    validateTelegramBotToken(message.payload?.token)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({
        ok: false,
        error: error.message || String(error),
        invalidToken: error.invalidToken === true
      }));
    return true;
  }

  if (message.type === "telegram:test") {
    sendTelegramTestMessage(message.payload?.targetId || "")
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message.type === "telegram:deleteManagedTopics") {
    deleteTelegramManagedTopics(message.payload?.topicIds)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message.type === "telegram:openBot") {
    getTelegramBotLink()
    .then(async (url) => {
      await startTelegramPersonalStartWatch();
      return chrome.tabs.create({ url });
    })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message.type === "telegram:stopPersonalStartWatch") {
    stopTelegramPersonalStartWatch()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message.type === "telegram:detectDirectTopicId") {
    getTelegramDirectTopicId(message.payload?.chatId, message.payload?.offset)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  handleMessage(message)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  return true;
});
