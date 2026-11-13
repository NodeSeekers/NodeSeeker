let quickJumpEnabled = false;

document.addEventListener("click", handleQuickJumpLinkClick, true);
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.quickJumpEnabled) return;
  quickJumpEnabled = changes.quickJumpEnabled.newValue !== false;
  if (quickJumpEnabled) redirectCurrentQuickJump();
});

chrome.storage.local.get({ quickJumpEnabled: true }).then((options) => {
  quickJumpEnabled = options.quickJumpEnabled !== false;
  if (quickJumpEnabled) redirectCurrentQuickJump();
}).catch(() => {});

function handleQuickJumpLinkClick(event) {
  if (!quickJumpEnabled || event.defaultPrevented || event.button !== 0) return;
  const element = event.target instanceof Element ? event.target : event.target?.parentElement;
  const anchor = element?.closest?.(".post-content a[href], .comment-content a[href]");
  if (!anchor) return;

  const target = getQuickJumpTarget(anchor.href);
  if (target) anchor.href = target;
}

function redirectCurrentQuickJump() {
  if (location.pathname !== "/jump") return;
  const target = getQuickJumpTarget(location.href);
  if (target) location.replace(target);
}

function getQuickJumpTarget(value) {
  try {
    let url = new URL(value, location.origin);
    if (url.origin !== location.origin || url.pathname !== "/jump") return "";

    for (let depth = 0; depth < 3 && url.origin === location.origin && url.pathname === "/jump"; depth += 1) {
      const target = url.searchParams.get("to");
      if (!target) return "";
      url = new URL(target, location.origin);
      if (!/^https?:$/.test(url.protocol)) return "";
    }

    return url.origin === location.origin && url.pathname === "/jump" ? "" : url.href;
  } catch (_error) {
    return "";
  }
}
