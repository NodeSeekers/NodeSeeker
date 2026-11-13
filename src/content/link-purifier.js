const LINK_PURIFIER_SELECTOR = ".post-content a[href], .comment-content a[href]";
const SHORT_LINK_HOSTS = new Set([
  "bit.ly", "t.co", "t.cn", "ow.ly", "is.gd", "buff.ly", "tinyurl.com", "shorturl.at", "rebrand.ly", "b23.tv"
]);
const TRACKING_QUERY_PARAMS = new Set([
  "fbclid", "gclid", "dclid", "gbraid", "wbraid", "msclkid", "yclid", "igshid",
  "mc_cid", "mc_eid", "mkt_tok", "vero_id", "ref_src", "ref_url", "spm"
]);
const pendingShortLinks = new WeakSet();

function initLinkPurifier() {
  document.addEventListener("click", handleShortLinkClick, true);
  scanLinksForPurification();
  new MutationObserver(() => scanLinksForPurification()).observe(document.body, { childList: true, subtree: true });
}

function scanLinksForPurification(root = document) {
  if (!featureOptions.linkPurifierEnabled) return;
  const anchors = [];
  if (root instanceof Element && root.matches(LINK_PURIFIER_SELECTOR)) anchors.push(root);
  anchors.push(...(root.querySelectorAll?.(LINK_PURIFIER_SELECTOR) || []));
  anchors.forEach((anchor) => {
    const original = anchor.getAttribute("href");
    const unwrapped = unwrapNodeSeekJumpUrl(original);
    if (unwrapped && unwrapped !== original) anchor.setAttribute("href", unwrapped);
    const safe = sanitizeExternalUrl(anchor.getAttribute("href"));
    if (safe && safe !== anchor.getAttribute("href")) anchor.setAttribute("href", safe);
    resolveShortLinkForAnchor(anchor);
  });
}

function unwrapNodeSeekJumpUrl(value) {
  if (!value) return "";
  try {
    let url = new URL(value, location.href);
    for (let depth = 0; depth < 3 && url.origin === location.origin && url.pathname === "/jump"; depth += 1) {
      const target = url.searchParams.get("to");
      if (!target) break;
      const next = new URL(target, location.origin);
      if (!/^https?:$/.test(next.protocol)) break;
      url = next;
    }
    return url.href;
  } catch (_error) {
    return "";
  }
}

function sanitizeExternalUrl(value) {
  try {
    const url = new URL(value, location.href);
    if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) return "";
    for (const key of [...url.searchParams.keys()]) {
      const normalized = key.toLowerCase();
      if (normalized.startsWith("utm_") || TRACKING_QUERY_PARAMS.has(normalized)) url.searchParams.delete(key);
    }
    return url.href;
  } catch (_error) {
    return "";
  }
}

async function resolveShortLinkForAnchor(anchor) {
  if (!featureOptions.linkPurifierEnabled || pendingShortLinks.has(anchor)) return;
  let url;
  try { url = new URL(anchor.href); } catch (_error) { return; }
  if (!SHORT_LINK_HOSTS.has(url.hostname.toLowerCase())) return;
  pendingShortLinks.add(anchor);
  const original = anchor.href;
  try {
    const response = await chrome.runtime.sendMessage({ type: "links:resolveShort", payload: { url: original } });
    const resolved = response?.ok ? sanitizeExternalUrl(response.result?.url) : "";
    if (resolved && anchor.isConnected && anchor.href === original) anchor.href = resolved;
  } catch (_error) {
    // Keep the original short link if permission is missing or resolution fails.
  } finally {
    pendingShortLinks.delete(anchor);
  }
}

function handleShortLinkClick(event) {
  if (!featureOptions.linkPurifierEnabled || event.defaultPrevented || event.button !== 0) return;
  const anchor = toElement(event.target)?.closest?.(LINK_PURIFIER_SELECTOR);
  if (!anchor || !pendingShortLinks.has(anchor)) return;
  event.preventDefault();
  event.stopPropagation();
  const original = anchor.href;
  chrome.runtime.sendMessage({ type: "links:resolveShort", payload: { url: original } })
    .then((response) => location.assign(response?.ok ? sanitizeExternalUrl(response.result?.url) || original : original))
    .catch(() => location.assign(original));
}
