function handleAutoPageWheel(event) {
  if (
    !isAutoPageEnabled()
    || event.deltaY === 0
    || (isEditableScrollTarget(event.target) && isAutoPageEditableTargetFocused(event.target))
  ) {
    return;
  }

  if (hasAutoPageReplyDraft()) {
    autoPageWaitForReplyScroll = true;
    resetAutoPageEdgeArming();
    return;
  }

  autoPageWaitForReplyScroll = false;

  if (event.deltaY > 0) {
    tryAutoPageNext();
  } else {
    tryAutoPagePrevious();
  }
}

function handleAutoPageTouchStart(event) {
  if (!isAutoPageEnabled()) {
    autoPageTouchStartY = 0;
    return;
  }

  autoPageTouchStartY = event.touches?.[0]?.clientY || 0;
}

function handleAutoPageTouchMove(event) {
  if (!isAutoPageEnabled() || !autoPageTouchStartY || isEditableScrollTarget(event.target)) {
    return;
  }

  const currentY = event.touches?.[0]?.clientY || autoPageTouchStartY;
  const deltaY = autoPageTouchStartY - currentY;
  if (Math.abs(deltaY) < AUTO_PAGE_TOUCH_THRESHOLD) {
    return;
  }

  if (hasAutoPageReplyDraft()) {
    autoPageWaitForReplyScroll = true;
    resetAutoPageEdgeArming();
    return;
  }

  autoPageWaitForReplyScroll = false;

  if (deltaY > 0) {
    tryAutoPageNext();
  } else {
    tryAutoPagePrevious();
  }
}

function handleAutoPageShow(event) {
  autoPageNavigating = false;
  autoPageTouchStartY = 0;
  resetAutoPageEdgeArming();
  guardAutoPageAfterHistoryRestore(event.persisted);
}

function handleAutoPageScroll() {
  if (!isAutoPageEnabled() || isReplyEditorActive() || hasAutoPageReplyDraft()) {
    resetAutoPageEdgeArming();
    return;
  }

  if (autoPageWaitForReplyScroll) {
    if (Math.abs(getCurrentAutoPageScrollY() - autoPageReplyScrollY) < AUTO_PAGE_TOUCH_THRESHOLD) {
      resetAutoPageEdgeArming();
      return;
    }

    autoPageWaitForReplyScroll = false;
  }

  updateAutoPageEdgeArming();

  if (autoPageRequiresBottomReset && !isAtPageBottom()) {
    autoPageRequiresBottomReset = false;
  }

  if (autoPageRequiresTopReset && !isAtPageTop()) {
    autoPageRequiresTopReset = false;
  }

  if (isAutoPageAppendEnabled()) {
    tryAutoPageNext();
  }
}

function getCurrentAutoPageScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function isReplyEditorActive() {
  const active = toElement(document.activeElement);
  return Boolean(
    autoPageReplyEditor?.isConnected
    && active
    && (autoPageReplyEditor === active
      || autoPageReplyEditor.contains(active)
      || active.closest?.(".CodeMirror") === autoPageReplyEditor)
  );
}

function isAutoPageEditableTargetFocused(target) {
  const element = toElement(target);
  const active = toElement(document.activeElement);
  if (!element || !active) return false;
  const editableSelector = ".CodeMirror, textarea, input, [contenteditable]";
  const targetEditable = element.closest?.(editableSelector);
  const activeEditable = active.closest?.(editableSelector);
  return Boolean(targetEditable && activeEditable && (
    targetEditable === activeEditable
    || targetEditable.contains(activeEditable)
    || activeEditable.contains(targetEditable)
  ));
}

function hasAutoPageReplyDraft() {
  return Array.from(document.querySelectorAll(".CodeMirror")).some((editor) => {
    const editorValue = editor.CodeMirror?.getValue?.();
    if (editorValue !== undefined && editorValue !== null) {
      return hasMeaningfulAutoPageDraftText(editorValue);
    }

    const lines = Array.from(editor.querySelectorAll(".CodeMirror-line"));
    const value = lines.length > 0
      ? lines.map((line) => line.textContent || "").join("\n")
      : editor.querySelector(".CodeMirror-code")?.textContent || "";
    return hasMeaningfulAutoPageDraftText(value);
  });
}

