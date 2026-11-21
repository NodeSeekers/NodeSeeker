(function () {
  const REQUEST_EVENT = "nodeseek-helper:perform-attendance";
  const RESULT_EVENT = "nodeseek-helper:attendance-result";
  const TELEGRAM_REQUEST_EVENT = "nodeseek-helper:telegram-page-request";
  const TELEGRAM_RESULT_EVENT = "nodeseek-helper:telegram-page-result";
  const TELEGRAM_PAGE_REQUEST_TIMEOUT_MS = 15_000;

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
    if (detail.operation === "mark-conversation-read") {
      const userId = String(detail.userId || "").trim();
      const currentUserId = String(detail.currentUserId || "").trim();
      if (!/^\d+$/.test(userId) || !/^\d+$/.test(currentUserId)) {
        throw new Error("NodeSeek 私信用户 ID 无效，无法标记已读");
      }
      const conversationResponse = await fetchWithTimeout(
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

      const readResponse = await fetchWithTimeout("/api/notification/message/markViewed", {
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

    if (detail.operation === "fetch-activity-comment-contents") {
      return fetchTelegramActivityCommentContents(detail.comments);
    }

    if (detail.operation === "fetch-system-post-content") {
      return fetchTelegramSystemPostContent(detail);
    }

    throw new Error("未知的 NodeSeek 页面请求");
  }

  async function fetchTelegramActivityCommentContents(values) {
    const comments = (Array.isArray(values) ? values : []).map((item) => {
      const postId = String(item?.postId || "").trim();
      const commentId = String(item?.commentId || "").trim();
      const pageNumber = Number(item?.pageNumber);
      if (!/^\d+$/.test(postId) || !/^\d+$/.test(commentId)
          || !Number.isSafeInteger(pageNumber) || pageNumber < 1) return null;
      return { postId, commentId, pageNumber };
    }).filter(Boolean);
    const pageGroups = new Map();
    for (const comment of comments) {
      const key = `${comment.postId}:${comment.pageNumber}`;
      if (!pageGroups.has(key)) pageGroups.set(key, []);
      pageGroups.get(key).push(comment);
    }

    const contents = [];
    for (const pageComments of pageGroups.values()) {
      const { postId, pageNumber } = pageComments[0];
      const response = await fetchWithTimeout(`/post-${postId}-${pageNumber}`, {
        credentials: "include",
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`读取帖子 ${postId} 第 ${pageNumber} 页失败（HTTP ${response.status}）`);
      const parsedDocument = new DOMParser().parseFromString(await response.text(), "text/html");

      const commentItems = [...parsedDocument.querySelectorAll("li.content-item[data-comment-id]")];
      for (const comment of pageComments) {
        const item = commentItems.find((node) => node.getAttribute("data-comment-id") === comment.commentId);
        const article = item?.querySelector("article.post-content");
        if (!article) throw new Error(`帖子 ${postId} 未找到通知楼层 ${comment.commentId}`);

        const quoteBlocks = [...article.querySelectorAll("blockquote")]
          .filter((node) => !node.parentElement?.closest("blockquote"));
        const quote = quoteBlocks.map((node) => node.textContent || "")
          .map(normalizeTelegramActivityCommentText)
          .filter(Boolean)
          .join("\n");
        const replyArticle = article.cloneNode(true);
        replyArticle.querySelectorAll("blockquote").forEach((node) => node.remove());
        const reply = normalizeTelegramActivityCommentText(replyArticle.textContent || "");
        contents.push({ commentId: comment.commentId, quote, reply });
      }
    }
    return { contents };
  }

  function normalizeTelegramActivityCommentText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function fetchTelegramSystemPostContent(value) {
    const postId = String(value?.postId || "").trim();
    const pageNumber = Number(value?.pageNumber);
    if (!/^\d{1,20}$/.test(postId) || Number(postId) <= 0
        || !Number.isSafeInteger(pageNumber) || pageNumber < 1) {
      throw new Error("NodeSeek 帖子编号无效");
    }

    const response = await fetchWithTimeout(`/post-${postId}-${pageNumber}`, {
      credentials: "include",
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`NodeSeek 帖子页返回 HTTP ${response.status}`);
    const parsedDocument = new DOMParser().parseFromString(await response.text(), "text/html");
    const title = normalizeTelegramActivityCommentText(
      parsedDocument.querySelector(".post-title-link")?.textContent
        || parsedDocument.querySelector(".post-title h1")?.textContent || ""
    );
    const bodyElement = parsedDocument.querySelector('.content-item[id="0"] article.post-content');
    if (!title || !bodyElement) throw new Error("NodeSeek 帖子标题或正文缺失");
    const body = normalizeTelegramActivityCommentText(
      bodyElement.textContent || ""
    );
    return { title, body };
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

  async function fetchWithTimeout(input, options = {}, timeoutMs = TELEGRAM_PAGE_REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const externalSignal = options?.signal;
    const abortFromExternalSignal = () => controller.abort(externalSignal.reason);
    if (externalSignal?.aborted) abortFromExternalSignal();
    else externalSignal?.addEventListener("abort", abortFromExternalSignal, { once: true });
    let timeoutId = window.setTimeout(() => {
      controller.abort("timeout");
      externalSignal?.removeEventListener("abort", abortFromExternalSignal);
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      timeoutId = 0;
      externalSignal?.removeEventListener("abort", abortFromExternalSignal);
    };
    try {
      const response = await fetch(input, { ...options, signal: controller.signal });
      for (const method of ["json", "text", "blob", "arrayBuffer", "formData"]) {
        if (typeof response?.[method] !== "function") continue;
        const readBody = response[method].bind(response);
        response[method] = async (...args) => {
          try {
            return await readBody(...args);
          } catch (error) {
            if (controller.signal.reason === "timeout") throw new Error("NodeSeek 请求超时（15 秒）");
            throw error;
          } finally {
            cleanup();
          }
        };
      }
      return response;
    } catch (error) {
      cleanup();
      if (controller.signal.reason === "timeout") throw new Error("NodeSeek 请求超时（15 秒）");
      throw error;
    }
  }
})();
