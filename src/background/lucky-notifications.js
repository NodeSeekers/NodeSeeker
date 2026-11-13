async function addLuckyNotification(notification) {
  const normalized = normalizeLuckyNotification(notification);
  const result = await withTransaction([STORE_LUCKY_NOTIFICATIONS], "readwrite", async ({ luckyNotifications }) => {
    const existing = await requestToPromise(luckyNotifications.get(normalized.id));
    if (isLuckyNotificationStatus(existing?.status)) {
      return { added: false, notification: existing };
    }

    await requestToPromise(luckyNotifications.put(normalized));
    return { added: true, notification: normalized };
  });

  scheduleLuckyNotificationAlarmSync();
  return result;
}

async function deleteLuckyNotification(payload) {
  const id = normalizeLuckyId(payload.luckyUrl || payload.id);
  if (!id) {
    return { changed: false };
  }

  const result = await withTransaction([STORE_LUCKY_NOTIFICATIONS], "readwrite", async ({ luckyNotifications }) => {
    const notification = await requestToPromise(luckyNotifications.get(id));
    if (!notification) {
      return { changed: false };
    }

    await requestToPromise(luckyNotifications.delete(id));
    return { changed: true };
  });

  if (result.changed) {
    scheduleLuckyNotificationAlarmSync();
  }
  return result;
}

async function getLuckyNotificationByUrl(payload) {
  const id = normalizeLuckyId(payload.luckyUrl || payload.id);
  if (!id) {
    return null;
  }

  return withTransaction([STORE_LUCKY_NOTIFICATIONS], "readonly", async ({ luckyNotifications }) => {
    const notification = await requestToPromise(luckyNotifications.get(id));
    return isLuckyNotificationStatus(notification?.status) ? notification : null;
  });
}

async function listLuckyNotifications(payload) {
  const result = await readLuckyNotifications(payload);
  const items = await resolveMissingLuckyResults(result.items);
  return { ...result, items };
}

async function readLuckyNotifications(payload) {
  const status = normalizeLuckyStatusFilter(payload.status);
  const filters = normalizeLuckyFilters(payload);
  const limit = Math.min(Math.max(Math.floor(Number(payload.limit) || 50), 1), 100);
  const offset = Math.max(Math.floor(Number(payload.offset) || 0), 0);

  return withTransaction([STORE_LUCKY_NOTIFICATIONS], "readonly", async ({ luckyNotifications }) => {
    if (status === "all") {
      const allItems = await collectCursorValues(luckyNotifications.index("byAddedAt"), null, "prev", 0, Number.MAX_SAFE_INTEGER);
      const activeItems = allItems.filter((item) => {
        return isLuckyNotificationStatus(item.status) && matchesLuckyFilters(item, filters);
      });
      const total = activeItems.length;
      const items = activeItems.slice(offset, offset + limit);
      return { items, total, offset, limit, status };
    }

    const range = IDBKeyRange.bound([status, 0], [status, Number.MAX_SAFE_INTEGER]);
    const index = luckyNotifications.index("byStatusAddedAt");
    if (hasLuckyFilters(filters)) {
      const allItems = await collectCursorValues(index, range, "prev", 0, Number.MAX_SAFE_INTEGER);
      const matchedItems = allItems.filter((item) => matchesLuckyFilters(item, filters));
      const total = matchedItems.length;
      const items = matchedItems.slice(offset, offset + limit);
      return { items, total, offset, limit, status };
    }

    const total = await requestToPromise(index.count(range));
    const items = await collectCursorValues(index, range, "prev", offset, limit);
    return { items, total, offset, limit, status };
  });
}

async function resolveMissingLuckyResults(notifications) {
  const items = [];
  for (const notification of notifications) {
    items.push(await resolveMissingLuckyResult(notification));
  }
  return items;
}

async function resolveMissingLuckyResult(notification) {
  if (!shouldResolveLuckyResult(notification)) {
    return notification;
  }

  const result = await resolveLuckyDrawResult(notification);
  if (!isLuckyFinalResultStatus(result?.resultStatus)) {
    return notification;
  }

  return await saveLuckyResult(notification.id, result) || notification;
}

