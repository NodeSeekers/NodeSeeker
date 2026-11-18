const TELEGRAM_OFFSCREEN_PARSER_TARGET = "nsh:telegram-offscreen";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== TELEGRAM_OFFSCREEN_PARSER_TARGET) return false;

  try {
    sendResponse({ ok: true, result: parseTelegramPostHtml(message.operation, message.html, message.comments) });
  } catch (error) {
    sendResponse({ ok: false, error: String(error?.message || "解析 NodeSeek 帖子正文失败") });
  }
  return false;
});

function parseTelegramPostHtml(operation, html, comments) {
  const document = new DOMParser().parseFromString(String(html || ""), "text/html");
  if (operation === "parse-activity-comments") {
    return parseTelegramActivityCommentContents(document, comments);
  }
  if (operation === "parse-system-post") {
    return parseTelegramSystemPostContent(document);
  }
  throw new Error("未知的 NodeSeek 正文解析请求");
}

function parseTelegramActivityCommentContents(document, values) {
  const comments = (Array.isArray(values) ? values : []).map((item) => {
    const postId = String(item?.postId || "").trim();
    const commentId = String(item?.commentId || "").trim();
    const pageNumber = Number(item?.pageNumber);
    if (!/^\d+$/.test(postId) || !/^\d+$/.test(commentId)
        || !Number.isSafeInteger(pageNumber) || pageNumber < 1) return null;
    return { postId, commentId, pageNumber };
  }).filter(Boolean);

  const commentItems = [...document.querySelectorAll("li.content-item[data-comment-id]")];
  const contents = [];
  for (const comment of comments) {
    const item = commentItems.find((node) => node.getAttribute("data-comment-id") === comment.commentId);
    const article = item?.querySelector("article.post-content");
    if (!article) throw new Error(`帖子 ${comment.postId} 未找到通知楼层 ${comment.commentId}`);

    const quoteBlocks = [...article.querySelectorAll("blockquote")]
      .filter((node) => !node.parentElement?.closest("blockquote"));
    const quote = quoteBlocks.map((node) => node.textContent || "")
      .map(normalizeTelegramPostText)
      .filter(Boolean)
      .join("\n");
    const replyArticle = article.cloneNode(true);
    replyArticle.querySelectorAll("blockquote").forEach((node) => node.remove());
    const reply = normalizeTelegramPostText(replyArticle.textContent || "");
    contents.push({ commentId: comment.commentId, quote, reply });
  }
  return { contents };
}

function parseTelegramSystemPostContent(document) {
  const title = normalizeTelegramPostText(
    document.querySelector(".post-title-link")?.textContent
      || document.querySelector(".post-title h1")?.textContent || ""
  );
  const bodyElement = document.querySelector('.content-item[id="0"] article.post-content');
  if (!title || !bodyElement) throw new Error("NodeSeek 帖子标题或正文缺失");
  return { title, body: normalizeTelegramPostText(bodyElement.textContent || "") };
}

function normalizeTelegramPostText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