function hasMeaningfulAutoPageDraftText(value) {
  return String(value || "").replace(/[\s\u200b\u200c\u200d\u2060\ufeff]/g, "").length > 0;
}

function updateAutoPageEdgeArming() {
  if (isAtPageBottom()) {
    scheduleAutoPageEdgeArm("bottom");
  } else {
    disarmAutoPageEdge("bottom");
  }

  if (isAtPageTop()) {
    scheduleAutoPageEdgeArm("top");
  } else {
    disarmAutoPageEdge("top");
  }
}

function initializeAutoPageHistoryGuard() {
  guardAutoPageAfterHistoryRestore(isBackForwardNavigation());
}

function guardAutoPageAfterHistoryRestore(isHistoryRestore) {
  if (!isHistoryRestore) {
    return;
  }

  window.setTimeout(() => {
    autoPageRequiresBottomReset = isAtPageBottom();
    autoPageRequiresTopReset = isAtPageTop();
  }, 0);
}

function isBackForwardNavigation() {
  return performance.getEntriesByType?.("navigation")?.[0]?.type === "back_forward";
}

function tryAutoPageNext() {
  if (!isAutoPageEnabled() || isReplyEditorActive() || hasAutoPageReplyDraft() || autoPageNavigating || autoPageAppendLoading || autoPageRequiresBottomReset || !isAtPageBottom()) {
    return;
  }

  const nextPageUrl = getNextAutoPageUrlForCurrentMode();
  if (!nextPageUrl) {
    return;
  }

  if (!autoPageBottomArmed) {
    scheduleAutoPageEdgeArm("bottom");
    return;
  }

  if (isAutoPageAppendEnabled()) {
    appendNextAutoPage(nextPageUrl);
    return;
  }

  navigateToPostPage(nextPageUrl);
}

function tryAutoPagePrevious() {
  if (!isAutoPageEnabled() || autoPageNavigating || autoPageAppendLoading || autoPageRequiresTopReset || !isAtPageTop()) {
    return;
  }

  const previousPageUrl = getPreviousAutoPageUrl();
  if (!previousPageUrl) {
    return;
  }

  if (!autoPageTopArmed) {
    scheduleAutoPageEdgeArm("top");
    return;
  }

  navigateToPostPage(previousPageUrl);
}

function navigateToNextPostPage() {
  return navigateToPostPageIfAvailable(getNextAutoPageUrl());
}

function navigateToPreviousPostPage() {
  return navigateToPostPageIfAvailable(getPreviousAutoPageUrl());
}

function navigateToPostPageIfAvailable(pageUrl) {
  if (!pageUrl || autoPageNavigating) {
    return false;
  }

  navigateToPostPage(pageUrl);
  return true;
}

function getNextAutoPageUrl(root = document, currentUrl = new URL(location.href)) {
  if (isAutoPagePostDetailPage(currentUrl)) {
    return getNextPostPageUrl(root, currentUrl);
  }

  return getNextPostListPageUrl(root, currentUrl);
}

function getPreviousAutoPageUrl(root = document, currentUrl = new URL(location.href)) {
  if (isAutoPagePostDetailPage(currentUrl)) {
    return getPreviousPostPageUrl(root, currentUrl);
  }

  return getPreviousPostListPageUrl(root, currentUrl);
}

function scheduleAutoPageEdgeArm(edge) {
  if (edge === "bottom") {
    if (autoPageBottomArmed) {
      return;
    }

    window.clearTimeout(autoPageBottomArmTimer);
    autoPageBottomArmTimer = window.setTimeout(() => {
      autoPageBottomArmed = isAtPageBottom();
      autoPageBottomArmTimer = 0;
      if (autoPageBottomArmed) tryAutoPageNext();
    }, featureOptions.autoPageDelayMs);
    return;
  }

  if (autoPageTopArmed) {
    return;
  }

  window.clearTimeout(autoPageTopArmTimer);
  autoPageTopArmTimer = window.setTimeout(() => {
    autoPageTopArmed = isAtPageTop();
    autoPageTopArmTimer = 0;
    if (autoPageTopArmed) tryAutoPagePrevious();
  }, featureOptions.autoPageDelayMs);
}

