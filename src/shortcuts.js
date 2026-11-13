const DEFAULT_READING_SHORTCUTS = {
  postPagePreviousShortcut: "Alt+Shift+ArrowUp",
  postPageNextShortcut: "Alt+Shift+ArrowDown",
  postSwitcherPreviousShortcut: "Alt+Shift+ArrowLeft",
  postSwitcherNextShortcut: "Alt+Shift+ArrowRight",
  quickReplyShortcut: "",
  replySubmitShortcut: detectShortcutPlatform() === "mac" ? "Meta+Enter" : "Ctrl+Enter",
  quickPhraseShortcut: ""
};
const SHORTCUT_MODIFIERS = ["Ctrl", "Alt", "Shift", "Meta"];
const SHORTCUT_MODIFIER_LABELS = {
  mac: {
    Ctrl: "Control",
    Alt: "Option",
    Shift: "Shift",
    Meta: "Command"
  },
  windows: {
    Ctrl: "Ctrl",
    Alt: "Alt",
    Shift: "Shift",
    Meta: "Win"
  },
  default: {
    Ctrl: "Ctrl",
    Alt: "Alt",
    Shift: "Shift",
    Meta: "Meta"
  }
};
const SHORTCUT_KEY_NAMES = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  "Space",
  "Enter",
  "Escape",
  "Backspace",
  "Delete",
  "Insert"
];

function normalizeShortcut(value, fallback = "") {
  if (value === "") {
    return "";
  }

  const parts = String(value || "").split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  const key = normalizeShortcutKey(parts.pop());
  const modifiers = new Set(parts.map(normalizeShortcutModifier).filter(Boolean));
  if (!key || modifiers.size === 0) {
    return fallback;
  }

  return [
    ...SHORTCUT_MODIFIERS.filter((modifier) => modifiers.has(modifier)),
    key
  ].join("+");
}

function formatShortcutForDisplay(shortcut, platform = detectShortcutPlatform()) {
  const normalized = normalizeShortcut(shortcut);
  if (!normalized) {
    return "";
  }

  return normalized.split("+")
    .map((part) => formatShortcutPartForDisplay(part, platform))
    .join("+");
}

function formatShortcutPartForDisplay(part, platform) {
  const labels = SHORTCUT_MODIFIER_LABELS[platform] || SHORTCUT_MODIFIER_LABELS.default;
  return labels[part] || part;
}

function detectShortcutPlatform() {
  const platform = typeof navigator === "undefined"
    ? ""
    : String(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || "");
  const normalized = platform.toLowerCase();
  if (/(mac|iphone|ipad|ipod)/.test(normalized)) {
    return "mac";
  }

  if (normalized.includes("win")) {
    return "windows";
  }

  return "default";
}

function normalizeShortcutFromEvent(event) {
  const key = normalizeShortcutKey(event.key);
  if (!key || !hasShortcutModifier(event)) {
    return "";
  }

  return [
    event.ctrlKey ? "Ctrl" : "",
    event.altKey ? "Alt" : "",
    event.shiftKey ? "Shift" : "",
    event.metaKey ? "Meta" : "",
    key
  ].filter(Boolean).join("+");
}

function normalizeShortcutModifier(value) {
  switch (String(value || "").toLowerCase()) {
    case "ctrl":
    case "control":
    case "ctl":
    case "⌃":
      return "Ctrl";
    case "alt":
    case "option":
    case "opt":
    case "⌥":
      return "Alt";
    case "shift":
    case "⇧":
      return "Shift";
    case "meta":
    case "cmd":
    case "command":
    case "win":
    case "windows":
    case "super":
    case "⌘":
      return "Meta";
    default:
      return "";
  }
}

function normalizeShortcutKey(value) {
  const key = String(value || "").trim();
  const aliases = {
    " ": "Space",
    spacebar: "Space",
    esc: "Escape",
    del: "Delete",
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight"
  };
  const alias = aliases[key] || aliases[key.toLowerCase()];
  if (alias) {
    return alias;
  }

  if (/^[a-z0-9]$/i.test(key)) {
    return key.toUpperCase();
  }

  if (/^f(?:[1-9]|1[0-2])$/i.test(key)) {
    return key.toUpperCase();
  }

  return SHORTCUT_KEY_NAMES.find((candidate) => candidate.toLowerCase() === key.toLowerCase()) || "";
}

function hasShortcutModifier(event) {
  return event.ctrlKey || event.altKey || event.shiftKey || event.metaKey;
}
