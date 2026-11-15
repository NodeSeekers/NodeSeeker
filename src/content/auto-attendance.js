chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "telegram:nodeSeekPageRequest") {
    performNodeSeekTelegramPageRequest(message.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: String(error?.message || "NodeSeek 请求失败").slice(0, 300) }));
    return true;
  }
  if (message?.type !== "attendance:perform") return false;

  performAutoAttendanceInPage(message.payload)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: String(error?.message || "签到失败").slice(0, 120) }));
  return true;
});

function performNodeSeekTelegramPageRequest(payload) {
  return new Promise((resolve, reject) => {
    const requestId = `telegram-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const resultEvent = "nodeseek-helper:telegram-page-result";
    const handleResult = (event) => {
      if (event.detail?.requestId !== requestId) return;
      window.clearTimeout(timeout);
      window.removeEventListener(resultEvent, handleResult);
      if (event.detail.ok) resolve(event.detail.result);
      else reject(new Error(String(event.detail.error || "NodeSeek 请求失败")));
    };
    const timeout = window.setTimeout(() => {
      window.removeEventListener(resultEvent, handleResult);
      reject(new Error("等待 NodeSeek 私信接口响应超时"));
    }, 20_000);

    window.addEventListener(resultEvent, handleResult);
    window.dispatchEvent(new CustomEvent("nodeseek-helper:telegram-page-request", {
      detail: { requestId, ...payload }
    }));
  });
}

function performAutoAttendanceInPage(payload) {
  return new Promise((resolve, reject) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const resultEvent = "nodeseek-helper:attendance-result";
    const handleResult = (event) => {
      if (event.detail?.requestId !== requestId) return;
      window.clearTimeout(timeout);
      window.removeEventListener(resultEvent, handleResult);
      if (event.detail.ok) resolve(event.detail.result);
      else reject(new Error(String(event.detail.error || "签到失败")));
    };
    const timeout = window.setTimeout(() => {
      window.removeEventListener(resultEvent, handleResult);
      reject(new Error("等待 NodeSeek 签到响应超时"));
    }, 25_000);

    window.addEventListener(resultEvent, handleResult);
    window.dispatchEvent(new CustomEvent("nodeseek-helper:perform-attendance", {
      detail: { requestId, payload }
    }));
  });
}