function disarmAutoPageEdge(edge) {
  if (edge === "bottom") {
    autoPageBottomArmed = false;
    window.clearTimeout(autoPageBottomArmTimer);
    autoPageBottomArmTimer = 0;
    return;
  }

  autoPageTopArmed = false;
  window.clearTimeout(autoPageTopArmTimer);
  autoPageTopArmTimer = 0;
}

function resetAutoPageEdgeArming() {
  disarmAutoPageEdge("bottom");
  disarmAutoPageEdge("top");
}

function getNextAutoPageUrlForCurrentMode() {
  if (!isAutoPageAppendEnabled()) {
    return getNextAutoPageUrl();
  }

  ensureAutoPageAppendState();
  return autoPageAppendNextUrl && !isAutoPageAppendUrlLoaded(autoPageAppendNextUrl)
    ? autoPageAppendNextUrl
    : "";
}

function ensureAutoPageAppendState() {
  const baseUrl = getAutoPageAppendBaseUrl();
  if (autoPageAppendInitialized && autoPageAppendBaseUrl === baseUrl) {
    return;
  }

  resetAutoPageAppendState();
  autoPageAppendInitialized = true;
  autoPageAppendBaseUrl = baseUrl;
  autoPageAppendLoadedUrls.add(normalizeAutoPageUrl(location.href));
  autoPageAppendNextUrl = getNextAutoPageUrl();
}

let autoPageAppendRequest = null;
let autoPageAppendItemKeys = null;

function resetAutoPageAppendState() {
  autoPageAppendRequest?.abort();
  autoPageAppendRequest = null;
  autoPageAppendItemKeys = null;
  autoPageAppendLoading = false;
  autoPageAppendInitialized = false;
  autoPageAppendBaseUrl = "";
  autoPageAppendNextUrl = "";
  autoPageAppendLoadedUrls = new Set();
}

function getAutoPageAppendBaseUrl() {
  return normalizeAutoPageUrl(location.href);
}

function isAutoPageAppendUrlLoaded(pageUrl) {
  const normalizedUrl = normalizeAutoPageUrl(pageUrl);
  return normalizedUrl && autoPageAppendLoadedUrls.has(normalizedUrl);
}

function appendNextAutoPage(pageUrl) {
  autoPageAppendLoading = true;
  resetAutoPageEdgeArming();
  const request = new AbortController();
  autoPageAppendRequest = request;
  const timeout = setTimeout(() => request.abort("timeout"), 20_000);
  loadAndAppendAutoPage(pageUrl, request.signal)
    .catch((error) => {
      if (request.signal.reason === "timeout") showAutoPageToast("自动翻页请求超时，可以再试一次", "error");
      else if (!request.signal.aborted) showAutoPageToast(formatAutoPageAppendError(error), "error");
    })
    .finally(() => {
      clearTimeout(timeout);
      if (autoPageAppendRequest !== request) return;
      autoPageAppendRequest = null;
      autoPageAppendLoading = false;
      autoPageTouchStartY = 0;
    });
}

async function loadAndAppendAutoPage(pageUrl, signal) {
  const sourceUrl = location.href;
  const targetUrl = toAutoPageUrl(pageUrl);
  if (!targetUrl || !isAutoPageAppendCompatibleUrl(targetUrl)) {
    throw new Error("自动翻页追加目标无效");
  }

  if (isAutoPageAppendUrlLoaded(targetUrl.toString())) {
    return;
  }

  const response = await fetch(targetUrl.toString(), {
    signal,
    credentials: "same-origin",
    headers: {
      Accept: "text/html,application/xhtml+xml"
    }
  });
  if (!response.ok) {
    throw new Error(`自动翻页追加请求失败：HTTP ${response.status}`);
  }

  const responseUrl = toAutoPageUrl(response.url || targetUrl.toString()) || targetUrl;
  if (!isAutoPageAppendCompatibleUrl(responseUrl)) {
    throw new Error("自动翻页追加响应地址不匹配");
  }

  const html = await response.text();
  if (signal?.aborted || location.href !== sourceUrl || !isAutoPageAppendEnabled()) return;
  const pageDocument = new DOMParser().parseFromString(html, "text/html");
  appendAutoPageItems(pageDocument, responseUrl);
  if (isPostDetailPath(responseUrl.pathname)) {
    syncAutoPageDetailPagers(pageDocument);
  } else {
    syncAutoPageListPagers(pageDocument);
  }
  autoPageAppendLoadedUrls.add(normalizeAutoPageUrl(responseUrl.toString()));
  setAutoPageAppendNextUrl(getNextAutoPageUrl(pageDocument, responseUrl));
  resetAutoPageEdgeArming();
}

