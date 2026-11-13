(function () {
  const REQUEST_EVENT = "nodeseek-helper:perform-attendance";
  const RESULT_EVENT = "nodeseek-helper:attendance-result";

  window.addEventListener(REQUEST_EVENT, (event) => {
    const detail = event.detail || {};
    performAutoAttendance(detail.payload)
      .then((result) => dispatchResult(detail.requestId, { ok: true, result }))
      .catch((error) => dispatchResult(detail.requestId, {
        ok: false,
        error: String(error?.message || "签到失败").slice(0, 120)
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
})();
