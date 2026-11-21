chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "telegram:nodeSeekPageRequest") {
    performNodeSeekTelegramPageRequest(message.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: String(error?.message || "NodeSeek 请求失败").slice(0, 300) }));
    return true;
  }
  return false;
});

function performNodeSeekTelegramPageRequest(payload) {
  if (payload?.operation === "send-private-message") {
    return Promise.reject(new Error("NodeSeek 私信发送由扩展后台处理"));
  }
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
