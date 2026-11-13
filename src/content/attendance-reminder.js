function scanAttendanceReminder() {
  if (!isAttendanceReminderEnabled()) {
    removeAttendanceReminderBadges();
    resetAttendanceReminderRequest();
    return;
  }

  if (!isAttendanceReminderPage()) {
    removeAttendanceReminderBadges();
    return;
  }

  loadAttendanceReminderState()
    .then(renderAttendanceReminderState)
    .catch(() => {});
}

function isAttendanceReminderEnabled() {
  return featureOptions.readingNavigationEnabled && featureOptions.attendanceReminderEnabled;
}

function isAttendanceReminderPage(currentUrl = new URL(location.href)) {
  return isAttendanceReminderPostDetailPath(currentUrl.pathname) || isAttendanceReminderPostListPage();
}

function isAttendanceReminderPostDetailPath(pathname) {
  return /^\/post-\d+(?:-\d+)?$/.test(pathname);
}

function isAttendanceReminderPostListPage(root = document) {
  if (isAttendanceReminderPostDetailPath(location.pathname)) {
    return false;
  }

  return Boolean(
    root.querySelector(".post-list-item a[href^='/post-'], .post-list-item a[href*='/post-']")
    || root.querySelector(".content-item a[href^='/post-'], .content-item a[href*='/post-']")
  );
}

function loadAttendanceReminderState() {
  const dateKey = getAttendanceReminderDateKey(Date.now());
  if (attendanceReminderPromise && attendanceReminderPromiseDateKey === dateKey) {
    return attendanceReminderPromise;
  }

  attendanceReminderPromiseDateKey = dateKey;
  attendanceReminderPromise = loadAttendanceReminderStateForDate(dateKey)
    .catch((error) => {
      resetAttendanceReminderRequest();
      throw error;
    });
  return attendanceReminderPromise;
}

async function loadAttendanceReminderStateForDate(dateKey) {
  const storedRecord = await readStoredAttendanceRecord(dateKey);
  if (storedRecord) {
    return { signed: true, record: storedRecord };
  }

  const remoteRecord = await fetchAttendanceRecord();
  if (!remoteRecord || remoteRecord.dateKey !== dateKey) {
    return { signed: false };
  }

  await writeStoredAttendanceRecord(remoteRecord);
  return { signed: true, record: remoteRecord };
}

function resetAttendanceReminderRequest() {
  attendanceReminderPromise = null;
  attendanceReminderPromiseDateKey = "";
}

async function readStoredAttendanceRecord(dateKey) {
  const result = await chrome.storage.local.get(ATTENDANCE_REMINDER_STORAGE_KEY);
  const record = result?.[ATTENDANCE_REMINDER_STORAGE_KEY];
  return isAttendanceRecordForDate(record, dateKey) ? record : null;
}

async function writeStoredAttendanceRecord(record) {
  await chrome.storage.local.set({
    [ATTENDANCE_REMINDER_STORAGE_KEY]: record
  });
}

