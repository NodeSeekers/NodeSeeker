function getProfileTrendCutoff(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days + 1);
  return date.getTime();
}

function getProfileRetentionCutoff(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days + 1);
  return date.getTime();
}

function getDateKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function normalizeMemberId(value) {
  return cleanText(value);
}

function normalizeUserCacheHours(value) {
  const hours = Number(value);
  return Number.isFinite(hours) ? Math.max(Math.floor(hours), 12) : 24;
}

function normalizeProfileRetentionDays(value) {
  const days = Number(value);
  return [30, 90, 180, 270, 360].includes(days) ? days : 0;
}

function hasProfileFields(profile) {
  return profile && typeof profile === "object" && Object.keys(profile).length > 0;
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString("zh-CN", {
    hour12: false
  });
}
