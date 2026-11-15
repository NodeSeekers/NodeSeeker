(function () {
  const REQUEST_EVENT = "nodeseek-helper:perform-attendance";
  const RESULT_EVENT = "nodeseek-helper:attendance-result";
  const TELEGRAM_REQUEST_EVENT = "nodeseek-helper:telegram-page-request";
  const TELEGRAM_RESULT_EVENT = "nodeseek-helper:telegram-page-result";

  window.addEventListener(REQUEST_EVENT, (event) => {
    const detail = event.detail || {};
    performAutoAttendance(detail.payload)
      .then((result) => dispatchResult(detail.requestId, { ok: true, result }))
      .catch((error) => dispatchResult(detail.requestId, {
        ok: false,
        error: String(error?.message || "签到失败").slice(0, 120)
      }));
  });

  window.addEventListener(TELEGRAM_REQUEST_EVENT, (event) => {
    const detail = event.detail || {};
    performTelegramPageRequest(detail)
      .then((result) => dispatchTelegramResult(detail.requestId, { ok: true, result }))
      .catch((error) => dispatchTelegramResult(detail.requestId, {
        ok: false,
        error: String(error?.message || "NodeSeek 私信请求失败").slice(0, 300)
      }));
  });

  async function performAutoAttendance(payload) {
    const dateKey = getAutoAttendanceDateKey(Date.now());
    if (payload?.dateKey !== dateKey) {
      throw new Error("签到日期已切换，请等待下一次检查");
    }

    const boardResponse = await fetch("/api/attendance/board?page=1", { credentials: "include" });
    if (!boardResponse.ok) throw new Error(`HTTP ${boardResponse.status}`);
    const board = await boardResponse.json();
    const record = board?.record || board?.detail?.record || board?.data?.record;
    const recordTime = Date.parse(record?.created_at || "");
    if (Number(record?.gain) > 0 && Number.isFinite(recordTime)
        && getAutoAttendanceDateKey(recordTime) === dateKey) {
      return { gain: Number(record.gain), alreadySigned: true };
    }

    const mode = payload?.mode === "fixed" ? "fixed" : "random";
    const response = await fetch(`/api/attendance?random=${mode === "random"}`, { method: "POST" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (result?.success !== true) throw new Error(String(result?.message || "签到失败"));
    return { gain: Number(result.gain), alreadySigned: false };
  }

  async function performTelegramPageRequest(detail) {
    if (detail.operation === "send-private-message") {
      const receiverUid = Number(detail.receiverUid);
      if (!Number.isSafeInteger(receiverUid) || receiverUid <= 0) {
        throw new Error("NodeSeek 用户 ID 无效");
      }
      const response = await fetch("/api/notification/message/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          receiverUid,
          content: String(detail.content || ""),
          markdown: detail.markdown === true
        })
      });
      const result = await response.json();
      if (!response.ok || result?.success !== true) {
        throw new Error(result?.message || `NodeSeek 私信发送失败（HTTP ${response.status}）`);
      }
      return result;
    }

    if (detail.operation === "mark-conversation-read") {
      const userId = String(detail.userId || "").trim();
      const currentUserId = String(detail.currentUserId || "").trim();
      if (!/^\d+$/.test(userId) || !/^\d+$/.test(currentUserId)) {
        throw new Error("NodeSeek 私信用户 ID 无效，无法标记已读");
      }
      const conversationResponse = await fetch(
        `/api/notification/message/with/${encodeURIComponent(userId)}`,
        { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" }
      );
      const conversation = await conversationResponse.json();
      if (!conversationResponse.ok || conversation?.success !== true || !Array.isArray(conversation.msgArray)) {
        throw new Error(conversation?.message || `读取 NodeSeek 私信失败（HTTP ${conversationResponse.status}）`);
      }
      const unreadIds = conversation.msgArray
        .filter((message) => String(message?.receiver_id || "") === currentUserId
          && (message?.viewed === 0 || message?.viewed === false || String(message?.viewed) === "0"))
        .map((message) => message?.id)
        .filter((id) => id != null);
      if (unreadIds.length === 0) return { marked: 0 };

      const readResponse = await fetch("/api/notification/message/markViewed", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ messages: unreadIds })
      });
      const readResult = await readResponse.json();
      if (!readResponse.ok || readResult?.success !== true) {
        throw new Error(readResult?.message || `标记 NodeSeek 私信已读失败（HTTP ${readResponse.status}）`);
      }
      return { marked: unreadIds.length };
    }

    throw new Error("未知的 NodeSeek 页面请求");
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

  function dispatchResult(requestId, result) {
    window.dispatchEvent(new CustomEvent(RESULT_EVENT, {
      detail: { requestId, ...result }
    }));
  }

  function dispatchTelegramResult(requestId, result) {
    window.dispatchEvent(new CustomEvent(TELEGRAM_RESULT_EVENT, {
      detail: { requestId, ...result }
    }));
  }
})();
