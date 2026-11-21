const AUTO_ATTENDANCE_ALARM_NAME = "nshAttendance:auto";
const AUTO_ATTENDANCE_STATE_KEY = "nshAutoAttendanceState";
const AUTO_ATTENDANCE_RETRY_INTERVAL_MS = 5 * 60 * 1000;
const AUTO_ATTENDANCE_FIRST_CHECK_DELAY_MS = 60 * 1000;
const AUTO_ATTENDANCE_WINDOW_MS = 60 * 60 * 1000;
const AUTO_ATTENDANCE_REQUEST_TIMEOUT_MS = 15 * 1000;
let autoAttendanceScheduling = Promise.resolve();
let autoAttendanceRunning = false;

function scheduleAutoAttendanceAlarm() {
  const task = autoAttendanceScheduling.catch(() => {}).then(scheduleAutoAttendanceAlarmOnce);
  autoAttendanceScheduling = task;
  return task;
}

async function scheduleAutoAttendanceAlarmOnce() {
  const config = await chrome.storage.local.get({
    autoAttendanceEnabled: false,
    [AUTO_ATTENDANCE_STATE_KEY]: null
  });
  if (!config.autoAttendanceEnabled) {
    await chrome.alarms.clear(AUTO_ATTENDANCE_ALARM_NAME);
    return;
  }

  const now = Date.now();
  const dateKey = getAutoAttendanceDateKey(now);
  const previous = config[AUTO_ATTENDANCE_STATE_KEY];
  const succeededToday = previous?.dateKey === dateKey && previous.status === "success";
  let nextAttemptAt;
  if (succeededToday) {
    nextAttemptAt = getNextAutoAttendanceMidnightTimestamp(now);
  } else if (previous?.dateKey === dateKey
    && (previous.status === "failed" || previous.status === "pending")) {
    const attemptedAt = Number(previous.attemptedAt) || 0;
    nextAttemptAt = Math.max(now + 30_000, attemptedAt + AUTO_ATTENDANCE_RETRY_INTERVAL_MS);
  } else {
    const midnight = getNextAutoAttendanceMidnightTimestamp(now) - 24 * AUTO_ATTENDANCE_WINDOW_MS;
    const windowEnd = midnight + AUTO_ATTENDANCE_WINDOW_MS;
    let scheduledAt = previous?.dateKey === dateKey && previous.status === "scheduled"
      ? Number(previous.scheduledAt) : 0;
    if (!(scheduledAt >= midnight && scheduledAt < windowEnd)) {
      scheduledAt = midnight + 1000 + Math.floor(Math.random() * (AUTO_ATTENDANCE_WINDOW_MS - 1000));
      await chrome.storage.local.set({ [AUTO_ATTENDANCE_STATE_KEY]: { dateKey, status: "scheduled", scheduledAt } });
    }
    const catchUpAt = now + AUTO_ATTENDANCE_FIRST_CHECK_DELAY_MS;
    nextAttemptAt = scheduledAt > now ? scheduledAt
      : now < windowEnd ? Math.min(catchUpAt, Math.max(now + 1, windowEnd - 1)) : catchUpAt;
  }
  await chrome.alarms.create(AUTO_ATTENDANCE_ALARM_NAME, { when: nextAttemptAt });
}

async function runAutoAttendance() {
  if (autoAttendanceRunning) return;
  autoAttendanceRunning = true;
  try {
    await autoAttendanceScheduling.catch(() => {});
    await runScheduledAutoAttendance();
  } finally {
    autoAttendanceRunning = false;
  }
}