function shouldResolveLuckyResult(notification) {
  return notification?.status === LUCKY_STATUS_NOTIFIED && !isLuckyFinalResultStatus(notification.resultStatus);
}

function isLuckyFinalResultStatus(value) {
  return value === LUCKY_RESULT_WON || value === LUCKY_RESULT_LOST;
}

async function saveLuckyResult(id, result) {
  return withTransaction([STORE_LUCKY_NOTIFICATIONS], "readwrite", async ({ luckyNotifications }) => {
    const notification = await requestToPromise(luckyNotifications.get(id));
    if (!notification) {
      return null;
    }

    const now = Date.now();
    const updatedNotification = {
      ...notification,
      ...normalizeLuckyResultFields(result),
      updatedAt: now
    };
    await requestToPromise(luckyNotifications.put(updatedNotification));
    return updatedNotification;
  });
}

function scheduleLuckyNotificationAlarmSync() {
  syncLuckyNotificationAlarms().catch((error) => {
    console.error("Failed to sync lucky notification alarms", error);
  });
}

async function handleLuckyAlarm() {
  await syncLuckyNotificationAlarms();
}

async function syncLuckyNotificationAlarms() {
  await clearLegacyLuckyAlarms();
  await chrome.alarms.clear(LUCKY_ALARM_NAME);

  const options = await getOptions();
  if (options.luckyNotificationsEnabled === false) {
    return;
  }

  await processDueLuckyNotifications();
  const nextNotification = await getNextPendingLuckyNotification();
  if (nextNotification?.drawAt && nextNotification.drawAt > Date.now()) {
    await chrome.alarms.create(LUCKY_ALARM_NAME, {
      when: nextNotification.drawAt
    });
  }
}

async function clearLegacyLuckyAlarms() {
  const alarms = await chrome.alarms.getAll();
  await Promise.all(
    alarms
      .filter((alarm) => alarm.name.startsWith(LEGACY_LUCKY_ALARM_PREFIX) && alarm.name !== LUCKY_ALARM_NAME)
      .map((alarm) => chrome.alarms.clear(alarm.name))
  );
}

async function processDueLuckyNotifications() {
  const now = Date.now();
  const dueNotifications = await getDueLuckyNotifications(now);

  for (const notification of dueNotifications) {
    const result = await resolveLuckyDrawResult(notification);
    const notificationId = `${LUCKY_NOTIFICATION_PREFIX}${hashString(notification.id)}`;
    await chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl: chrome.runtime.getURL(LUCKY_NOTIFICATION_ICON),
      title: "NodeSeek Helper 抽奖通知",
      message: getLuckyNotificationMessage(notification, result),
      priority: 2,
      requireInteraction: true
    });
    await markLuckyNotificationNotified(notification.id, notificationId, result);
  }
}

async function resolveLuckyDrawResult(notification) {
  try {
    return await fetchLuckyDrawResult(notification);
  } catch (error) {
    console.warn("Failed to fetch lucky draw result", error);
    return null;
  }
}

async function getDueLuckyNotifications(now) {
  return withTransaction([STORE_LUCKY_NOTIFICATIONS], "readonly", async ({ luckyNotifications }) => {
    const range = IDBKeyRange.bound([LUCKY_STATUS_PENDING, 0], [LUCKY_STATUS_PENDING, now]);
    return collectCursorValues(
      luckyNotifications.index("byStatusDrawAt"),
      range,
      "next",
      0,
      Number.MAX_SAFE_INTEGER
    );
  });
}

async function getNextPendingLuckyNotification() {
  const now = Date.now();
  return withTransaction([STORE_LUCKY_NOTIFICATIONS], "readonly", async ({ luckyNotifications }) => {
    const range = IDBKeyRange.bound(
      [LUCKY_STATUS_PENDING, now + 1],
      [LUCKY_STATUS_PENDING, Number.MAX_SAFE_INTEGER]
    );
    const items = await collectCursorValues(luckyNotifications.index("byStatusDrawAt"), range, "next", 0, 1);
    return items[0] || null;
  });
}

