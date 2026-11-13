let visitHistorySaveKey = "";
let visitHistoryStyleRequestId = 0;

function scanVisitHistory() {
  saveCurrentVisitHistory();
  markVisitedPostTitles();
}

async function saveCurrentVisitHistory() {
  if (!isVisitHistoryPostDetailPage(location.pathname)) {
    return;
  }

  const postId = getVisitHistoryPostIdFromPath(location.pathname);
  if (!postId) {
    return;
  }

  const title = getVisitHistoryCurrentTitle();
  const container = getVisitHistoryCurrentContainer();
  const author = getVisitHistoryAuthor(container);
  const posted = getVisitHistoryPostedAt(container);
  const saveKey = `${postId}:${title}:${author.authorName}:${posted.postedAt}`;
  if (saveKey === visitHistorySaveKey) {
    return;
  }

  visitHistorySaveKey = saveKey;
  try {
    await sendExtensionMessage("visitHistory:add", {
      post: {
        postId,
        title,
        postUrl: new URL(`${location.pathname}${location.search}`, location.origin).toString(),
        ...author,
        ...posted
      }
    });
  } catch (_error) {
    // Visit history should not block page browsing.
  }
}

async function markVisitedPostTitles() {
  const entries = collectVisitHistoryListEntries();
  if (entries.length === 0) {
    return;
  }

  const postIds = [...new Set(entries.map((entry) => entry.postId))];
  const requestId = ++visitHistoryStyleRequestId;
  try {
    const result = await sendExtensionMessage("visitHistory:getVisitedIds", { postIds });
    if (requestId !== visitHistoryStyleRequestId) {
      return;
    }

    const visitedPostIds = new Set(result?.postIds || []);
    entries.forEach((entry) => {
      entry.titleLink.classList.toggle("nsh-visited-post-title", visitedPostIds.has(entry.postId));
    });
  } catch (_error) {
    // Styling read titles is best-effort only.
  }
}

function collectVisitHistoryListEntries() {
  return Array.from(document.querySelectorAll(".post-list-item, .content-item"))
    .map((item) => {
      const titleLink = item.querySelector(".post-title a[href^='/post-'], .post-title a[href*='/post-']")
        || item.querySelector("a[href^='/post-'], a[href*='/post-']");
      const url = toVisitHistoryUrl(titleLink?.getAttribute("href"));
      const postId = getVisitHistoryPostIdFromPath(url?.pathname || "");
      return titleLink && url?.origin === location.origin && postId ? { titleLink, postId } : null;
    })
    .filter(Boolean);
}

function getVisitHistoryCurrentTitle() {
  return cleanText(
    document.querySelector(".post-title-link")?.textContent
    || document.querySelector("h1 a[href^='/post-'], h1 a[href*='/post-']")?.textContent
    || document.querySelector(".post-title h1")?.textContent
    || document.querySelector("h1")?.textContent
    || document.title.replace(/\s*-\s*NodeSeek.*$/i, "")
  ) || "NodeSeek 帖子";
}

function getVisitHistoryPostIdFromPath(pathname) {
  return pathname.match(/^\/post-(\d+)/)?.[1] || "";
}

function isVisitHistoryPostDetailPage(pathname) {
  return /^\/post-\d+(?:-\d+)?$/.test(pathname);
}

function getVisitHistoryCurrentContainer() {
  return document.querySelector(".content-item .nsk-content-meta-info")?.closest(".content-item")
    || document.querySelector(".post-list-item, .content-item")
    || document;
}

function getVisitHistoryAuthor(container) {
  const root = getVisitHistoryMetaRoot(container);
  const authorLink = root.querySelector(".author-info .author-name[href*='/space/']")
    || root.querySelector(".info-author a[href*='/space/']")
    || root.querySelector("a.author-name[href*='/space/']")
    || Array.from(root.querySelectorAll("a[href*='/space/']")).find((link) => cleanText(link.textContent));
  const authorUrl = toVisitHistoryUrl(authorLink?.getAttribute("href"))?.toString() || "";

  return {
    authorName: cleanText(authorLink?.textContent),
    authorId: getVisitHistoryAuthorId(authorUrl),
    authorUrl
  };
}