function syncAutoPageDetailPagers(pageDocument) {
  [".post-top-pager", ".post-bottom-pager"].forEach((selector) => {
    const currentPager = document.querySelector(selector);
    const sourcePager = pageDocument.querySelector(selector);
    if (!currentPager || !sourcePager) return;

    const nextPager = document.importNode(sourcePager, true);
    const currentPage = nextPager.querySelector(".pager-pos.pager-cur");
    nextPager.querySelectorAll(".pager-pos[aria-current]").forEach((pageLink) => {
      if (pageLink !== currentPage) pageLink.removeAttribute("aria-current");
    });
    currentPage?.setAttribute("aria-current", "page");
    currentPager.replaceWith(nextPager);
  });
}

function syncAutoPageListPagers(pageDocument) {
  const currentPagers = Array.from(document.querySelectorAll(".nsk-pager"));
  const sourcePagers = Array.from(pageDocument.querySelectorAll(".nsk-pager"));

  currentPagers.forEach((currentPager, index) => {
    const sourcePager = sourcePagers[index];
    if (!sourcePager) return;

    const nextPager = document.importNode(sourcePager, true);
    const currentPage = nextPager.querySelector(".pager-pos.pager-cur");
    nextPager.querySelectorAll(".pager-pos[aria-current]").forEach((pageLink) => {
      if (pageLink !== currentPage) pageLink.removeAttribute("aria-current");
    });
    currentPage?.setAttribute("aria-current", "page");
    currentPager.replaceWith(nextPager);
  });
}

function appendAutoPageItems(pageDocument, pageUrl) {
  const currentUrl = new URL(location.href);
  const currentItems = getAutoPageAppendItems(document, currentUrl);
  const anchor = currentItems[currentItems.length - 1];
  if (!anchor) {
    throw new Error("未找到自动翻页追加位置");
  }

  const existingKeys = autoPageAppendItemKeys ||= new Set(
    currentItems.map((item) => getAutoPageAppendItemKey(item, currentUrl)).filter(Boolean)
  );
  const sourceItems = getAutoPageAppendItems(pageDocument, pageUrl)
    .filter((item) => {
      const key = getAutoPageAppendItemKey(item, pageUrl);
      if (key && existingKeys.has(key)) {
        return false;
      }

      if (key) {
        existingKeys.add(key);
      }
      return true;
    });

  if (sourceItems.length === 0) {
    throw new Error("下一页没有可追加内容");
  }

  const appendedComments = getAutoPageAppendedComments(pageDocument, sourceItems, pageUrl);
  const openPostLinksInNewTab = shouldOpenAutoPagePostLinksInNewTab(currentItems, currentUrl);
  const fragment = document.createDocumentFragment();
  sourceItems.forEach((item) => {
    const importedItem = document.importNode(item, true);
    syncAutoPagePostLinkTargets(importedItem, openPostLinksInNewTab, pageUrl);
    fragment.appendChild(importedItem);
  });
  anchor.after(fragment);

  if (appendedComments.length > 0) {
    window.dispatchEvent(new CustomEvent(AUTO_PAGE_COMMENTS_EVENT, {
      detail: { comments: appendedComments }
    }));
  }
}