async function markLuckyNotificationNotified(id, notificationId, result) {
  await withTransaction([STORE_LUCKY_NOTIFICATIONS], "readwrite", async ({ luckyNotifications }) => {
    const notification = await requestToPromise(luckyNotifications.get(id));
    if (!notification || notification.status !== LUCKY_STATUS_PENDING) {
      return;
    }

    const now = Date.now();
    await requestToPromise(luckyNotifications.put({
      ...notification,
      ...(result ? normalizeLuckyResultFields(result) : {}),
      status: LUCKY_STATUS_NOTIFIED,
      notifiedAt: now,
      notificationId,
      updatedAt: now
    }));
  });
}

async function openLuckyNotification(notificationId) {
  const notification = await findLuckyNotificationByNotificationId(notificationId);
  if (notification?.luckyUrl) {
    await chrome.tabs.create({ url: notification.luckyUrl });
  }

  await chrome.notifications.clear(notificationId);
}

async function findLuckyNotificationByNotificationId(notificationId) {
  return withTransaction([STORE_LUCKY_NOTIFICATIONS], "readonly", async ({ luckyNotifications }) => {
    return requestToPromise(luckyNotifications.index("byNotificationId").get(notificationId));
  });
}

function normalizeLuckyNotification(notification) {
  if (!notification || typeof notification !== "object") {
    throw new Error("抽奖通知无效");
  }

  const luckyUrl = normalizeLuckyId(notification.luckyUrl || notification.id);
  if (!luckyUrl) {
    throw new Error("抽奖链接无效");
  }

  const now = Date.now();
  const drawAt = Number(notification.drawAt) || 0;
  const notifiedAt = Number(notification.notifiedAt) || 0;
  const status = notifiedAt || (drawAt && drawAt <= now)
    ? LUCKY_STATUS_NOTIFIED
    : LUCKY_STATUS_PENDING;

  return {
    id: luckyUrl,
    title: cleanText(notification.title) || "NodeSeek 帖子",
    postId: cleanText(notification.postId),
    postUrl: cleanText(notification.postUrl),
    authorName: cleanText(notification.authorName),
    authorId: cleanText(notification.authorId),
    authorUrl: cleanText(notification.authorUrl),
    luckyUrl,
    drawAt,
    notifiedAt,
    notificationId: notification.notificationId || "",
    ...normalizeLuckyResultFields(notification),
    status,
    addedAt: Number(notification.addedAt) || now,
    updatedAt: now
  };
}

function normalizeLuckyResultFields(result) {
  const resultStatus = isLuckyResultStatus(result?.resultStatus) ? result.resultStatus : "";
  return {
    resultStatus,
    resultCheckedAt: resultStatus ? Number(result.resultCheckedAt) || Date.now() : 0,
    resultMemberId: cleanText(result?.resultMemberId),
    resultMemberName: cleanText(result?.resultMemberName),
    resultFloorId: normalizeLuckyNumber(result?.resultFloorId),
    resultRank: normalizeLuckyNumber(result?.resultRank)
  };
}

function normalizeLuckyId(value) {
  const text = cleanText(value);
  if (!text) {
    return "";
  }

  try {
    return new URL(text).toString();
  } catch (_error) {
    return text;
  }
}

function normalizeLuckyStatusFilter(value) {
  return isLuckyNotificationStatus(value)
    ? value
    : "all";
}

function normalizeLuckyFilters(payload) {
  return {
    titleQuery: cleanText(payload.titleQuery).toLowerCase(),
    drawAtFrom: normalizeLuckyDateStart(payload.drawAtFrom),
    drawAtTo: normalizeLuckyDateEnd(payload.drawAtTo)
  };
}

function hasLuckyFilters(filters) {
  return Boolean(filters.titleQuery || filters.drawAtFrom || filters.drawAtTo);
}

function matchesLuckyFilters(notification, filters) {
  if (filters.titleQuery && !cleanText(notification?.title).toLowerCase().includes(filters.titleQuery)) {
    return false;
  }

  if (filters.drawAtFrom || filters.drawAtTo) {
    const drawAt = Number(notification?.drawAt) || 0;
    if (!drawAt) {
      return false;
    }

    if (filters.drawAtFrom && drawAt < filters.drawAtFrom) {
      return false;
    }

    if (filters.drawAtTo && drawAt > filters.drawAtTo) {
      return false;
    }
  }

  return true;
}