async function fetchAttendanceRecord() {
  const response = await fetch("/api/attendance/board?page=1", {
    credentials: "include",
    headers: {
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return normalizeAttendanceRecord(getAttendanceRecordFromResponse(data));
}

function getAttendanceRecordFromResponse(data) {
  return data?.record || data?.detail?.record || data?.data?.record || null;
}

function normalizeAttendanceRecord(record, checkedAt = Date.now()) {
  const gain = Number(record?.gain);
  if (!Number.isFinite(gain) || gain <= 0) {
    return null;
  }

  const signedAt = typeof record.created_at === "string" ? record.created_at : "";
  const signedAtTime = Date.parse(signedAt);
  const timestamp = Number.isFinite(signedAtTime) ? signedAtTime : checkedAt;
  return {
    dateKey: getAttendanceReminderDateKey(timestamp),
    gain: Math.floor(gain),
    signedAt,
    checkedAt,
    recordId: Number.isFinite(Number(record.id)) ? Number(record.id) : 0,
    dayId: Number.isFinite(Number(record.day_id)) ? Number(record.day_id) : 0
  };
}

function isAttendanceRecordForDate(record, dateKey) {
  return record?.dateKey === dateKey && Number(record.gain) > 0;
}

function getAttendanceReminderDateKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderAttendanceReminderState(state) {
  if (!isAttendanceReminderEnabled()) {
    removeAttendanceReminderBadges();
    return;
  }

  const hosts = findAttendanceReminderHosts();
  if (hosts.length === 0) {
    removeAttendanceReminderBadges();
    return;
  }

  const hostSet = new Set(hosts);
  document.querySelectorAll(".nsh-attendance-reminder-host").forEach((host) => {
    if (!hostSet.has(host)) {
      removeAttendanceReminderBadge(host);
    }
  });

  hosts.forEach((host) => {
    renderAttendanceReminderBadge(host, state);
  });
}

function findAttendanceReminderHosts(root = document) {
  const hosts = Array.from(root.querySelectorAll(".user-head"))
    .map(findAttendanceReminderHost)
    .filter(Boolean);
  return Array.from(new Set(hosts));
}

function findAttendanceReminderHost(userHead) {
  const target = findAttendanceReminderTarget(userHead);
  if (!target) {
    return null;
  }

  const element = toElement(target);
  const interactiveHost = element?.closest?.("a, button, [role='button']");
  if (interactiveHost instanceof HTMLElement) {
    return interactiveHost;
  }

  let current = element;
  while (current && current !== userHead) {
    if (current instanceof HTMLElement && current.matches("span, div, li")) {
      return current;
    }

    current = current.parentElement;
  }

  return userHead instanceof HTMLElement ? userHead : null;
}

function findAttendanceReminderTarget(userHead) {
  const directTarget = userHead.querySelector(
    "a[href*='attendance'], button[formaction*='attendance'], [title*='签到'], [aria-label*='签到'], [data-title*='签到'], [data-tooltip*='签到']"
  );
  if (directTarget) {
    return directTarget;
  }

  return Array.from(userHead.querySelectorAll("a, button, [role='button'], [title], [aria-label], svg, use, .iconpark-icon"))
    .find(isAttendanceReminderTarget) || null;
}

function isAttendanceReminderTarget(node) {
  const text = [
    node.textContent,
    node.getAttribute?.("href"),
    node.getAttribute?.("formaction"),
    node.getAttribute?.("title"),
    node.getAttribute?.("aria-label"),
    node.getAttribute?.("data-title"),
    node.getAttribute?.("data-tooltip"),
    node.getAttribute?.("id"),
    node.getAttribute?.("class"),
    node.getAttribute?.("xlink:href")
  ].filter(Boolean).join(" ");
  const normalized = text.toLowerCase();
  return text.includes("签到") || normalized.includes("attendance");
}

function renderAttendanceReminderBadge(host, state) {
  const badgeClass = state?.signed && Number(state.record?.gain) > 0
    ? "nsh-attendance-reminder-indicator nsh-attendance-reminder-gain"
    : "nsh-attendance-reminder-indicator nsh-attendance-reminder-dot";
  const gain = state?.signed && Number(state.record?.gain) > 0
    ? String(Math.floor(Number(state.record.gain)))
    : "";
  const title = gain ? `今日已签到，获得 ${gain} 鸡腿` : "今日未签到";
  const existing = host.querySelector(".nsh-attendance-reminder-indicator");
  if (host.classList.contains("nsh-attendance-reminder-host")
      && existing?.className === badgeClass
      && existing.textContent === gain
      && existing.title === title) {
    return;
  }

  removeAttendanceReminderBadge(host);
  host.classList.add("nsh-attendance-reminder-host");

  const badge = document.createElement("span");
  badge.className = badgeClass;
  if (state?.signed && Number(state.record?.gain) > 0) {
    badge.textContent = gain;
    badge.title = title;
    badge.setAttribute("aria-label", badge.title);
  } else {
    badge.title = title;
    badge.setAttribute("aria-label", "今日未签到");
  }

  host.appendChild(badge);
}

function removeAttendanceReminderBadges() {
  document.querySelectorAll(".nsh-attendance-reminder-host").forEach(removeAttendanceReminderBadge);
}

function removeAttendanceReminderBadge(host) {
  host.querySelectorAll?.(".nsh-attendance-reminder-indicator").forEach((badge) => badge.remove());
  host.classList.remove?.("nsh-attendance-reminder-host");
}
