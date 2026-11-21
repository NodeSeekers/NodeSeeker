const TELEGRAM_WORKER_SESSION_KEY = "telegramMonitorWorkerSessionInitialized";

backupRecoveryAtStartup = recoverInterruptedFullBackup();
const telegramMonitorStartupReady = backupRecoveryAtStartup.then(() =>
  runBackgroundOperation(scheduleTelegramMonitorAlarmForWorkerStart));
telegramMonitorStartupReady.catch((error) => {
  console.warn("Telegram worker startup setup failed:", error?.message || "unknown error");
});

backupRecoveryAtStartup.then(() => {
  runBackgroundOperation(discardLegacyStorage).catch(() => {});
  scheduleLuckyNotificationAlarmSync();
  scheduleProfileRetentionPrune();
  runBackgroundOperation(scheduleAutoAttendanceAlarm).catch(() => {});
}).catch((error) => console.error("Backup recovery failed:", error?.message || "unknown error"));

async function scheduleTelegramMonitorAlarmForWorkerStart() {
  const sessionStorage = chrome.storage.session;
  if (!sessionStorage?.get || !sessionStorage?.set) {
    return scheduleTelegramMonitorForLifecycle({ checkImmediately: true });
  }

  const sessionState = await sessionStorage.get({ [TELEGRAM_WORKER_SESSION_KEY]: false });
  if (sessionState[TELEGRAM_WORKER_SESSION_KEY] === true) {
    return scheduleTelegramMonitorAlarm();
  }

  await scheduleTelegramMonitorForLifecycle({ checkImmediately: true });
  await sessionStorage.set({ [TELEGRAM_WORKER_SESSION_KEY]: true });
}

function scheduleTelegramMonitorForLifecycle({ checkImmediately = false } = {}) {
  return chrome.storage.local.get({ telegramOfflineMessageSyncEnabled: true })
    .then((config) => scheduleTelegramMonitorAlarm({
      resetMessageBaseline: config.telegramOfflineMessageSyncEnabled === false,
      resetMentionBaseline: config.telegramOfflineMessageSyncEnabled === false,
      resetReplyBaseline: config.telegramOfflineMessageSyncEnabled === false,
      resetPostBaseline: config.telegramOfflineMessageSyncEnabled === false,
      checkImmediately
    }));
}