async function runScheduledAutoAttendance() {
  const config = await chrome.storage.local.get({
    autoAttendanceEnabled: false,
    autoAttendanceMode: "random",
    [AUTO_ATTENDANCE_STATE_KEY]: null
  });
  if (!config.autoAttendanceEnabled) return;

  const now = Date.now();
  const dateKey = getAutoAttendanceDateKey(now);
  const previous = config[AUTO_ATTENDANCE_STATE_KEY];
  if (previous?.dateKey !== dateKey
      || (previous.status === "scheduled" && Number(previous.scheduledAt) > now)) {
    await scheduleAutoAttendanceAlarm();
    return;
  }
  if (previous?.dateKey === dateKey
      && (previous.status === "success" || ((previous.status === "failed" || previous.status === "pending")
        && now - Number(previous.attemptedAt || 0) < AUTO_ATTENDANCE_RETRY_INTERVAL_MS))) {
    await scheduleAutoAttendanceAlarm();
    return;
  }

  await chrome.alarms.create(AUTO_ATTENDANCE_ALARM_NAME, { when: now + AUTO_ATTENDANCE_RETRY_INTERVAL_MS });
  await chrome.storage.local.set({
    [AUTO_ATTENDANCE_STATE_KEY]: { dateKey, status: "pending", attemptedAt: now }
  });
  try {
    const mode = config.autoAttendanceMode === "fixed" ? "fixed" : "random";
    const result = await requestAutoAttendance(mode, dateKey);
    await saveAutoAttendanceResult(dateKey, "success", Number(result.gain), Date.now(), mode);
  } catch (error) {
    await chrome.storage.local.set({
      [AUTO_ATTENDANCE_STATE_KEY]: {
        dateKey,
        mode: config.autoAttendanceMode === "fixed" ? "fixed" : "random",
        status: "failed",
        attemptedAt: now,
        error: String(error?.message || "签到失败").slice(0, 120)
      }
    });
    await scheduleAutoAttendanceAlarm();
  }
}

async function requestAutoAttendance(mode, dateKey) {
  if (getAutoAttendanceDateKey(Date.now()) !== dateKey) {
    throw new Error("签到日期已切换，请等待下一次检查");
  }

  const requestOptions = {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(AUTO_ATTENDANCE_REQUEST_TIMEOUT_MS)
  };
  const boardResponse = await fetch("https://www.nodeseek.com/api/attendance/board?page=1", requestOptions);
  if (!boardResponse.ok) throw new Error(`HTTP ${boardResponse.status}`);
  const board = await boardResponse.json();
  const record = board?.record || board?.detail?.record || board?.data?.record;
  const recordTime = Date.parse(record?.created_at || "");
  if (Number(record?.gain) > 0 && Number.isFinite(recordTime)
      && getAutoAttendanceDateKey(recordTime) === dateKey) {
    return { gain: Number(record.gain), alreadySigned: true };
  }

  if (getAutoAttendanceDateKey(Date.now()) !== dateKey) {
    throw new Error("签到日期已切换，请等待下一次检查");
  }
  const attendanceResponse = await fetch(
    `https://www.nodeseek.com/api/attendance?random=${mode === "random"}`,
    { ...requestOptions, method: "POST" }
  );
  if (!attendanceResponse.ok) throw new Error(`HTTP ${attendanceResponse.status}`);
  const result = await attendanceResponse.json();
  if (result?.success !== true) throw new Error(String(result?.message || "签到失败"));
  return { gain: Number(result.gain), alreadySigned: false };
}

async function saveAutoAttendanceResult(dateKey, status, gain, attemptedAt, mode = "random") {
  await chrome.storage.local.set({
    nshAttendanceReminder: {
      dateKey,
      gain: Number.isFinite(gain) && gain > 0 ? Math.floor(gain) : 1,
      signedAt: new Date(attemptedAt).toISOString(),
      checkedAt: attemptedAt,
      recordId: 0,
      dayId: 0
    },
    [AUTO_ATTENDANCE_STATE_KEY]: {
      dateKey,
      mode,
      status,
      attemptedAt,
      gain: Math.max(0, Math.floor(Number(gain) || 0))
    }
  });
  await scheduleAutoAttendanceAlarm();
}

function getAutoAttendanceDateKey(timestamp) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(timestamp);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getNextAutoAttendanceMidnightTimestamp(timestamp) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(timestamp);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const nextDayUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + 1);
  return nextDayUtc - 8 * 60 * 60 * 1000;
}