function getAutoPageAppendedComments(pageDocument, sourceItems, pageUrl) {
  if (!isPostDetailPath(pageUrl.pathname)) {
    return [];
  }

  const comments = getAutoPagePostComments(pageDocument);
  const commentsByKey = new Map();
  comments.forEach((comment) => {
    if (comment?.floorIndex === undefined || comment?.floorIndex === null) {
      return;
    }

    commentsByKey.set(`floor:#${comment.floorIndex}`, comment);
    commentsByKey.set(`id:${comment.floorIndex}`, comment);
  });

  return sourceItems
    .map((item) => commentsByKey.get(getAutoPageAppendItemKey(item, pageUrl)))
    .filter(Boolean);
}

function getAutoPagePostComments(pageDocument) {
  const encodedConfig = pageDocument.querySelector("#temp-script")?.textContent?.replace(/\s+/g, "");
  if (!encodedConfig) {
    return [];
  }

  try {
    const bytes = atob(encodedConfig);
    const escaped = Array.from(bytes, (character) => {
      return `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`;
    }).join("");
    const config = JSON.parse(decodeURIComponent(escaped));
    return Array.isArray(config?.postData?.comments) ? config.postData.comments : [];
  } catch {
    return [];
  }
}

function getAutoPageAppendItems(root, pageUrl) {
  if (isPostDetailPath(pageUrl.pathname)) {
    return Array.from(getAutoPageDetailAppendScope(root).querySelectorAll(".content-item"));
  }

  const postListItems = Array.from(root.querySelectorAll(".post-list-item"));
  if (postListItems.length > 0) {
    return postListItems;
  }

  return Array.from(root.querySelectorAll(".content-item")).filter((item) => {
    return item.querySelector("a[href^='/post-'], a[href*='/post-']");
  });
}

function getAutoPageDetailAppendScope(root) {
  return root.querySelector("#nsk-body-left")
    || root.querySelector(".nsk-post-wrapper")
    || root.querySelector(".nsk-post")
    || root;
}