function normalizeLuckyDateStart(value) {
  const text = cleanText(value);
  if (!text) {
    return 0;
  }

  const timestamp = new Date(`${text}T00:00:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeLuckyDateEnd(value) {
  const text = cleanText(value);
  if (!text) {
    return 0;
  }

  const timestamp = new Date(`${text}T23:59:59.999`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isLuckyNotificationStatus(value) {
  return value === LUCKY_STATUS_PENDING || value === LUCKY_STATUS_NOTIFIED;
}

function isLuckyResultStatus(value) {
  return value === LUCKY_RESULT_WON || value === LUCKY_RESULT_LOST || value === LUCKY_RESULT_UNKNOWN;
}

function getLuckyNotificationMessage(notification, result) {
  return `【${getLuckyNotificationResultLabel(result)}】 ${notification.title || "NodeSeek 抽奖"}\n${getLuckyNotificationDrawAtLine(notification)}`;
}

function getLuckyNotificationResultLabel(result) {
  if (result?.resultStatus === LUCKY_RESULT_WON) {
    return result.resultFloorId ? `已中奖 ${result.resultFloorId}楼` : "已中奖";
  }

  if (result?.resultStatus === LUCKY_RESULT_LOST) {
    return "未中奖";
  }

  return "已开奖";
}

function getLuckyNotificationDrawAtLine(notification) {
  return `开奖时间：${notification.drawAt ? formatDate(notification.drawAt) : "-"}`;
}

async function fetchLuckyDrawResult(notification) {
  const drawInfo = getLuckyDrawInfo(notification);
  if (!drawInfo) {
    return null;
  }

  const [currentUser, floorData, randomness] = await Promise.all([
    fetchLuckyCurrentUser(notification.luckyUrl),
    fetchLuckyFloorData(drawInfo),
    fetchDrandRandomness(drawInfo.revealTime)
  ]);

  const drawOrder = buildLuckyDrawOrder(randomness, floorData.data.length);
  const resultRows = buildLuckyDrawResultRows(drawInfo, floorData.data, drawOrder);
  const memberId = normalizeLuckyMemberId(currentUser?.member_id);
  const resultRow = memberId
    ? resultRows.find((row) => normalizeLuckyMemberId(row.member_id) === memberId)
    : null;

  return {
    resultStatus: memberId
      ? (resultRow?.available ? LUCKY_RESULT_WON : LUCKY_RESULT_LOST)
      : LUCKY_RESULT_UNKNOWN,
    resultCheckedAt: Date.now(),
    resultMemberId: memberId,
    resultMemberName: cleanText(resultRow?.member_name || currentUser?.member_name),
    resultFloorId: normalizeLuckyNumber(resultRow?.floor_id),
    resultRank: normalizeLuckyNumber(resultRow?.number)
  };
}

function getLuckyDrawInfo(notification) {
  const url = toLuckyUrl(notification.luckyUrl);
  const postId = cleanText(url?.searchParams.get("post") || notification.postId);
  const revealTime = Number(url?.searchParams.get("time")) || Number(notification.drawAt) || 0;
  const giftCount = Math.max(Math.floor(Number(url?.searchParams.get("count")) || 0), 0);
  const firstFloor = Math.max(Math.floor(Number(url?.searchParams.get("start")) || 1), 0);
  const removeDuplicated = !url || url.searchParams.get("duplicate") === "false";

  if (!postId || !revealTime || !giftCount) {
    return null;
  }

  return {
    postId,
    revealTime,
    giftCount,
    firstFloor,
    removeDuplicated
  };
}

async function fetchLuckyCurrentUser(luckyUrl) {
  const response = await fetch(luckyUrl, {
    credentials: "include",
    cache: "no-store"
  });
  const html = await response.text();
  if (!response.ok) {
    throw new Error(`获取抽奖页面失败：HTTP ${response.status}`);
  }

  return parseNodeSeekConfig(html)?.user || null;
}

function parseNodeSeekConfig(html) {
  const match = String(html || "").match(/<script[^>]*id=["']temp-script["'][^>]*>([\s\S]*?)<\/script>/i);
  const encoded = match?.[1]?.trim();
  if (!encoded) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Unicode(encoded));
  } catch (_error) {
    return null;
  }
}

function decodeBase64Unicode(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

async function fetchLuckyFloorData(drawInfo) {
  const url = new URL("https://www.nodeseek.com/api/content/floor-data");
  url.searchParams.set("postId", drawInfo.postId);
  url.searchParams.set("time", String(drawInfo.revealTime));

  const data = await fetchLuckyJson(url.toString(), { credentials: "include" });
  if (!data?.success || !Array.isArray(data.data)) {
    throw new Error(cleanText(data?.message) || "获取楼层信息失败");
  }

  return data;
}

async function fetchDrandRandomness(revealTime) {
  const round = Math.floor(((new Date(revealTime).getTime() / 1000) - 1595431050) / 30);
  if (!Number.isFinite(round) || round < 0) {
    throw new Error("开奖时间无效");
  }

  const data = await fetchLuckyJson(
    `https://api.drand.sh/8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce/public/${round}`
  );
  if (!data?.randomness) {
    throw new Error("获取开奖随机数失败");
  }

  return data.randomness;
}