chrome.runtime.onInstalled.addListener((details) => {
  runBackgroundOperation(importPreloadedConfiguration)
    .catch((error) => {
      console.warn("Bundled configuration import failed:", error?.message || "unknown error");
    })
    .finally(() => {
      runBackgroundOperation(discardLegacyStorage).catch(() => {});
      scheduleLuckyNotificationAlarmSync();
      scheduleProfileRetentionPrune();
      telegramMonitorStartupReady.then(() => runBackgroundOperation(scheduleTelegramMonitorAlarm)).catch(() => {});
      runBackgroundOperation(scheduleAutoAttendanceAlarm).catch(() => {});
    });
});
chrome.runtime.onStartup.addListener(() => {
  runBackgroundOperation(discardLegacyStorage).catch(() => {});
  scheduleLuckyNotificationAlarmSync();
  scheduleProfileRetentionPrune();
  runBackgroundOperation(scheduleAutoAttendanceAlarm).catch(() => {});
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }
  if (fullBackupRestoreInProgress) {
    return;
  }

  if (changes.luckyNotificationsEnabled) {
    scheduleLuckyNotificationAlarmSync();
  }

  if (changes.profileRetentionDays) {
    scheduleProfileRetentionPrune(true);
  }

  if (changes.autoAttendanceEnabled || changes.autoAttendanceMode) {
    runBackgroundOperation(scheduleAutoAttendanceAlarm).catch(() => {});
  }

  if ([
    "telegramBotToken",
    "telegramTargets",
    "telegramManagedTopics",
    "telegramMessageNotificationsEnabled",
    "telegramPostNotificationsEnabled",
    "telegramMentionNotificationsEnabled",
    "telegramReplyNotificationsEnabled",
    "telegramSystemFollowNotificationsEnabled",
    "telegramSystemFeedNotificationsEnabled",
    "telegramSystemLikeNotificationsEnabled",
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
      "telegramSystemFollowNotificationsEnabled",
      "telegramSystemFeedNotificationsEnabled",
      "telegramSystemLikeNotificationsEnabled",
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
    runBackgroundOperation(() => chrome.storage.local.get({
      telegramBotToken: "",
      telegramTargets: [],
      telegramManagedTopics: [],
      telegramMessageNotificationsEnabled: true,
      telegramPostNotificationsEnabled: true,
      telegramMentionNotificationsEnabled: null,
      telegramReplyNotificationsEnabled: null,
      telegramSystemFollowNotificationsEnabled: false,
      telegramSystemFeedNotificationsEnabled: true,
      telegramSystemLikeNotificationsEnabled: true,
      telegramMentionReplyNotificationsEnabled: null,
      telegramMonitorPaused: false
    })
      .then((config) => scheduleTelegramMonitorAlarm(getTelegramBaselineResetOptions(changes, config)))
      .then(() => Promise.all([
        ...(shouldCheckNodeSeek ? [checkTelegramNotifications()] : []),
        ...(shouldCheckRss ? [checkTelegramRssNotifications()] : [])
      ])))
      .catch((error) => {
        console.warn("Telegram alarm setup failed:", error?.message || "unknown error");
      });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === LUCKY_ALARM_NAME) {
    runBackgroundOperation(handleLuckyAlarm).catch(() => {});
  }
  if (alarm.name === TELEGRAM_MESSAGE_ALARM_NAME) {
    runBackgroundOperation(checkTelegramNotifications).catch((error) => {
      console.warn("Telegram monitor failed:", error?.message || "unknown error");
    });
  }
  if (TELEGRAM_FAST_MONITOR_ALARM_NAMES.includes(alarm.name)) {
    runBackgroundOperation(checkTelegramNotifications).catch((error) => {
      console.warn("Telegram monitor failed:", error?.message || "unknown error");
    });
  }
  if (alarm.name === TELEGRAM_RSS_ALARM_NAME) {
    runBackgroundOperation(checkTelegramRssNotifications).catch((error) => {
      console.warn("Telegram RSS monitor failed:", error?.message || "unknown error");
    });
  }
  if (alarm.name === TELEGRAM_UPDATES_WATCHDOG_ALARM_NAME) {
    runBackgroundOperation(ensureTelegramUpdatesLongPoll).catch((error) => {
      console.warn("Telegram long-poll recovery failed:", error?.message || "unknown error");
    });
  }
  if (alarm.name === TELEGRAM_PERSONAL_START_ALARM_NAME) {
    runBackgroundOperation(checkTelegramPersonalStartWatch).catch((error) => {
      console.warn("Telegram personal chat setup failed:", error?.message || "unknown error");
    });
  }
  if (alarm.name === AUTO_ATTENDANCE_ALARM_NAME) {
    runBackgroundOperation(runAutoAttendance).catch(() => {});
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
    runBackgroundOperation(() => validateTelegramBotToken(message.payload?.token))
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({
        ok: false,
        error: error.message || String(error),
        invalidToken: error.invalidToken === true
      }));
    return true;
  }

  if (message.type === "telegram:test") {
    runBackgroundOperation(() => sendTelegramTestMessage(message.payload?.targetId || ""))
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message.type === "telegram:deleteManagedTopics") {
    runBackgroundOperation(() => deleteTelegramManagedTopics(message.payload?.topicIds))
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message.type === "telegram:openBot") {
    runBackgroundOperation(async () => {
      const url = await getTelegramBotLink();
      await startTelegramPersonalStartWatch();
      return chrome.tabs.create({ url });
    })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message.type === "telegram:stopPersonalStartWatch") {
    runBackgroundOperation(() => stopTelegramPersonalStartWatch())
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message.type === "telegram:detectDirectTopicId") {
    runBackgroundOperation(() => getTelegramDirectTopicId(message.payload?.chatId, message.payload?.offset))
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  (["data:restoreFullBackup", "data:restoreConfig"].includes(message.type)
    ? handleMessage(message)
    : runBackgroundOperation(() => handleMessage(message)))
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  return true;
});
