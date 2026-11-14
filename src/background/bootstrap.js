discardLegacyStorage();
scheduleLuckyNotificationAlarmSync();
scheduleProfileRetentionPrune();
scheduleTelegramMonitorAlarm();
scheduleAutoAttendanceAlarm();

chrome.runtime.onInstalled.addListener(() => {
  importPreloadedConfiguration()
    .catch((error) => {
      console.warn("Bundled configuration import failed:", error?.message || "unknown error");
    })
    .finally(() => {
      discardLegacyStorage();
      scheduleLuckyNotificationAlarmSync();
      scheduleProfileRetentionPrune();
      scheduleTelegramMonitorAlarm();
      scheduleAutoAttendanceAlarm();
    });
});
chrome.runtime.onStartup.addListener(() => {
  discardLegacyStorage();
  scheduleLuckyNotificationAlarmSync();
  scheduleProfileRetentionPrune();
  scheduleTelegramMonitorAlarm();
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
    "telegramMessageNotificationsEnabled",
    "telegramPostNotificationsEnabled",
    "telegramMentionNotificationsEnabled",
    "telegramReplyNotificationsEnabled",
    "telegramMonitorIntervalSeconds",
    "telegramMonitorPaused"
  ].some((key) => changes[key])) {
    const resetMessageBaseline = changes.telegramMessageNotificationsEnabled?.newValue === true;
    const resetMentionBaseline = changes.telegramMentionNotificationsEnabled?.newValue === true;
    const resetReplyBaseline = changes.telegramReplyNotificationsEnabled?.newValue === true;
    scheduleTelegramMonitorAlarm(resetMessageBaseline, resetMentionBaseline, resetReplyBaseline)
      .then(() => checkTelegramNotifications())
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

  if (message.type === "telegram:checkPersonalStartWatch") {
    checkTelegramPersonalStartWatch()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        const messageText = error?.message || String(error);
        chrome.runtime.sendMessage({ type: "telegram:personalStartWatchError", error: messageText }).catch(() => {});
        sendResponse({ ok: false, error: messageText });
      });
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
