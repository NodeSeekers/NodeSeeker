const POST_SWITCHER_STORAGE_KEY = "nshPostSwitcherSequence";
const POST_SWITCHER_SEQUENCE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const POST_SWITCHER_STORAGE_REFRESH_MS = 60 * 60 * 1000;
let lastSavedPostSwitcherSequence = null;

function scanPostSwitcher() {
  scanPostSwitcherAsync().catch(() => {
    removePostSwitcherButtons();
  });
}

async function scanPostSwitcherAsync() {
  if (!featureOptions.readingNavigationEnabled || !featureOptions.postSwitcherEnabled) {
    removePostSwitcherButtons();
    await clearPostSwitcherSequence();
    return;
  }

  const currentPostId = getPostSwitcherCurrentPostId();
  if (currentPostId) {
    await renderPostSwitcherButtons(currentPostId);
    return;
  }

  removePostSwitcherButtons();
  await savePostSwitcherSequence();
}

async function savePostSwitcherSequence() {
  const posts = collectPostSwitcherPosts();
  if (posts.length < 2) {
    await clearPostSwitcherSequence();
    return;
  }

  const now = Date.now();
  const listUrl = location.href;
  if (
    lastSavedPostSwitcherSequence?.listUrl === listUrl
    && JSON.stringify(lastSavedPostSwitcherSequence.posts) === JSON.stringify(posts)
    && now - lastSavedPostSwitcherSequence.capturedAt < POST_SWITCHER_STORAGE_REFRESH_MS
  ) {
    return;
  }

  const sequence = { capturedAt: now, listUrl, posts };
  const previousSequence = lastSavedPostSwitcherSequence;
  lastSavedPostSwitcherSequence = sequence;
  try {
    await chrome.storage.local.set({
      [POST_SWITCHER_STORAGE_KEY]: sequence
    });
  } catch {
    if (lastSavedPostSwitcherSequence === sequence) {
      lastSavedPostSwitcherSequence = previousSequence;
    }
    // Ignore storage failures; the switcher can simply stay hidden on detail pages.
  }
}

function collectPostSwitcherPosts() {
  const seenPostIds = new Set();
  return getPostSwitcherListLinks()
    .map((link) => buildPostSwitcherEntry(link))
    .filter((entry) => {
      if (!entry || seenPostIds.has(entry.id)) {
        return false;
      }

      seenPostIds.add(entry.id);
      return true;
    });
}

function getPostSwitcherListLinks() {
  return Array.from(document.querySelectorAll(".post-list-item, .content-item"))
    .map((item) => {
      return item.querySelector(".post-title a[href^='/post-'], .post-title a[href*='/post-']")
        || item.querySelector("a[href^='/post-'], a[href*='/post-']");
    })
    .filter(Boolean);
}

function buildPostSwitcherEntry(link) {
  const url = toPostSwitcherUrl(link.getAttribute("href"));
  if (!url || url.origin !== location.origin) {
    return null;
  }

  const id = getPostSwitcherPostIdFromPath(url.pathname);
  if (!id) {
    return null;
  }

  return {
    id,
    url: url.toString(),
    title: cleanPostSwitcherText(link.textContent) || `帖子 ${id}`
  };
}

async function renderPostSwitcherButtons(currentPostId) {
  const sequence = await readPostSwitcherSequence();
  const posts = Array.isArray(sequence?.posts) ? sequence.posts : [];
  const currentIndex = posts.findIndex((post) => post?.id === currentPostId);
  if (currentIndex < 0) {
    removePostSwitcherButtons();
    return;
  }

  renderPostSwitcherButton("previous", posts[currentIndex - 1]);
  renderPostSwitcherButton("next", posts[currentIndex + 1]);
}

async function readPostSwitcherSequence() {
  try {
    const result = await chrome.storage.local.get(POST_SWITCHER_STORAGE_KEY);
    const sequence = result?.[POST_SWITCHER_STORAGE_KEY];
    if (!isPostSwitcherSequenceValid(sequence)) {
      await clearPostSwitcherSequence();
      return null;
    }

    return sequence;
  } catch {
    return null;
  }
}

function isPostSwitcherSequenceValid(sequence) {
  const capturedAt = Number(sequence?.capturedAt) || 0;
  return Array.isArray(sequence?.posts)
    && sequence.posts.length >= 2
    && capturedAt > 0
    && Date.now() - capturedAt <= POST_SWITCHER_SEQUENCE_MAX_AGE_MS;
}

function renderPostSwitcherButton(direction, post) {
  const postUrl = toPostSwitcherUrl(post?.url);
  if (!postUrl || postUrl.origin !== location.origin || !getPostSwitcherPostIdFromPath(postUrl.pathname)) {
    removePostSwitcherButton(direction);
    return;
  }

  const button = ensurePostSwitcherButton(direction);
  button.dataset.nshPostUrl = postUrl.toString();
  button.title = `${direction === "previous" ? "上一篇帖子" : "下一篇帖子"}：${post.title || ""}`;
  button.setAttribute("aria-label", direction === "previous" ? "上一篇帖子" : "下一篇帖子");
}

function ensurePostSwitcherButton(direction) {
  let button = document.querySelector(`.nsh-post-switch-${direction}`);
  if (button) {
    return button;
  }

  button = document.createElement("button");
  button.type = "button";
  button.className = `nsh-post-switch-button nsh-post-switch-${direction}`;
  button.addEventListener("click", handlePostSwitcherButtonClick);
  document.body.appendChild(button);
  return button;
}

function handlePostSwitcherButtonClick(event) {
  navigateToPostSwitcherUrl(event.currentTarget.dataset.nshPostUrl);
}

async function navigatePostSwitcher(direction) {
  if (!featureOptions.readingNavigationEnabled || !featureOptions.postSwitcherEnabled) {
    return false;
  }

  const currentPostId = getPostSwitcherCurrentPostId();
  if (!currentPostId) {
    return false;
  }

  const sequence = await readPostSwitcherSequence();
  const posts = Array.isArray(sequence?.posts) ? sequence.posts : [];
  const currentIndex = posts.findIndex((post) => post?.id === currentPostId);
  if (currentIndex < 0) {
    return false;
  }

  const targetPost = direction === "previous"
    ? posts[currentIndex - 1]
    : posts[currentIndex + 1];

  return navigateToPostSwitcherUrl(targetPost?.url);
}

function navigateToPostSwitcherUrl(targetUrl) {
  const postUrl = toPostSwitcherUrl(targetUrl);
  if (!postUrl || postUrl.origin !== location.origin || !getPostSwitcherPostIdFromPath(postUrl.pathname)) {
    return false;
  }

  location.assign(postUrl.toString());
  return true;
}

function removePostSwitcherButtons() {
  removePostSwitcherButton("previous");
  removePostSwitcherButton("next");
}

function removePostSwitcherButton(direction) {
  document.querySelector(`.nsh-post-switch-${direction}`)?.remove();
}

async function clearPostSwitcherSequence() {
  lastSavedPostSwitcherSequence = null;
  try {
    await chrome.storage.local.remove(POST_SWITCHER_STORAGE_KEY);
  } catch {
    // Ignore storage failures; stale context is non-critical.
  }
}

function getPostSwitcherCurrentPostId() {
  return getPostSwitcherPostIdFromPath(location.pathname);
}

function getPostSwitcherPostIdFromPath(pathname) {
  return pathname.match(/^\/post-(\d+)(?:-\d+)?$/)?.[1] || "";
}

function toPostSwitcherUrl(value) {
  try {
    return new URL(value, location.origin);
  } catch {
    return null;
  }
}

function cleanPostSwitcherText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}