function getAutoPageAppendItemKey(item, pageUrl) {
  if (isPostDetailPath(pageUrl.pathname)) {
    const floor = Array.from(item.querySelectorAll("a"))
      .map((link) => cleanAutoPageText(link.textContent))
      .find((text) => /^#\d+$/.test(text));
    if (floor) {
      return `floor:${floor}`;
    }
    if (item.id) {
      return `id:${item.id}`;
    }
  }

  const postLink = item.querySelector("a[href^='/post-'], a[href*='/post-']");
  const postUrl = toAutoPageUrl(postLink?.getAttribute("href"), pageUrl);
  const postId = postUrl?.pathname.match(/^\/post-(\d+)/)?.[1];
  return postId ? `post:${postId}` : "";
}

function shouldOpenAutoPagePostLinksInNewTab(items, pageUrl) {
  if (isPostDetailPath(pageUrl.pathname)) {
    return false;
  }

  return items.some((item) => {
    const link = item.querySelector("a[href^='/post-'], a[href*='/post-']");
    return link?.getAttribute("target")?.toLowerCase() === "_blank";
  });
}

function syncAutoPagePostLinkTargets(item, openInNewTab, pageUrl) {
  if (!openInNewTab || isPostDetailPath(pageUrl.pathname)) {
    return;
  }

  item.querySelectorAll("a[href^='/post-'], a[href*='/post-']").forEach((link) => {
    const url = toAutoPageUrl(link.getAttribute("href"), pageUrl);
    if (url?.origin === location.origin && isPostDetailPath(url.pathname)) {
      link.target = "_blank";
    }
  });
}

function setAutoPageAppendNextUrl(pageUrl) {
  autoPageAppendNextUrl = pageUrl && !isAutoPageAppendUrlLoaded(pageUrl) ? pageUrl : "";
}

function isAutoPageAppendCompatibleUrl(pageUrl) {
  const currentUrl = new URL(location.href);
  if (isPostDetailPath(currentUrl.pathname)) {
    return getAutoPagePostId(currentUrl.pathname) === getAutoPagePostId(pageUrl.pathname);
  }

  return !isPostDetailPath(pageUrl.pathname)
    && getPostListRouteKey(currentUrl) === getPostListRouteKey(pageUrl);
}

function getAutoPagePostId(pathname) {
  return pathname.match(/^\/post-(\d+)/)?.[1] || "";
}

function showAutoPageToast(message, type = "error") {
  const toast = document.createElement("div");
  toast.className = `nsh-auto-page-toast nsh-auto-page-toast-${type === "error" ? "error" : "status"}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.textContent = message;

  window.clearTimeout(showAutoPageToast.timer);
  document.querySelectorAll(".nsh-auto-page-toast").forEach((node) => node.remove());
  document.body.appendChild(toast);
  showAutoPageToast.timer = window.setTimeout(() => {
    toast.remove();
  }, 3600);
}

function formatAutoPageAppendError(error) {
  const detail = error?.message || String(error || "");
  return detail ? `自动翻页追加失败：${detail}` : "自动翻页追加失败";
}

function navigateToPostPage(pageUrl) {
  autoPageNavigating = true;
  resetAutoPageEdgeArming();
  try {
    history.pushState({ nodeseekHelperAutoPage: true }, "", location.href);
    location.replace(pageUrl);
  } catch {
    location.assign(pageUrl);
  }
}

function isAtPageTop() {
  return window.scrollY <= AUTO_PAGE_BOTTOM_THRESHOLD;
}

function isAtPageBottom() {
  const documentElement = document.documentElement;
  const body = document.body;
  const scrollHeight = Math.max(
    documentElement.scrollHeight,
    documentElement.offsetHeight,
    body?.scrollHeight || 0,
    body?.offsetHeight || 0
  );

  return window.scrollY + window.innerHeight >= scrollHeight - AUTO_PAGE_BOTTOM_THRESHOLD;
}

function getNextPostPageUrl(root = document, currentUrl = new URL(location.href)) {
  const match = currentUrl.pathname.match(/^\/post-(\d+)-(\d+)$/);
  if (!match) {
    return "";
  }

  const postId = match[1];
  const nextPage = Number(match[2]) + 1;
  const nextPath = `/post-${postId}-${nextPage}`;
  const nextLink = Array.from(root.querySelectorAll("a[href]")).find((link) => {
    const url = toAutoPageUrl(link.getAttribute("href"), currentUrl);
    return url?.origin === location.origin && url.pathname === nextPath;
  });

  return nextLink ? toAutoPageAbsoluteUrl(nextLink.getAttribute("href"), currentUrl) : "";
}

function getPreviousPostPageUrl(root = document, currentUrl = new URL(location.href)) {
  const match = currentUrl.pathname.match(/^\/post-(\d+)-(\d+)$/);
  if (!match) {
    return "";
  }

  const postId = match[1];
  const currentPage = Number(match[2]);
  if (currentPage <= 1) {
    return "";
  }

  const previousPath = `/post-${postId}-${currentPage - 1}`;
  const previousLink = Array.from(root.querySelectorAll("a[href]")).find((link) => {
    const url = toAutoPageUrl(link.getAttribute("href"), currentUrl);
    return url?.origin === location.origin && url.pathname === previousPath;
  });

  return previousLink ? toAutoPageAbsoluteUrl(previousLink.getAttribute("href"), currentUrl) : "";
}

function getNextPostListPageUrl(root = document, currentUrl = new URL(location.href)) {
  return getPostListPageUrl(1, root, currentUrl);
}

function getPreviousPostListPageUrl(root = document, currentUrl = new URL(location.href)) {
  return getPostListPageUrl(-1, root, currentUrl);
}

function getPostListPageUrl(step, root = document, currentUrl = new URL(location.href)) {
  if (!isAutoPagePostListPage(root, currentUrl)) {
    return "";
  }

  const currentPage = getCurrentPostListPageNumber(currentUrl);
  const targetPage = currentPage + step;
  if (targetPage < 1) {
    return "";
  }

  return findPostListPageLink(targetPage, root, currentUrl);
}

function findPostListPageLink(targetPage, root = document, currentUrl = new URL(location.href)) {
  const currentRouteKey = getPostListRouteKey(currentUrl);
  const link = Array.from(root.querySelectorAll("a[href]")).find((candidate) => {
    const url = toAutoPageUrl(candidate.getAttribute("href"), currentUrl);
    return isPostListPageLink(candidate, url, targetPage, currentRouteKey);
  });

  return link ? toAutoPageAbsoluteUrl(link.getAttribute("href"), currentUrl) : "";
}

function isPostListPageLink(link, url, targetPage, currentRouteKey) {
  return Boolean(
    url
    && url.origin === location.origin
    && !isPostDetailPath(url.pathname)
    && getPostListRouteKey(url) === currentRouteKey
    && getPostListPageNumberFromLink(link, url) === targetPage
  );
}

function getCurrentPostListPageNumber(currentUrl = new URL(location.href)) {
  return getPostListPageNumberFromUrl(currentUrl) || 1;
}

function getPostListPageNumberFromLink(link, url) {
  const labelPage = Number(cleanAutoPageText(link.textContent));
  if (Number.isInteger(labelPage) && labelPage > 0) {
    return labelPage;
  }

  return getPostListPageNumberFromUrl(url) || 1;
}

function getPostListPageNumberFromUrl(url) {
  const queryPage = Number(url.searchParams.get("page"));
  if (Number.isInteger(queryPage) && queryPage > 0) {
    return queryPage;
  }

  const pathPage = getPostListPathPage(url.pathname);
  return pathPage?.page || 0;
}

function getPostListRouteKey(url) {
  const routeUrl = new URL(url.href);
  const pathPage = getPostListPathPage(routeUrl.pathname);
  routeUrl.hash = "";
  routeUrl.pathname = normalizePostListPathname(pathPage?.pathname || routeUrl.pathname);
  routeUrl.searchParams.delete("page");
  return `${routeUrl.pathname}?${getSortedSearchParams(routeUrl.searchParams)}`;
}

function getPostListPathPage(pathname) {
  const slashPageMatch = pathname.match(/^(.*\/)page\/(\d+)\/?$/);
  if (slashPageMatch) {
    return {
      pathname: normalizePostListPathname(slashPageMatch[1]),
      page: Number(slashPageMatch[2])
    };
  }

  const dashPageMatch = pathname.match(/^(.*?)(?:\/)?page-(\d+)\/?$/);
  if (dashPageMatch) {
    return {
      pathname: normalizePostListPathname(dashPageMatch[1]),
      page: Number(dashPageMatch[2])
    };
  }

  return null;
}

function normalizePostListPathname(pathname) {
  const normalized = pathname || "/";
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function getSortedSearchParams(searchParams) {
  return Array.from(searchParams.entries())
    .sort(([firstKey, firstValue], [secondKey, secondValue]) => {
      return firstKey.localeCompare(secondKey) || firstValue.localeCompare(secondValue);
    })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function toAutoPageUrl(value, baseUrl = new URL(location.href)) {
  try {
    return new URL(value, baseUrl);
  } catch {
    return null;
  }
}

function toAutoPageAbsoluteUrl(value, baseUrl = new URL(location.href)) {
  return toAutoPageUrl(value, baseUrl)?.toString() || "";
}

function normalizeAutoPageUrl(value, baseUrl = new URL(location.href)) {
  const url = toAutoPageUrl(value, baseUrl);
  if (!url) {
    return "";
  }

  url.hash = "";
  return url.toString();
}

function isAutoPagePostDetailPage(currentUrl = new URL(location.href)) {
  return isPostDetailPath(currentUrl.pathname);
}

function isPostDetailPath(pathname) {
  return /^\/post-\d+(?:-\d+)?$/.test(pathname);
}

function isAutoPagePostListPage(root = document, currentUrl = new URL(location.href)) {
  return !isAutoPagePostDetailPage(currentUrl) && Boolean(
    root.querySelector(".post-list-item a[href*='/post-'], .content-item a[href*='/post-']")
  );
}

function cleanAutoPageText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function isEditableScrollTarget(target) {
  const element = toElement(target);
  return Boolean(element?.closest?.(".CodeMirror, textarea, input, [contenteditable]"));
}

function isAutoPageEnabled() {
  return featureOptions.readingNavigationEnabled && featureOptions.autoPageEnabled;
}

function isAutoPageAppendEnabled() {
  return isAutoPageEnabled() && featureOptions.autoPageAppendEnabled;
}