function getVisitHistoryAuthorId(authorUrl) {
  if (!authorUrl) {
    return "";
  }

  try {
    return decodeURIComponent(new URL(authorUrl).pathname.match(/^\/space\/([^/?#]+)/)?.[1] || "");
  } catch (_error) {
    return "";
  }
}

function getVisitHistoryPostedAt(container) {
  const detailCreatedText = getVisitHistoryDetailCreatedText();
  const detailCreatedAt = parseVisitHistoryTime(detailCreatedText);
  if (detailCreatedAt) {
    return {
      postedAt: detailCreatedAt,
      postedAtText: detailCreatedText
    };
  }

  const root = getVisitHistoryMetaRoot(container);
  const candidates = collectVisitHistoryTimeCandidates(root);
  for (const candidate of candidates) {
    const timestamp = parseVisitHistoryTime(candidate);
    if (timestamp) {
      return {
        postedAt: timestamp,
        postedAtText: candidate
      };
    }
  }

  return {
    postedAt: 0,
    postedAtText: ""
  };
}

function getVisitHistoryDetailCreatedText() {
  return cleanText(document.querySelector("div[id='0'] .date-created")?.textContent);
}

function getVisitHistoryMetaRoot(container) {
  return container?.querySelector?.(".nsk-content-meta-info")
    || container?.querySelector?.(".post-meta, .content-meta, .meta-info")
    || container
    || document;
}

function collectVisitHistoryTimeCandidates(root) {
  const candidates = [];
  root.querySelectorAll?.("time, [datetime], [data-time], [data-timestamp], [data-created-at], [title]").forEach((node) => {
    [
      node.getAttribute("datetime"),
      node.getAttribute("data-time"),
      node.getAttribute("data-timestamp"),
      node.getAttribute("data-created-at"),
      node.getAttribute("title"),
      node.textContent
    ].forEach((value) => {
      const text = cleanText(value);
      if (text) {
        candidates.push(text);
      }
    });
  });

  const metaText = cleanText(root.textContent);
  const absoluteMatch = metaText.match(/\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}[日]?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/);
  if (absoluteMatch) {
    candidates.push(absoluteMatch[0]);
  }

  const relativeMatch = metaText.match(/(?:刚刚|\d+\s*(?:秒|分钟|小时|天)前)/);
  if (relativeMatch) {
    candidates.push(relativeMatch[0]);
  }

  return [...new Set(candidates)];
}

function parseVisitHistoryTime(value) {
  const text = cleanText(value);
  if (!text) {
    return 0;
  }

  const numeric = Number(text);
  if (/^\d{10}(?:\d{3})?$/.test(text) && Number.isFinite(numeric) && numeric > 0) {
    return numeric > 100000000000 ? numeric : numeric * 1000;
  }

  const relative = parseVisitHistoryRelativeTime(text);
  if (relative) {
    return relative;
  }

  if (!isVisitHistoryAbsoluteDateText(text)) {
    return 0;
  }

  const normalized = text
    .replace(/[年月]/g, "-")
    .replace(/日/g, "")
    .replace(/\//g, "-");
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isVisitHistoryAbsoluteDateText(text) {
  return /\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}/.test(text);
}

function parseVisitHistoryRelativeTime(text) {
  if (text === "刚刚") {
    return Date.now();
  }

  const match = text.match(/^(\d+)\s*(秒|分钟|小时|天)前$/);
  if (!match) {
    return 0;
  }

  const value = Number(match[1]);
  const unitMs = {
    "秒": 1000,
    "分钟": 60 * 1000,
    "小时": 60 * 60 * 1000,
    "天": 24 * 60 * 60 * 1000
  }[match[2]];
  return value > 0 && unitMs ? Date.now() - value * unitMs : 0;
}

function toVisitHistoryUrl(value) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, location.origin);
  } catch (_error) {
    return null;
  }
}