async function fetchLuckyJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "Accept": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`请求失败：HTTP ${response.status}`);
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    throw new Error("接口响应不是 JSON");
  }
}

function buildLuckyDrawResultRows(drawInfo, floorRows, drawOrder) {
  const rows = floorRows.map((row) => ({ ...row }));
  const memberIds = new Set();
  for (let index = 0; index < rows.length; index += 1) {
    if (index < drawInfo.firstFloor) {
      rows[index].dup = false;
      continue;
    }

    const memberId = rows[index].member_id;
    if (memberIds.has(memberId)) {
      rows[index].dup = true;
    } else {
      rows[index].dup = false;
      memberIds.add(memberId);
    }
  }

  const resultRows = [];
  let availableCount = 0;
  for (const rowIndex of drawOrder) {
    if (availableCount >= drawInfo.giftCount) {
      break;
    }

    const row = rows[rowIndex];
    if (!row) {
      continue;
    }

    if (Number(row.floor_id) < drawInfo.firstFloor) {
      row.available = false;
      row.reason = "低于起始楼层";
      continue;
    }

    if (row.dup && drawInfo.removeDuplicated) {
      row.available = false;
      row.reason = "重复";
    } else {
      row.available = true;
      availableCount += 1;
    }
    resultRows.push(row);
  }

  resultRows.sort((left, right) => Number(left.floor_id) - Number(right.floor_id));
  while (resultRows.length && !resultRows[resultRows.length - 1].available) {
    resultRows.pop();
  }

  let rank = 0;
  resultRows.forEach((row) => {
    row.number = row.available ? ++rank : "";
  });
  return resultRows;
}

function buildLuckyDrawOrder(randomness, length) {
  const seed = luckyCyrb128(randomness);
  const random = luckySfc32(seed[0], seed[1], seed[2], seed[3]);
  const values = [];
  for (let index = 0; index < length; index += 1) {
    values.push({ value: random(), index });
  }
  return values.sort((left, right) => left.value - right.value).map((item) => item.index);
}

function luckyCyrb128(value) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    h1 = h2 ^ Math.imul(h1 ^ code, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ code, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ code, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ code, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [
    (h1 ^ h2 ^ h3 ^ h4) >>> 0,
    (h2 ^ h1) >>> 0,
    (h3 ^ h1) >>> 0,
    (h4 ^ h1) >>> 0
  ];
}

function luckySfc32(a, b, c, d) {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let value = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = ((c << 21) | (c >>> 11));
    d = (d + 1) | 0;
    value = (value + d) | 0;
    c = (c + value) | 0;
    return (value >>> 0) / 4294967296;
  };
}

function normalizeLuckyMemberId(value) {
  const text = cleanText(value);
  return text ? String(text) : "";
}

function normalizeLuckyNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(Math.floor(number), 0) : 0;
}

function toLuckyUrl(value) {
  try {
    return new URL(value);
  } catch (_error) {
    return null;
  }
}
