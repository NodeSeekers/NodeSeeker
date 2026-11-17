const PROFILE_ACTIVITY_LIMIT = 10;
const PROFILE_ACTIVITY_COMMENT_PAGE_SIZE = 10;
const PROFILE_ACTIVITY_SWITCH_DELAY_MS = 250;
const PROFILE_TREND_SHOW_DELAY_MS = 200;
const profileActivityCache = new Map();
let profileTrendShowAnchor = null;
let profileTrendShowTimer = 0;
let profileActivityPopup = null;
let profileActivityAnchor = null;
let profileActivityRequestId = 0;
let profileActivityHideTimer = 0;
let profileActivityShowAnchor = null;
let profileActivityShowTimer = 0;

function scanUserStats() {
  if (!featureOptions.userStatsEnabled) {
    removeRenderedProfiles();
    return;
  }

  document.querySelectorAll(".content-item .nsk-content-meta-info").forEach((meta) => {
    if (meta.closest(".nsh-blocked-content")) {
      return;
    }

    if (meta.dataset.nshStatsBound === "1") {
      return;
    }

    const authorLink = meta.querySelector(".author-info .author-name[href^='/space/']");
    const authorInfo = meta.querySelector(".author-info");
    const avatarLink = meta.querySelector(".avatar-wrapper a[href^='/space/']");
    const memberId = getMemberId(authorLink);

    if (!authorLink || !authorInfo || !memberId) {
      return;
    }

    meta.dataset.nshStatsBound = "1";

    Promise.all([loadProfile(memberId), getLevelColors()])
      .then(([profile, levelColors]) => renderProfile(authorInfo, memberId, cleanText(authorLink.textContent), profile, levelColors))
      .catch(() => {});
    bindProfileTrendPopup(avatarLink, memberId, cleanText(authorLink.textContent));
  });
}

function scanProfileTrendAvatars() {
  document.querySelectorAll("a[href*='/space/']").forEach((avatarLink) => {
    if (!isPostListAvatarLink(avatarLink)) {
      return;
    }

    const memberId = getMemberId(avatarLink);
    if (!memberId) {
      return;
    }

    if (avatarLink.closest(".nsh-blocked-content")) {
      return;
    }

    bindProfileTrendPopup(avatarLink, memberId, getAvatarMemberName(avatarLink, memberId));
  });
}

function scanProfileProgressTriggers() {
  const card = document.querySelector("#nsk-right-panel-container .user-card:not(.hover-user-card)");
  if (!card) return;
  const memberId = getMemberId(card.querySelector("a[href^='/space/']"));
  if (!memberId) return;

  const trigger = Array.from(card.querySelectorAll(".user-stat *")).find((node) => {
    return /^等级\s*Lv\s*\d+$/i.test(String(node.textContent || "").replace(/\s+/g, " ").trim());
  });
  if (!trigger || trigger.dataset.nshProgressBound === "1") return;

  trigger.dataset.nshProgressBound = "1";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.addEventListener("mouseenter", () => showProfileProgressPopup(trigger, memberId));
  trigger.addEventListener("mouseleave", scheduleHideProfileProgressPopup);
  trigger.addEventListener("focus", () => showProfileProgressPopup(trigger, memberId));
  trigger.addEventListener("blur", scheduleHideProfileProgressPopup);
}

async function showProfileProgressPopup(anchor, memberId) {
  cancelHideProfileProgressPopup();
  const requestId = ++profileProgressRequestId;
  profileProgressAnchor = anchor;
  const popup = ensureProfileProgressPopup();
  renderProfileProgressMessage(popup, "正在加载进度…");
  positionProfileProgressPopup(popup, anchor);
  popup.classList.add("is-open");

  try {
    const progress = await loadProfileProgressData(memberId);
    if (requestId !== profileProgressRequestId || profileProgressAnchor !== anchor) return;
    renderProfileProgress(popup, progress);
    positionProfileProgressPopup(popup, anchor);
  } catch (_error) {
    if (requestId !== profileProgressRequestId || profileProgressAnchor !== anchor) return;
    renderProfileProgressMessage(popup, "暂时无法加载进度");
    positionProfileProgressPopup(popup, anchor);
  }
}

function ensureProfileProgressPopup() {
  if (profileProgressPopup?.isConnected) return profileProgressPopup;
  const popup = document.createElement("section");
  popup.className = "nsh-profile-progress-popup";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", "NodeSeek 每日进度");
  popup.addEventListener("mouseenter", cancelHideProfileProgressPopup);
  popup.addEventListener("mouseleave", scheduleHideProfileProgressPopup);
  document.body.appendChild(popup);
  profileProgressPopup = popup;
  return popup;
}

async function loadProfileProgressData(memberId) {
  const now = Date.now();
  if (
    profileProgressCache?.memberId === memberId
    && now - profileProgressCacheLoadedAt < PROFILE_PROGRESS_CACHE_TTL_MS
  ) {
    return profileProgressCache;
  }
  if (profileProgressPromise && profileProgressPromiseMemberId === memberId) return profileProgressPromise;
  if (profileProgressPromise) await profileProgressPromise.catch(() => {});

  profileProgressPromiseMemberId = memberId;
  profileProgressPromise = Promise.allSettled([
    loadProfile(memberId),
    fetch("/api/progress/today", {
      credentials: "include",
      headers: { Accept: "application/json" }
    }).then(parseProfileProgressResponse),
    fetch("/api/attendance/board?page=1", {
      credentials: "include",
      headers: { Accept: "application/json" }
    }).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
  ])
    .then(([userResult, todayResult, attendanceResult]) => {
      const user = userResult.status === "fulfilled" ? userResult.value : null;
      const today = todayResult.status === "fulfilled" && todayResult.value?.success === true
        ? todayResult.value
        : null;
      const attendance = attendanceResult.status === "fulfilled" ? attendanceResult.value : null;
      const unavailable = [];
      if (!user) unavailable.push("profile");
      if (!today) unavailable.push("today");
      if (!attendance) unavailable.push("attendance");

      const progress = {
        memberId,
        rank: user ? Math.min(5, Math.max(1, Math.floor(Number(user.rank) || 1))) : null,
        coin: user ? normalizeProfileProgressNumber(user.coin) : null,
        postBonusCount: today ? normalizeProfileProgressNumber(today.postBonusCount) : null,
        maxPostBonusCount: today ? normalizeProfileProgressNumber(today.maxPostBonusCount, 4) : null,
        commentBonusCount: today ? normalizeProfileProgressNumber(today.commentBonusCount) : null,
        maxCommentBonusCount: today ? normalizeProfileProgressNumber(today.maxCommentBonusCount, 20) : null,
        freeLikeUsed: today ? normalizeProfileProgressNumber(today.freeLikeUsed) : null,
        maxFreeLike: today ? normalizeProfileProgressNumber(today.maxFreeLike) : null,
        attendance: attendance?.record || null,
        unavailable
      };
      if (unavailable.length === 0) {
        profileProgressCache = progress;
        profileProgressCacheLoadedAt = Date.now();
      }
      return progress;
    })
    .finally(() => {
      profileProgressPromise = null;
      profileProgressPromiseMemberId = "";
    });

  return profileProgressPromise;
}

function parseProfileProgressResponse(response) {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function normalizeProfileProgressNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function renderProfileProgress(popup, progress) {
  const unavailable = progress.unavailable || [];
  const unavailableLabels = {
    profile: "等级",
    today: "今日发帖、评论和投喂",
    attendance: "签到"
  };
  const rows = [];
  if (!unavailable.includes("profile")) {
    const rankMin = progress.rank * progress.rank * 100;
    const rankMax = (progress.rank + 1) * (progress.rank + 1) * 100;
    const levelRow = createProfileProgressRow(`等级进度 · Lv${progress.rank} → Lv${progress.rank + 1}`, {
      current: progress.coin,
      min: rankMin,
      max: rankMax
    });
    levelRow.classList.add("is-wide");
    rows.push(levelRow);
  }
  if (!unavailable.includes("today")) {
    rows.push(createProfileProgressRow("今日发帖", {
      current: progress.postBonusCount,
      min: 0,
      max: progress.maxPostBonusCount,
      unit: "篇"
    }));
    rows.push(createProfileProgressRow("今日评论", {
      current: progress.commentBonusCount,
      min: 0,
      max: progress.maxCommentBonusCount,
      unit: "条"
    }));
  }
  if (!unavailable.includes("attendance")) {
    const attendanceGain = progress.attendance
      ? normalizeProfileProgressNumber(progress.attendance.gain)
      : 0;
    const attendanceMax = progress.attendance ? attendanceGain : 20;
    rows.push(createProfileProgressRow("今日签到", {
      current: attendanceGain,
      min: 0,
      max: attendanceMax,
      displayValue: progress.attendance ? `已签到 · ${attendanceGain} 鸡腿` : "未签到"
    }));
  }
  if (!unavailable.includes("today")) {
    rows.push(createProfileProgressRow("免费投喂额度", {
      current: progress.freeLikeUsed,
      min: 0,
      max: progress.maxFreeLike
    }));
  }

  popup.replaceChildren(createProfileProgressTitle());
  if (rows.length > 0) {
    const grid = document.createElement("div");
    grid.className = "nsh-profile-progress-grid";
    rows.forEach((row) => grid.appendChild(row));
    popup.appendChild(grid);
  }
  if (unavailable.length > 0) {
    const warning = document.createElement("div");
    warning.className = "nsh-profile-progress-warning";
    warning.textContent = `部分数据暂时无法加载：${unavailable.map((key) => unavailableLabels[key]).join("、")}`;
    popup.appendChild(warning);
  }
}

function createProfileProgressTitle() {
  const title = document.createElement("div");
  title.className = "nsh-profile-progress-title";
  title.append(document.createTextNode("🏆 NodeSeek进度系统"));
  return title;
}

function createProfileProgressRow(titleText, values) {
  const row = document.createElement("section");
  row.className = "nsh-profile-progress-row";
  const heading = document.createElement("h3");
  heading.textContent = titleText;

  const min = Number(values.min) || 0;
  const max = Math.max(min, Number(values.max) || 0);
  const current = Math.max(min, Number(values.current) || 0);
  const percentage = max > min ? Math.min(100, ((current - min) / (max - min)) * 100) : 0;
  const track = document.createElement("div");
  track.className = "nsh-profile-progress-track";
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-label", titleText);
  track.setAttribute("aria-valuemin", String(min));
  track.setAttribute("aria-valuemax", String(max));
  track.setAttribute("aria-valuenow", String(Math.min(current, max)));
  const fill = document.createElement("div");
  fill.className = "nsh-profile-progress-fill";
  fill.style.width = `${percentage}%`;
  const value = document.createElement("span");
  value.className = "nsh-profile-progress-value";
  value.textContent = values.displayValue || `${formatProfileHomeNumber(current)} / ${formatProfileHomeNumber(max)}${values.unit ? ` ${values.unit}` : ""}`;
  const header = document.createElement("div");
  header.className = "nsh-profile-progress-row-header";
  header.append(heading, value);
  track.appendChild(fill);
  row.append(header, track);
  return row;
}

function renderProfileProgressMessage(popup, message) {
  const body = document.createElement("div");
  body.className = "nsh-profile-progress-message";
  body.textContent = message;
  popup.replaceChildren(createProfileProgressTitle(), body);
}

function positionProfileProgressPopup(popup, anchor) {
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(410, Math.max(1, window.innerWidth - 16));
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
  const popupHeight = popup.offsetHeight || 220;
  const below = rect.bottom + 10;
  const top = below + popupHeight <= window.innerHeight - 8
    ? below
    : rect.top - popupHeight - 10 >= 8
      ? rect.top - popupHeight - 10
      : Math.max(8, window.innerHeight - popupHeight - 8);
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.width = `${width}px`;
}

function cancelHideProfileProgressPopup() {
  window.clearTimeout(profileProgressHideTimer);
}

function scheduleHideProfileProgressPopup() {
  cancelHideProfileProgressPopup();
  profileProgressHideTimer = window.setTimeout(() => {
    profileProgressRequestId += 1;
    profileProgressPopup?.classList.remove("is-open");
  }, PROFILE_TREND_HIDE_DELAY_MS);
}

function isPostListAvatarLink(link) {
  if (!link.querySelector("img")) {
    return false;
  }

  return Boolean(findNearbyPostListItem(link));
}

function findNearbyPostListItem(link) {
  let current = link.parentElement;
  let depth = 0;

  while (current && current !== document.body && depth < 8) {
    if (current.querySelector("a[href^='/post-'], a[href*='/post-']")) {
      return current;
    }

    current = current.parentElement;
    depth += 1;
  }

  return null;
}

function getAvatarMemberName(avatarLink, memberId) {
  const item = findNearbyPostListItem(avatarLink) || avatarLink.parentElement;
  const fallback = cleanText(
    avatarLink.textContent
    || avatarLink.querySelector("img")?.alt
    || avatarLink.getAttribute("aria-label")
    || avatarLink.getAttribute("title")
  );

  if (!item) {
    return fallback || memberId;
  }

  const nameLink = Array.from(item.querySelectorAll("a[href*='/space/']")).find((link) => {
    return link !== avatarLink && getMemberId(link) === memberId && cleanText(link.textContent);
  });

  return cleanText(nameLink?.textContent) || fallback || memberId;
}

function resetUserStatsScan() {
  document.querySelectorAll(".content-item .nsk-content-meta-info[data-nsh-stats-bound='1']").forEach((meta) => {
    delete meta.dataset.nshStatsBound;
  });
}

function removeRenderedProfiles() {
  document.querySelectorAll(".nsh-user-stats").forEach((node) => node.remove());
  hideProfileTrendPopup();
}

function bindProfileTrendPopup(avatarLink, memberId, memberName) {
  if (!avatarLink || avatarLink.dataset.nshTrendBound === "1") {
    return;
  }

  avatarLink.dataset.nshTrendBound = "1";
  avatarLink.addEventListener("mouseenter", () => scheduleShowProfileTrendPopup(avatarLink, memberId, memberName));
  avatarLink.addEventListener("mouseleave", () => {
    cancelProfileTrendShow(avatarLink);
    scheduleHideProfileTrendPopup(avatarLink);
  });
  avatarLink.addEventListener("focus", () => showProfileTrendPopup(avatarLink, memberId, memberName));
  avatarLink.addEventListener("blur", () => {
    cancelProfileTrendShow(avatarLink);
    scheduleHideProfileTrendPopup(avatarLink);
  });
}

function scheduleShowProfileTrendPopup(anchor, memberId, memberName) {
  cancelProfileTrendHide();
  cancelProfileTrendShow();
  profileTrendShowAnchor = anchor;
  profileTrendShowTimer = window.setTimeout(() => {
    profileTrendShowTimer = 0;
    if (profileTrendShowAnchor !== anchor) return;
    profileTrendShowAnchor = null;
    if (anchor.matches?.(":hover")) {
      showProfileTrendPopup(anchor, memberId, memberName);
    }
  }, PROFILE_TREND_SHOW_DELAY_MS);
}

function cancelProfileTrendShow(anchor = null) {
  if (anchor && profileTrendShowAnchor !== anchor) return;
  if (!profileTrendShowTimer) {
    profileTrendShowAnchor = null;
    return;
  }
  window.clearTimeout(profileTrendShowTimer);
  profileTrendShowTimer = 0;
  profileTrendShowAnchor = null;
}

async function showProfileTrendPopup(anchor, memberId, memberName) {
  cancelProfileTrendShow();
  if (!featureOptions.userStatsEnabled || !featureOptions.profileHoverSignatureEnabled) {
    hideProfileTrendPopup();
    return;
  }

  cancelProfileTrendHide();
  const requestId = ++profileTrendRequestId;
  profileTrendAnchor = anchor;

  const popup = ensureProfileTrendPopup();
  const showTrends = featureOptions.profileHoverTrendEnabled;
  if (showTrends) {
    popup.classList.remove("nsh-profile-home-popup");
    renderProfileTrendLoading(popup, memberId, memberName);
  } else {
    renderProfileHomeMessage(popup, memberId, memberName, "正在加载用户资料…");
  }
  positionProfileTrendPopup(popup, anchor);

  try {
    const result = showTrends
      ? await loadProfileTrendEntries(memberId)
      : await loadProfileHomeData(memberId);
    if (requestId !== profileTrendRequestId || profileTrendAnchor !== anchor) {
      return;
    }

    if (showTrends) {
      renderProfileTrendContent(popup, memberId, memberName, result);
    } else {
      renderProfileHomePreview(popup, memberId, memberName, result);
    }
    positionProfileTrendPopup(popup, anchor);
  } catch (_error) {
    if (requestId !== profileTrendRequestId || profileTrendAnchor !== anchor) {
      return;
    }

    if (showTrends) {
      renderProfileTrendMessage(popup, memberId, memberName, "趋势数据加载失败");
    } else {
      renderProfileHomeMessage(popup, memberId, memberName, "用户资料加载失败");
    }
    positionProfileTrendPopup(popup, anchor);
  }
}

async function loadProfileHomeData(memberId) {
  const profile = await loadProfile(memberId);
  if (typeof profile?.readme === "string") return profile;

  const options = await chrome.storage.local.get(DEFAULT_OPTIONS);
  const cacheHours = normalizeUserCacheHours(options.userCacheHours);
  const record = await sendExtensionMessage("profile:getLatestSnapshot", { memberId, cacheHours });
  if (typeof record?.detail?.readme === "string") {
    return { ...profile, readme: record.detail.readme };
  }

  const detail = await loadProfileDetail(memberId);
  const merged = {
    ...profile,
    ...detail,
    readme: typeof detail.readme === "string" ? detail.readme : ""
  };
  await writeStoredProfile(memberId, merged, cacheHours);
  return merged;
}

function ensureProfileTrendPopup() {
  if (profileTrendPopup?.isConnected) {
    return profileTrendPopup;
  }

  profileTrendPopup = document.createElement("section");
  profileTrendPopup.className = "nsh-profile-trend-popup";
  profileTrendPopup.setAttribute("role", "dialog");
  profileTrendPopup.addEventListener("mouseenter", cancelProfileTrendHide);
  profileTrendPopup.addEventListener("mouseleave", () => scheduleHideProfileTrendPopup());
  document.body.appendChild(profileTrendPopup);
  return profileTrendPopup;
}

function renderProfileTrendLoading(popup, memberId, memberName) {
  renderProfileTrendMessage(popup, memberId, memberName, "加载中");
}

function renderProfileHomeMessage(popup, memberId, memberName, message) {
  popup.classList.add("nsh-profile-home-popup");
  popup.replaceChildren(createProfileHomeTitle(memberId, memberName));
  const body = document.createElement("div");
  body.className = "nsh-profile-home-message";
  body.textContent = message;
  popup.appendChild(body);
}

function renderProfileHomePreview(popup, memberId, memberName, profile) {
  popup.classList.add("nsh-profile-home-popup");
  const stats = document.createElement("div");
  stats.className = "nsh-profile-home-metrics";
  [
    { label: "加入天数", value: getProfileJoinDays(profile) },
    { label: "等级", value: profile.rank ? `Lv ${profile.rank}` : "—" },
    { label: "鸡腿", value: formatProfileHomeNumber(profile.coin) },
    { label: "主题帖", value: formatProfileHomeNumber(profile.nPost), activity: "discussions" },
    { label: "评论数", value: formatProfileHomeNumber(profile.nComment), activity: "comments" }
  ].forEach(({ label, value, activity }) => {
    const metric = document.createElement(activity ? "button" : "div");
    if (activity) {
      metric.type = "button";
      metric.classList.add("is-activity-trigger");
      metric.setAttribute("aria-haspopup", "dialog");
      metric.addEventListener("mouseenter", () => scheduleShowProfileActivityPopup(metric, memberId, activity));
      metric.addEventListener("mouseleave", () => {
        cancelProfileActivityShow(metric);
        scheduleHideProfileActivityPopup();
      });
      metric.addEventListener("focus", () => showProfileActivityPopup(metric, memberId, activity));
      metric.addEventListener("blur", scheduleHideProfileActivityPopup);
    }
    metric.classList.add("nsh-profile-home-metric");
    const valueNode = document.createElement("strong");
    valueNode.textContent = String(value);
    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    metric.append(valueNode, labelNode);
    stats.appendChild(metric);
  });

  const bio = document.createElement("section");
  bio.className = "nsh-profile-home-bio";
  const bioTitle = document.createElement("h3");
  bioTitle.textContent = "个人介绍";
  const readme = typeof profile?.readme === "string" ? profile.readme.trim() : "";
  const bioContent = readme
    ? createProfileMarkdownContent(readme)
    : document.createElement("p");
  if (!readme) bioContent.textContent = "该用户尚未填写个人介绍。";
  bio.append(bioTitle, bioContent);
  popup.replaceChildren(createProfileHomeTitle(memberId, memberName), stats, bio);
}

function createProfileHomeTitle(memberId, memberName) {
  const title = document.createElement("div");
  title.className = "nsh-profile-trend-title nsh-profile-home-title";
  const nameLink = document.createElement("a");
  nameLink.className = "nsh-profile-home-name-link";
  nameLink.href = `/space/${encodeURIComponent(memberId)}`;
  nameLink.target = "_blank";
  nameLink.rel = "noopener noreferrer";
  nameLink.textContent = memberName || "NodeSeek 用户";
  nameLink.title = "在新标签页打开用户主页";
  title.append(nameLink, createProfileUserActions(memberName || memberId, memberId, true));
  return title;
}

function getProfileJoinDays(profile) {
  const rawRegisteredAt = profile?.created_at;
  const registeredAt = typeof rawRegisteredAt === "number"
    ? (rawRegisteredAt < 1e12 ? rawRegisteredAt * 1000 : rawRegisteredAt)
    : Date.parse(rawRegisteredAt || "");
  if (Number.isFinite(registeredAt)) {
    return String(Math.max(0, Math.ceil((Date.now() - registeredAt) / 86400000)));
  }
  const match = String(profile?.created_at_str || "").match(/\d+/);
  return match ? match[0] : "—";
}

function formatProfileHomeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat().format(number) : "0";
}

function renderProfileTrendMessage(popup, memberId, memberName, message) {
  popup.replaceChildren(createProfileTrendTitle(memberId, memberName));

  const body = document.createElement("div");
  body.className = "nsh-profile-trend-message";
  body.textContent = message;
  popup.appendChild(body);
}

function renderProfileTrendContent(popup, memberId, memberName, entries) {
  popup.replaceChildren(createProfileTrendTitle(memberId, memberName));

  const groups = document.createElement("div");
  groups.className = "nsh-profile-trend-groups";
  getEnabledProfileTrendGroups(entries).forEach((group) => {
    groups.appendChild(createProfileTrendGroup(group.title, group.entries, group.days));
  });
  popup.appendChild(groups);
}

function hasEnabledProfileTrendGroups() {
  return featureOptions.profileTrend7DaysEnabled || featureOptions.profileTrend30DaysEnabled;
}

function getEnabledProfileTrendGroups(entries) {
  const groups = [];
  const showDefaultRanges = !featureOptions.profileTrend7DaysEnabled
    && !featureOptions.profileTrend30DaysEnabled;

  if (featureOptions.profileTrend7DaysEnabled || showDefaultRanges) {
    groups.push({
      title: "近 7 天",
      entries: getProfileTrendEntriesInDays(entries, PROFILE_TREND_RECENT_DAYS),
      days: PROFILE_TREND_RECENT_DAYS
    });
  }

  if (featureOptions.profileTrend30DaysEnabled || showDefaultRanges) {
    groups.push({
      title: "近 30 天",
      entries,
      days: PROFILE_TREND_DAYS
    });
  }

  return groups;
}

function createProfileTrendTitle(memberId, memberName) {
  const title = document.createElement("div");
  title.className = "nsh-profile-trend-title";
  const text = document.createElement("span");
  text.className = "nsh-profile-trend-title-text";
  text.textContent = `${memberName || "用户"} 数据趋势`;
  title.append(text, createProfileUserActions(memberName || memberId, memberId, true));
  return title;
}

function createProfileTrendGroup(titleText, entries, days) {
  const group = document.createElement("section");
  group.className = "nsh-profile-trend-group";

  const heading = document.createElement("div");
  heading.className = "nsh-profile-trend-heading";

  const title = document.createElement("span");
  title.textContent = titleText;

  const count = document.createElement("span");
  count.textContent = `${entries.length} 天`;

  heading.appendChild(title);
  heading.appendChild(count);
  group.appendChild(heading);

  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "nsh-profile-trend-empty";
    empty.textContent = "暂无数据";
    group.appendChild(empty);
    return group;
  }

  group.appendChild(createProfileTrendLegend(entries));
  group.appendChild(createProfileTrendChart(entries, titleText, days));
  return group;
}

function createProfileTrendLegend(entries) {
  const latestEntry = entries[entries.length - 1];
  const legend = document.createElement("div");
  legend.className = "nsh-profile-trend-legend";

  PROFILE_TREND_CHART_FIELDS.forEach((field) => {
    const item = document.createElement("span");
    item.className = "nsh-profile-trend-legend-item";

    const swatch = document.createElement("span");
    swatch.className = "nsh-profile-trend-swatch";
    swatch.style.background = field.color;

    const value = latestEntry?.values?.[field.key];
    const text = document.createElement("span");
    text.textContent = `${field.label} ${Number.isFinite(value) ? formatProfileTrendNumber(value) : "-"}`;

    item.appendChild(swatch);
    item.appendChild(text);
    legend.appendChild(item);
  });

  return legend;
}

function createProfileTrendChart(entries, titleText, days) {
  const width = 340;
  const rowHeight = 24;
  const rowGap = 8;
  const padding = {
    top: 8,
    right: 12,
    bottom: 20,
    left: 12
  };
  const labelWidth = 44;
  const plotLeft = padding.left + labelWidth;
  const plotWidth = width - plotLeft - padding.right;
  const visibleFields = PROFILE_TREND_CHART_FIELDS.filter((field) => {
    return entries.some((entry) => Number.isFinite(entry.values[field.key]));
  });
  const chartRowsHeight = visibleFields.length * rowHeight + Math.max(0, visibleFields.length - 1) * rowGap;
  const height = padding.top + chartRowsHeight + padding.bottom;
  const svg = createSvgElement("svg", {
    class: "nsh-profile-trend-chart",
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": `${titleText}数据趋势`
  });

  visibleFields.forEach((field, rowIndex) => {
    const rowTop = padding.top + rowIndex * (rowHeight + rowGap);
    const rowMiddle = rowTop + rowHeight / 2;
    svg.appendChild(createSvgElement("line", {
      class: "nsh-profile-trend-grid",
      x1: plotLeft,
      y1: rowMiddle,
      x2: width - padding.right,
      y2: rowMiddle
    }));

    const label = createSvgElement("text", {
      class: "nsh-profile-trend-row-label",
      x: padding.left,
      y: rowMiddle + 4
    });
    label.textContent = field.label;
    svg.appendChild(label);

    const values = entries.map((entry) => entry.values[field.key]).filter(Number.isFinite);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const points = entries.map((entry) => {
      const value = entry.values[field.key];
      if (!Number.isFinite(value)) {
        return null;
      }

      const x = getProfileTrendPointX(entry.collectedAt, days, plotLeft, plotWidth);
      const y = min === max
        ? rowMiddle
        : rowTop + rowHeight - ((value - min) / (max - min)) * rowHeight;
      return {
        x,
        y,
        value,
        collectedAt: entry.collectedAt
      };
    });
    const pathData = points
      .filter(Boolean)
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(" ");

    svg.appendChild(createSvgElement("path", {
      class: "nsh-profile-trend-line",
      d: pathData,
      fill: "none",
      stroke: field.color
    }));

    points.filter(Boolean).forEach((point) => {
      const title = `${formatProfileTrendDate(point.collectedAt)} ${field.label} ${formatProfileTrendNumber(point.value)}`;
      const visiblePoint = createSvgElement("circle", {
        class: "nsh-profile-trend-point",
        cx: point.x.toFixed(1),
        cy: point.y.toFixed(1),
        r: "2",
        fill: field.color
      });
      const visibleTitle = createSvgElement("title", {});
      visibleTitle.textContent = title;
      visiblePoint.appendChild(visibleTitle);
      svg.appendChild(visiblePoint);

      const hitPoint = createSvgElement("circle", {
        class: "nsh-profile-trend-hit-point",
        cx: point.x.toFixed(1),
        cy: point.y.toFixed(1),
        r: "6",
        fill: "transparent"
      });
      const hitTitle = createSvgElement("title", {});
      hitTitle.textContent = title;
      hitPoint.appendChild(hitTitle);
      svg.appendChild(hitPoint);
    });
  });

  appendProfileTrendDateLabels(svg, days, height, { ...padding, left: plotLeft }, plotWidth);
  return svg;
}

function appendProfileTrendDateLabels(svg, days, height, padding, chartWidth) {
  const firstLabel = createSvgElement("text", {
    class: "nsh-profile-trend-axis-label",
    x: padding.left,
    y: height - 4,
    "text-anchor": "start"
  });
  firstLabel.textContent = formatProfileTrendDate(getProfileTrendCutoff(days));
  svg.appendChild(firstLabel);

  const lastLabel = createSvgElement("text", {
    class: "nsh-profile-trend-axis-label",
    x: padding.left + chartWidth,
    y: height - 4,
    "text-anchor": "end"
  });
  lastLabel.textContent = formatProfileTrendDate(Date.now());
  svg.appendChild(lastLabel);
}

function getProfileTrendPointX(timestamp, days, left, width) {
  const start = getProfileTrendCutoff(days);
  const end = Date.now();
  const ratio = end > start ? (timestamp - start) / (end - start) : 1;
  return left + Math.max(0, Math.min(1, ratio)) * width;
}

async function loadProfileTrendEntries(memberId) {
  await loadProfile(memberId);
  const entries = await sendExtensionMessage("profile:getTrendEntries", {
    memberId,
    days: PROFILE_TREND_DAYS
  });
  return normalizeProfileTrendEntries(entries);
}

function normalizeProfileTrendEntries(entries) {
  const cutoff = getProfileTrendCutoff(PROFILE_TREND_DAYS);
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => Number.isFinite(entry?.collectedAt) && entry.collectedAt >= cutoff && hasProfileFields(entry.detail))
    .map((entry) => ({
      collectedAt: entry.collectedAt,
      values: Object.fromEntries(
        PROFILE_TREND_CHART_FIELDS.map((field) => [field.key, toProfileTrendNumber(entry.detail?.[field.key])])
      )
    }))
    .filter((entry) => PROFILE_TREND_CHART_FIELDS.some((field) => Number.isFinite(entry.values[field.key])))
    .sort((first, second) => first.collectedAt - second.collectedAt);
}

function getProfileTrendEntriesInDays(entries, days) {
  const cutoff = getProfileTrendCutoff(days);
  return entries.filter((entry) => entry.collectedAt >= cutoff);
}

function getProfileTrendCutoff(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days + 1);
  return date.getTime();
}

function toProfileTrendNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  const match = String(value ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

function formatProfileTrendNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatProfileTrendDate(timestamp) {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function positionProfileTrendPopup(popup, anchor) {
  const anchorRect = anchor.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const gap = 10;
  const viewportGap = 8;
  let left = anchorRect.right + gap;
  let top = anchorRect.top;

  if (left + popupRect.width > window.innerWidth - viewportGap) {
    left = anchorRect.left - popupRect.width - gap;
  }

  left = Math.max(viewportGap, Math.min(left, window.innerWidth - popupRect.width - viewportGap));
  top = Math.max(viewportGap, Math.min(top, window.innerHeight - popupRect.height - viewportGap));

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function scheduleHideProfileTrendPopup(anchor = null) {
  if (profileTrendShowAnchor && profileTrendShowAnchor !== anchor) return;
  if (anchor && profileTrendAnchor && profileTrendAnchor !== anchor) return;
  cancelProfileTrendHide();
  const expectedAnchor = profileTrendAnchor;
  profileTrendHideTimer = window.setTimeout(() => {
    profileTrendHideTimer = 0;
    if (profileTrendAnchor === expectedAnchor) hideProfileTrendPopup();
  }, PROFILE_TREND_HIDE_DELAY_MS);
}

function cancelProfileTrendHide() {
  if (profileTrendHideTimer) {
    window.clearTimeout(profileTrendHideTimer);
    profileTrendHideTimer = 0;
  }
}

function hideProfileTrendPopup() {
  cancelProfileTrendShow();
  cancelProfileTrendHide();
  profileTrendRequestId += 1;
  profileTrendAnchor = null;
  profileTrendPopup?.remove();
  profileTrendPopup = null;
  hideProfileActivityPopup();
}

function showProfileActivityPopup(anchor, memberId, kind) {
  cancelProfileActivityShow();
  window.clearTimeout(profileActivityHideTimer);
  cancelProfileTrendHide();
  const requestId = ++profileActivityRequestId;
  profileActivityAnchor = anchor;
  const popup = ensureProfileActivityPopup();
  renderProfileActivityMessage(popup, kind, "正在读取最近记录…");
  positionProfileActivityPopup(popup, anchor);
  popup.classList.add("is-open");

  loadProfileActivityEntries(memberId, kind)
    .then((entries) => {
      if (requestId !== profileActivityRequestId || profileActivityAnchor !== anchor) return;
      renderProfileActivityEntries(popup, kind, entries);
      positionProfileActivityPopup(popup, anchor);
    })
    .catch(() => {
      if (requestId !== profileActivityRequestId || profileActivityAnchor !== anchor) return;
      renderProfileActivityMessage(popup, kind, "暂时无法加载");
      positionProfileActivityPopup(popup, anchor);
    });
}

function ensureProfileActivityPopup() {
  if (profileActivityPopup?.isConnected) return profileActivityPopup;
  const popup = document.createElement("section");
  popup.className = "nsh-profile-activity-popup";
  popup.setAttribute("role", "dialog");
  popup.addEventListener("mouseenter", () => {
    cancelProfileActivityShow();
    window.clearTimeout(profileActivityHideTimer);
    cancelProfileTrendHide();
  });
  popup.addEventListener("mouseleave", scheduleHideProfileActivityPopup);
  document.body.appendChild(popup);
  profileActivityPopup = popup;
  return popup;
}

function scheduleHideProfileActivityPopup() {
  window.clearTimeout(profileActivityHideTimer);
  profileActivityHideTimer = window.setTimeout(() => {
    hideProfileActivityPopup();
  }, PROFILE_TREND_HIDE_DELAY_MS);
}

function scheduleShowProfileActivityPopup(anchor, memberId, kind) {
  window.clearTimeout(profileActivityHideTimer);
  cancelProfileActivityShow();
  if (!profileActivityPopup?.isConnected || profileActivityAnchor === anchor) {
    showProfileActivityPopup(anchor, memberId, kind);
    return;
  }

  profileActivityShowAnchor = anchor;
  profileActivityShowTimer = window.setTimeout(() => {
    profileActivityShowTimer = 0;
    if (profileActivityShowAnchor !== anchor) return;
    profileActivityShowAnchor = null;
    if (anchor.matches?.(":hover")) {
      showProfileActivityPopup(anchor, memberId, kind);
    }
  }, PROFILE_ACTIVITY_SWITCH_DELAY_MS);
}

function cancelProfileActivityShow(anchor = null) {
  if (anchor && profileActivityShowAnchor !== anchor) return;
  window.clearTimeout(profileActivityShowTimer);
  profileActivityShowTimer = 0;
  profileActivityShowAnchor = null;
}

function hideProfileActivityPopup() {
  cancelProfileActivityShow();
  window.clearTimeout(profileActivityHideTimer);
  profileActivityRequestId += 1;
  profileActivityAnchor = null;
  profileActivityPopup?.remove();
  profileActivityPopup = null;
}

function positionProfileActivityPopup(popup, anchor) {
  const anchorRect = anchor.getBoundingClientRect();
  const ownerRect = profileTrendPopup?.isConnected
    ? profileTrendPopup.getBoundingClientRect()
    : anchorRect;
  const width = Math.min(360, Math.max(1, window.innerWidth - 16));
  const height = popup.offsetHeight || 240;
  const right = ownerRect.right + width + 10 <= window.innerWidth - 8;
  const leftSide = ownerRect.left - width - 10 >= 8;
  const left = right
    ? ownerRect.right + 10
    : leftSide
      ? ownerRect.left - width - 10
      : Math.max(8, Math.min(ownerRect.left, window.innerWidth - width - 8));
  const top = right || leftSide
    ? Math.max(8, Math.min(ownerRect.top, window.innerHeight - height - 8))
    : Math.max(8, Math.min(ownerRect.bottom + 10, window.innerHeight - height - 8));
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.width = `${width}px`;
}

async function loadProfileActivityEntries(memberId, kind) {
  const cacheKey = `${memberId}:${kind}`;
  const cached = profileActivityCache.get(cacheKey);
  if (cached?.entries && Date.now() - cached.loadedAt < PROFILE_PROGRESS_CACHE_TTL_MS) {
    return cached.entries;
  }
  if (cached?.promise) return cached.promise;

  const endpoint = kind === "discussions"
    ? `/api/content/list-discussions?uid=${encodeURIComponent(memberId)}&page=1`
    : `/api/content/list-comments?uid=${encodeURIComponent(memberId)}&page=1`;
  const promise = fetch(endpoint, {
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  }).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (payload?.success === false) throw new Error(payload.message || "用户记录接口返回异常");
    const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
    const entries = kind === "discussions"
      ? (data.discussions || data.items || data.list)
      : (data.comments || data.items || data.list);
    if (!Array.isArray(entries)) throw new Error("用户记录接口格式异常");
    const recentEntries = entries.slice(0, PROFILE_ACTIVITY_LIMIT);
    profileActivityCache.set(cacheKey, { entries: recentEntries, loadedAt: Date.now() });
    return recentEntries;
  }).catch((error) => {
    profileActivityCache.delete(cacheKey);
    throw error;
  });
  profileActivityCache.set(cacheKey, { promise, loadedAt: Date.now() });
  return promise;
}

function renderProfileActivityMessage(popup, kind, message) {
  const heading = document.createElement("h3");
  heading.className = "nsh-profile-activity-title";
  heading.textContent = kind === "discussions" ? "最近主题" : "最近评论";
  const body = document.createElement("div");
  body.className = "nsh-profile-activity-message";
  body.textContent = message;
  popup.replaceChildren(heading, body);
}

function renderProfileActivityEntries(popup, kind, entries) {
  const heading = document.createElement("h3");
  heading.className = "nsh-profile-activity-title";
  heading.textContent = kind === "discussions" ? "最近 10 条主题" : "最近 10 条评论";
  const list = document.createElement("ol");
  list.className = "nsh-profile-activity-list";
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "nsh-profile-activity-message";
    empty.textContent = kind === "discussions" ? "暂无主题" : "暂无评论";
    list.appendChild(empty);
  }

  entries.forEach((entry) => {
    const link = document.createElement("a");
    link.className = "nsh-profile-activity-item";
    link.href = buildProfileActivityEntryUrl(entry, kind);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const title = document.createElement("strong");
    title.textContent = cleanText(entry.title || entry.post_title || "无标题");
    link.appendChild(title);
    if (kind === "comments") {
      const content = document.createElement("span");
      content.textContent = cleanText(entry.text || entry.content || entry.comment || "");
      link.appendChild(content);
    }
    list.appendChild(link);
  });
  popup.replaceChildren(heading, list);
}

function buildProfileActivityEntryUrl(entry, kind) {
  const postId = String(entry?.post_id || entry?.id || "").replace(/\D/g, "");
  if (!postId) return "/";
  const floor = Number(entry?.floor_id || entry?.floor_index || 0);
  const page = kind === "comments" && Number.isInteger(floor) && floor > 0
    ? Math.ceil(floor / PROFILE_ACTIVITY_COMMENT_PAGE_SIZE)
    : 1;
  const url = new URL(`/post-${postId}-${page}`, location.origin);
  if (kind === "comments" && floor > 0) {
    if (entry.comment_id != null) url.searchParams.set("nshComment", String(entry.comment_id));
    url.searchParams.set("nshFloor", String(floor));
  }
  return url.href;
}

function getMemberId(link) {
  const href = link?.getAttribute("href") || "";
  return toUrl(href)?.pathname.match(/^\/space\/(\d+)/)?.[1] || "";
}

function scanProfileSpaceActions() {
  const memberId = location.pathname.match(/^\/space\/(\d+)\/?$/)?.[1] || "";
  if (!memberId) {
    return;
  }

  const messageLink = Array.from(
    document.querySelectorAll("h1.username a[href*='/notification#'][href*='mode=talk']")
  ).find((link) => {
    const href = link.getAttribute("href") || "";
    return href.match(/[?&]to=(\d+)/)?.[1] === memberId;
  });
  const heading = messageLink?.closest("h1.username");
  if (!messageLink || !heading) {
    return;
  }

  const clone = heading.cloneNode(true);
  clone.querySelectorAll("a, button, .nsh-profile-space-toolbar").forEach((node) => node.remove());
  const userName = cleanText(clone.textContent);
  if (!userName) {
    return;
  }

  const toolbar = messageLink.closest(".nsh-profile-space-toolbar");
  const existing = toolbar?.querySelector(":scope > .nsh-profile-space-actions");
  if (
    existing?.dataset.nshProfileMemberId === memberId
    && existing.dataset.nshProfileUserName === userName
  ) {
    return;
  }

  existing?.remove();
  const actions = createProfileUserActions(userName);
  actions.classList.add("nsh-profile-space-actions");
  actions.dataset.nshProfileMemberId = memberId;
  actions.dataset.nshProfileUserName = userName;
  const actionToolbar = toolbar || document.createElement("span");
  if (!toolbar) {
    actionToolbar.className = "nsh-profile-space-toolbar";
    heading.insertBefore(actionToolbar, messageLink);
    actionToolbar.appendChild(messageLink);
  }
  actionToolbar.insertBefore(actions, messageLink);
}

async function loadProfile(memberId) {
  if (PROFILE_CACHE.has(memberId)) {
    return PROFILE_CACHE.get(memberId);
  }

  const promise = loadProfileWithCache(memberId)
    .catch((error) => {
      throw error;
    })
    .finally(() => {
      PROFILE_CACHE.delete(memberId);
    });

  PROFILE_CACHE.set(memberId, promise);
  return promise;
}

async function loadProfileWithCache(memberId) {
  const options = await chrome.storage.local.get(DEFAULT_OPTIONS);
  const cacheHours = normalizeUserCacheHours(options.userCacheHours);
  const cachedDetail = await readStoredProfile(memberId, cacheHours);

  if (cachedDetail) {
    return cachedDetail;
  }

  const detail = await loadFreshProfile(memberId);

  await writeStoredProfile(memberId, detail, cacheHours);
  return detail;
}

async function loadFreshProfile(memberId) {
  return loadProfileDetail(memberId);
}

function normalizeUserCacheHours(value) {
  const hours = Number(value);
  return Number.isFinite(hours)
    ? Math.max(Math.floor(hours), MIN_USER_CACHE_HOURS)
    : DEFAULT_OPTIONS.userCacheHours;
}

function normalizeAutoPageDelayMs(value) {
  const delay = Number(value);
  return Number.isFinite(delay)
    ? Math.max(Math.floor(delay), MIN_AUTO_PAGE_DELAY_MS)
    : DEFAULT_OPTIONS.autoPageDelayMs;
}

function normalizeProfileLabelKeys(value) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_PROFILE_LABEL_KEYS];
  }

  const allowedKeys = new Set(PROFILE_FIELD_DEFINITIONS.map((field) => field.key));
  return [...new Set(value.filter((key) => allowedKeys.has(key)))];
}

async function readStoredProfile(memberId, cacheHours) {
  return sendExtensionMessage("profile:getCached", { memberId, cacheHours });
}

async function writeStoredProfile(memberId, detail, cacheHours) {
  if (!hasProfileFields(detail)) {
    return;
  }

  await sendExtensionMessage("profile:saveSnapshot", { memberId, detail, cacheHours });
}

function loadProfileDetail(memberId) {
  const params = new URLSearchParams({
    readme: "1"
  });
  return fetch(`/api/account/getInfo/${encodeURIComponent(memberId)}?${params.toString()}`, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json"
    }
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!data?.success || !data.detail || typeof data.detail !== "object") {
        throw new Error("用户详情接口返回异常");
      }
      return data.detail;
    });
}

function hasProfileFields(profile) {
  if (!profile || typeof profile !== "object") {
    return false;
  }

  return PROFILE_FIELD_DEFINITIONS.some((field) => isProfileValuePresent(getProfileValue(profile, field)))
    || isProfileValuePresent(profile.member_id)
    || isProfileValuePresent(profile.member_name);
}

function getLevelColors() {
  if (!levelColorsPromise) {
    levelColorsPromise = chrome.storage.local
      .get({ levelColors: DEFAULT_LEVEL_COLORS })
      .then((options) => normalizeLevelColors(options.levelColors));
  }

  return levelColorsPromise;
}

function normalizeLevelColors(colors) {
  return Object.fromEntries(
    Object.entries(DEFAULT_LEVEL_COLORS).map(([level, defaultColor]) => {
      return [level, normalizeColor(colors?.[level], defaultColor)];
    })
  );
}

function normalizeColor(value, fallback) {
  const text = String(value || "").trim();
  if (/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(text)) {
    return text;
  }

  const color = parseRgbColor(text);
  return color ? formatHexColor(color) : fallback;
}

function refreshRenderedProfileColors() {
  getLevelColors()
    .then((levelColors) => {
      document.querySelectorAll(".nsh-user-stats[data-nsh-level]").forEach((node) => {
        applyProfileLevelColors(node, node.dataset.nshLevel, levelColors);
      });
    })
    .catch(() => {});
}

function renderProfile(authorInfo, memberId, memberName, profile, levelColors) {
  const fields = getProfileLabelFields()
    .map((field) => createProfileLabel(field, profile))
    .filter(Boolean);

  if (fields.length === 0) {
    return;
  }

  authorInfo.querySelector(".nsh-user-stats")?.remove();

  const node = document.createElement("span");
  node.className = "nsh-user-stats";
  node.dataset.nshMemberId = memberId;
  node.dataset.nshMemberName = memberName || memberId;
  node.dataset.nshLevel = getProfileLevel(profile);
  applyProfileLabelSize(node);
  applyProfileLevelColors(node, node.dataset.nshLevel, levelColors);

  const track = document.createElement("span");
  track.className = "nsh-user-stats-track";

  fields.forEach((field, index) => {
    const item = document.createElement(index === 0 ? "button" : "span");
    item.className = "nsh-user-stat";
    item.textContent = formatProfileLabelText(field);
    item.title = item.textContent;
    if (index === 0) {
      item.type = "button";
      item.classList.add("nsh-user-stat-detail");
      item.title = "查看用户详情";
      item.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openProfileDetailDialog(memberId, memberName || memberId);
      });
    }
    track.appendChild(item);
  });

  node.appendChild(track);
  authorInfo.appendChild(node);
  resizeProfileStats(node);
  window.requestAnimationFrame(() => resizeProfileStats(node));
}

function scheduleProfileStatsResize() {
  if (profileStatsResizeFrame) {
    return;
  }

  profileStatsResizeFrame = window.requestAnimationFrame(() => {
    profileStatsResizeFrame = 0;
    resizeRenderedProfileStats();
  });
}

function resizeRenderedProfileStats() {
  document.querySelectorAll(".nsh-user-stats").forEach((node) => resizeProfileStats(node));
}

function refreshRenderedProfileLabelSizes() {
  document.querySelectorAll(".nsh-user-stats").forEach((node) => {
    applyProfileLabelSize(node);
    resizeProfileStats(node);
  });
}

function applyProfileLabelSize(node) {
  node.dataset.nshLabelSize = normalizeProfileLabelSize(featureOptions.profileLabelSize);
}

function resizeProfileStats(node) {
  if (!node.isConnected) {
    return;
  }

  node.style.width = "1px";
  const statsRect = node.getBoundingClientRect();
  const rightBoundary = getProfileStatsRightBoundary(node, statsRect);

  if (!Number.isFinite(rightBoundary)) {
    node.style.width = "100%";
    return;
  }

  const width = Math.floor(rightBoundary - statsRect.left - PROFILE_STATS_RIGHT_GAP);
  node.style.width = `${Math.max(1, width)}px`;
}

function getProfileStatsRightBoundary(node, statsRect) {
  const boundaries = [];
  const meta = node.closest(".nsk-content-meta-info");
  const contentItem = node.closest(".content-item");

  findFloorNumber(meta, statsRect).forEach((floor) => {
    boundaries.push(floor.getBoundingClientRect().left);
  });

  [contentItem, meta].forEach((element) => {
    const right = element?.getBoundingClientRect().right;
    if (Number.isFinite(right) && right > statsRect.left) {
      boundaries.push(right);
    }
  });

  return boundaries.length > 0 ? Math.min(...boundaries) : NaN;
}

function findFloorNumber(meta, statsRect) {
  if (!meta) {
    return [];
  }

  const floorElements = Array.from(meta.querySelectorAll("a"))
    .filter((link) => /^#\d+$/.test(cleanText(link.textContent)))
    .map((link) => link.closest(".floor-link-wrapper") || link);

  return Array.from(new Set(floorElements)).filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left > statsRect.left
      && rect.bottom > statsRect.top
      && rect.top < statsRect.bottom;
  });
}

function getProfileLabelFields() {
  const enabledKeys = new Set(normalizeProfileLabelKeys(featureOptions.profileLabelKeys));
  return PROFILE_FIELD_DEFINITIONS.filter((field) => enabledKeys.has(field.key));
}

function createProfileLabel(field, profile) {
  const value = getProfileValue(profile, field);
  if (!isProfileValuePresent(value)) {
    return null;
  }

  const formattedValue = formatProfileValue(field, value);
  if (!isProfileValuePresent(formattedValue)) {
    return null;
  }

  return {
    key: field.key,
    label: field.label,
    value: formattedValue
  };
}

function formatProfileLabelText(field) {
  if (field.key === "followed") {
    return field.value === "是" ? "已关注" : "未关注";
  }

  return `${field.label} ${field.value}`;
}

function getProfileValue(profile, field) {
  return profile?.[field.key];
}

function isProfileValuePresent(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return typeof value !== "string" || value.trim() !== "";
}

function formatProfileValue(field, value) {
  if (field.type === "boolean") {
    return value ? "是" : "否";
  }

  if (field.type === "booleanNumber") {
    return Number(value) === 1 ? "是" : "否";
  }

  if (field.type === "array") {
    return Array.isArray(value)
      ? value.map(formatArrayProfileValue).filter(Boolean).join("、")
      : String(value);
  }

  if (field.type === "datetime") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("zh-CN");
  }

  if (field.key === "rank") {
    const match = String(value).match(/\d+/);
    return match ? match[0] : String(value);
  }

  if (field.key === "created_at_str") {
    return formatProfileJoinAge(value);
  }

  return String(value);
}

function formatArrayProfileValue(value) {
  if (value && typeof value === "object") {
    return value.name || value.title || value.role_name || value.id || "";
  }
  return String(value);
}

function formatProfileJoinAge(value) {
  const text = String(value).trim();
  const match = text.match(/^(\d+)\s*days?\s*ago$/i);
  if (match) {
    return `${match[1]}天`;
  }

  return /^\d+$/.test(text) ? `${text}天` : text;
}

async function openProfileDetailDialog(memberId, memberName) {
  const backdrop = document.createElement("div");
  backdrop.className = "nsh-dialog-backdrop";

  const dialog = document.createElement("section");
  dialog.className = "nsh-dialog nsh-profile-detail-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");

  const header = document.createElement("div");
  header.className = "nsh-profile-detail-header";
  const title = document.createElement("h2");
  title.textContent = memberName || memberId;
  header.append(title, createProfileUserActions(memberName || memberId));
  dialog.appendChild(header);

  const body = document.createElement("div");
  body.className = "nsh-profile-detail-body";
  body.textContent = "加载中";
  dialog.appendChild(body);

  const actions = document.createElement("div");
  actions.className = "nsh-dialog-actions";
  const refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.className = "nsh-dialog-primary";
  refreshButton.textContent = "刷新";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "关闭";
  actions.appendChild(refreshButton);
  actions.appendChild(closeButton);
  dialog.appendChild(actions);

  const close = () => {
    document.removeEventListener("keydown", handleKeyDown);
    backdrop.remove();
  };

  const handleKeyDown = (event) => {
    const backdrops = document.querySelectorAll(".nsh-dialog-backdrop");
    if (event.key === "Escape" && backdrops[backdrops.length - 1] === backdrop) {
      close();
    }
  };

  closeButton.addEventListener("click", close);
  refreshButton.addEventListener("click", async () => {
    const refreshed = await confirmRefreshProfile(memberId, memberName || memberId, refreshButton);
    if (!refreshed || !backdrop.isConnected) {
      return;
    }

    try {
      const record = await sendExtensionMessage("profile:getLatestSnapshot", { memberId });
      renderProfileDetailBody(body, record);
    } catch (error) {
      body.textContent = error.message || "加载失败";
    }
  });
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) {
      close();
    }
  });
  document.addEventListener("keydown", handleKeyDown);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  closeButton.focus();

  try {
    const record = await sendExtensionMessage("profile:getLatestSnapshot", { memberId });
    renderProfileDetailBody(body, record);
  } catch (error) {
    body.textContent = error.message || "加载失败";
  }
}

function createProfileUserActions(userName, memberId = "", includeMessage = false) {
  const actions = document.createElement("div");
  actions.className = "nsh-profile-user-actions";
  actions.append(createProfileFollowButton(userName), createProfileBlockButton(userName));
  if (includeMessage) {
    const messageLink = createProfileMessageLink(memberId, userName);
    if (messageLink) actions.appendChild(messageLink);
  }
  return actions;
}

function createProfileMessageLink(memberId, userName) {
  const normalizedMemberId = String(memberId || "").match(/^\d+$/)?.[0] || "";
  if (!normalizedMemberId) return null;

  const link = document.createElement("a");
  link.className = "nsh-profile-user-action-button nsh-profile-message-button";
  link.href = `/notification#/message?mode=talk&to=${encodeURIComponent(normalizedMemberId)}`;
  link.textContent = "私信";
  link.title = `给 ${userName || normalizedMemberId} 发送私信`;
  return link;
}

function createProfileFollowButton(userName) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nsh-profile-user-action-button nsh-profile-follow-button";
  button.dataset.nshProfileUserName = normalizeProfileActionUserName(userName);
  syncProfileFollowButton(button, userName);
  button.addEventListener("click", (event) => handleProfileFollowButtonClick(event, userName, button));
  return button;
}

function setProfileFollowButtonContent(button, text) {
  const icon = document.createElementNS(SVG_NAMESPACE, "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.classList.add("nsh-profile-action-icon");

  const head = document.createElementNS(SVG_NAMESPACE, "circle");
  head.setAttribute("cx", "9");
  head.setAttribute("cy", "8");
  head.setAttribute("r", "3");

  const body = document.createElementNS(SVG_NAMESPACE, "path");
  body.setAttribute("d", "M3.5 19c.5-3.2 2.4-5 5.5-5s5 1.8 5.5 5");

  const horizontal = document.createElementNS(SVG_NAMESPACE, "line");
  horizontal.setAttribute("x1", "16");
  horizontal.setAttribute("y1", "10");
  horizontal.setAttribute("x2", "22");
  horizontal.setAttribute("y2", "10");

  const vertical = document.createElementNS(SVG_NAMESPACE, "line");
  vertical.setAttribute("x1", "19");
  vertical.setAttribute("y1", "7");
  vertical.setAttribute("x2", "19");
  vertical.setAttribute("y2", "13");

  const label = document.createElement("span");
  label.textContent = text;

  icon.append(head, body, horizontal, vertical);
  button.replaceChildren(icon, label);
}

function createProfileBlockButton(userName) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nsh-profile-user-action-button nsh-profile-block-button";
  button.dataset.nshProfileUserName = normalizeProfileActionUserName(userName);
  syncProfileBlockButton(button, userName);
  button.addEventListener("click", (event) => handleProfileBlockButtonClick(event, userName, button));
  return button;
}

function setProfileBlockButtonContent(button, text) {
  const icon = document.createElementNS(SVG_NAMESPACE, "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.classList.add("nsh-profile-action-icon");

  const circle = document.createElementNS(SVG_NAMESPACE, "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "12");
  circle.setAttribute("r", "9");

  const line = document.createElementNS(SVG_NAMESPACE, "line");
  line.setAttribute("x1", "5.6");
  line.setAttribute("y1", "18.4");
  line.setAttribute("x2", "18.4");
  line.setAttribute("y2", "5.6");

  const label = document.createElement("span");
  label.textContent = text;

  icon.appendChild(circle);
  icon.appendChild(line);
  button.replaceChildren(icon, label);
}

function normalizeProfileActionUserName(userName) {
  return normalizeBlockFilterList([userName])[0] || "";
}

function getProfileFollowButtonState(userName) {
  const normalizedUserName = normalizeProfileActionUserName(userName);
  const groups = normalizeFollowRules(featureOptions.followRules).userGroups;
  const groupCount = normalizedUserName
    ? groups.filter((group) => group.items.includes(normalizedUserName)).length
    : 0;
  return {
    followed: groupCount > 0,
    groupCount
  };
}

function syncProfileFollowButton(button, userName) {
  const state = getProfileFollowButtonState(userName);
  button.disabled = false;
  button.title = state.followed
    ? `管理用户 ${userName} 的标记分组（${state.groupCount}）`
    : `标记用户 ${userName}`;
  setProfileFollowButtonContent(
    button,
    state.followed ? `已标记（${state.groupCount}）` : "标记"
  );
}

function syncProfileBlockButton(button, userName) {
  const blocked = isProfileBlockedUser(userName);
  button.disabled = Boolean(blocked);
  button.title = blocked ? `已屏蔽用户 ${userName}` : `屏蔽用户 ${userName}`;
  setProfileBlockButtonContent(button, blocked ? "已屏蔽" : "屏蔽");
}

function refreshProfileUserActionButtons(userName = "") {
  const normalizedFilter = normalizeProfileActionUserName(userName);
  document.querySelectorAll(".nsh-profile-user-action-button").forEach((button) => {
    const buttonUserName = button.dataset.nshProfileUserName || "";
    if (normalizedFilter && buttonUserName !== normalizedFilter) {
      return;
    }

    if (button.classList.contains("nsh-profile-follow-button")) {
      syncProfileFollowButton(button, buttonUserName);
      return;
    }
    if (button.classList.contains("nsh-profile-block-button")) {
      syncProfileBlockButton(button, buttonUserName);
    }
  });
}

async function handleProfileFollowButtonClick(event, userName, button) {
  event.preventDefault();
  event.stopPropagation();

  button.disabled = true;
  try {
    const groups = await getFollowUserGroupOptions(userName);
    const selection = await openFollowRuleGroupDialog("user", userName, groups);
    if (!selection) {
      syncProfileFollowButton(button, userName);
      return;
    }

    setProfileFollowButtonContent(button, "保存中");
    if (selection.mode === "create") {
      await createNamedFollowRuleGroup(
        "user",
        selection.groupName,
        userName,
        selection.groupIds
      );
    } else if (selection.mode === "manage") {
      await setFollowedUserGroups(userName, selection.groupIds);
    } else {
      await assignFollowRuleItemToGroup("user", userName, selection.groupId);
    }
    refreshProfileUserActionButtons(userName);
  } catch (error) {
    syncProfileFollowButton(button, userName);
    button.title = error.message || "保存失败";
  }
}

function isProfileBlockedUser(userName) {
  const normalizedUserName = normalizeBlockFilterList([userName])[0] || "";
  return normalizedUserName && normalizeBlockFilterList(featureOptions.blockedUsers).includes(normalizedUserName);
}

async function handleProfileBlockButtonClick(event, userName, button) {
  event.preventDefault();
  event.stopPropagation();

  if (!await confirmBlockFilterSelectionAdd(userName, "user")) {
    return;
  }

  button.disabled = true;
  setProfileBlockButtonContent(button, "屏蔽中");

  try {
    await addBlockedUser(userName);
    refreshProfileUserActionButtons(userName);
  } catch (error) {
    button.disabled = false;
    setProfileBlockButtonContent(button, "屏蔽");
    button.title = error.message || "屏蔽失败";
  }
}

const PROFILE_DETAIL_COLUMNS = [
  [
    { key: "member_id" },
    { key: "rank" },
    { key: "coin" },
    { key: "nPost" },
    { key: "nComment" },
    { key: "created_at_str" }
  ],
  [
    { key: "isAdmin" },
    { key: "stardust" },
    { key: "follows" },
    { key: "fans" },
    { key: "followed" },
    { key: "roles", emptyText: "无" }
  ]
];

function renderProfileDetailBody(body, record) {
  body.replaceChildren();
  if (!record?.detail) {
    const empty = document.createElement("p");
    empty.textContent = "暂无本地用户数据";
    body.appendChild(empty);
    return;
  }

  const timeParts = getProfileDetailTimeParts(record);
  if (timeParts.length > 0) {
    const meta = document.createElement("p");
    meta.className = "nsh-profile-detail-meta";
    meta.textContent = timeParts.join(" · ");
    body.appendChild(meta);
  }

  const columns = document.createElement("div");
  columns.className = "nsh-profile-detail-columns";

  PROFILE_DETAIL_COLUMNS.forEach((columnFields) => {
    columns.appendChild(createProfileDetailColumn(record.detail, columnFields));
  });

  body.appendChild(columns);

  const bio = getProfileDetailEntry(record.detail, { key: "bio", label: "bio" });
  if (bio) {
    body.appendChild(createProfileDetailFullRow(bio));
  }

  PROFILE_DETAIL_TEXT_FIELDS.forEach((field) => {
    const content = record.detail[field];
    if (typeof content !== "string" || !content.trim()) {
      return;
    }

    body.appendChild(createProfileDetailTextSection(getProfileDetailLabel(field), content));
  });
}

function getProfileDetailTimeParts(record) {
  const timeParts = [];
  const registeredAt = formatProfileDetailTime(record.detail.created_at);
  const updatedAt = formatProfileDetailTime(Number(record.snapshot?.collectedAt) || 0);

  if (registeredAt) {
    timeParts.push(`注册 ${registeredAt}`);
  }

  if (updatedAt) {
    timeParts.push(`更新 ${updatedAt}`);
  }

  return timeParts;
}

function formatProfileDetailTime(value) {
  if (!isProfileValuePresent(value)) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN", { hour12: false });
}

function createProfileDetailColumn(detail, fields) {
  const grid = document.createElement("dl");
  grid.className = "nsh-profile-detail-grid";

  fields.forEach((field) => {
    const entry = getProfileDetailEntry(detail, field, { includeEmpty: true });
    if (!entry) {
      return;
    }

    const term = document.createElement("dt");
    term.textContent = entry.label;
    const description = document.createElement("dd");
    description.textContent = entry.value;
    grid.appendChild(term);
    grid.appendChild(description);
  });

  return grid;
}

function getProfileDetailEntry(detail, field, options = {}) {
  const keys = field.valueKeys || [field.key];
  const valueKey = keys.find((key) => isProfileValuePresent(detail[key]));
  if (!valueKey && !options.includeEmpty) {
    return null;
  }

  const key = valueKey || field.key;
  const value = detail[key];
  return {
    label: field.label || getProfileDetailLabel(field.key),
    value: isProfileValuePresent(value) ? formatProfileDetailValue(key, value) : (field.emptyText || "")
  };
}

function createProfileDetailFullRow(entry) {
  const grid = document.createElement("dl");
  grid.className = "nsh-profile-detail-grid nsh-profile-detail-full-row";

  const term = document.createElement("dt");
  term.textContent = entry.label;
  const description = document.createElement("dd");
  description.textContent = entry.value;

  grid.appendChild(term);
  grid.appendChild(description);
  return grid;
}

function createProfileDetailTextSection(label, content) {
  const section = document.createElement("section");
  section.className = "nsh-profile-detail-text";

  const heading = document.createElement("h3");
  heading.textContent = label;

  section.appendChild(heading);
  section.appendChild(createProfileMarkdownContent(content));
  return section;
}

function createProfileMarkdownContent(content) {
  const container = document.createElement("div");
  container.className = "nsh-profile-detail-markdown";
  const lines = String(content).replace(/\r\n?/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    if (/^```/.test(lines[index])) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      container.appendChild(createProfileMarkdownCodeBlock(codeLines.join("\n")));
      continue;
    }

    const headingMatch = lines[index].match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const heading = document.createElement(`h${headingMatch[1].length}`);
      heading.appendChild(createProfileMarkdownInlineFragment(headingMatch[2].trim()));
      container.appendChild(heading);
      index += 1;
      continue;
    }

    const listMatch = lines[index].match(/^\s*(?:[-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const ordered = /^\s*\d+\./.test(lines[index]);
      const list = document.createElement(ordered ? "ol" : "ul");
      while (index < lines.length) {
        const itemMatch = lines[index].match(ordered ? /^\s*\d+\.\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/);
        if (!itemMatch) {
          break;
        }
        const item = document.createElement("li");
        item.appendChild(createProfileMarkdownInlineFragment(itemMatch[1].trim()));
        list.appendChild(item);
        index += 1;
      }
      container.appendChild(list);
      continue;
    }

    if (/^>\s?/.test(lines[index])) {
      const quote = document.createElement("blockquote");
      const quoteLines = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      quote.appendChild(createProfileMarkdownParagraph(quoteLines));
      container.appendChild(quote);
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length && lines[index].trim() && !isProfileMarkdownBlockStart(lines[index])) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    container.appendChild(createProfileMarkdownParagraph(paragraphLines));
  }

  return container;
}

function isProfileMarkdownBlockStart(line) {
  return /^```/.test(line)
    || /^(#{1,6})\s+/.test(line)
    || /^\s*(?:[-*+]|\d+\.)\s+/.test(line)
    || /^>\s?/.test(line);
}

function createProfileMarkdownCodeBlock(content) {
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = content;
  pre.appendChild(code);
  return pre;
}

function createProfileMarkdownParagraph(lines) {
  const paragraph = document.createElement("p");
  lines.forEach((line, index) => {
    if (index > 0) {
      paragraph.appendChild(document.createElement("br"));
    }
    paragraph.appendChild(createProfileMarkdownInlineFragment(line));
  });
  return paragraph;
}

function createProfileMarkdownInlineFragment(text) {
  const fragment = document.createDocumentFragment();
  const pattern = /\[!\[([^\]]*)]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)|!\[([^\]]*)]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)|\[([^\]]+)]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*?)\*|_([^_\s][^_]*?)_|(?<![\w.+-])@([A-Za-z0-9_-]{2,32})(?![A-Za-z0-9_-])/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      fragment.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    }
    fragment.appendChild(createProfileMarkdownInlineNode(match));
    cursor = pattern.lastIndex;
  }

  if (cursor < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(cursor)));
  }

  return fragment;
}

function createProfileMarkdownInlineNode(match) {
  if (match[1] !== undefined) {
    return createProfileMarkdownLinkedImage(match[1], match[2], match[3]);
  }

  if (match[4] !== undefined) {
    return createProfileMarkdownImage(match[4], match[5]);
  }

  if (match[6] !== undefined) {
    return createProfileMarkdownLink(match[6], match[7]);
  }

  if (match[8] !== undefined) {
    const code = document.createElement("code");
    code.textContent = match[8];
    return code;
  }

  if (match[13] !== undefined) {
    const link = document.createElement("a");
    link.className = "nsh-profile-mention";
    link.href = `/space/${encodeURIComponent(match[13])}`;
    link.textContent = `@${match[13]}`;
    return link;
  }

  if (match[9] !== undefined || match[10] !== undefined) {
    const strong = document.createElement("strong");
    strong.textContent = match[9] || match[10];
    return strong;
  }

  const emphasis = document.createElement("em");
  emphasis.textContent = match[11] || match[12] || "";
  return emphasis;
}

function createProfileMarkdownLink(text, url) {
  const safeUrl = getSafeProfileMarkdownUrl(url, false);
  if (!safeUrl) {
    return document.createTextNode(text);
  }

  const link = document.createElement("a");
  link.href = safeUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = text;
  return link;
}

function createProfileMarkdownImage(alt, url) {
  const safeUrl = getSafeProfileMarkdownUrl(url, true);
  if (!safeUrl) {
    return document.createTextNode(alt);
  }

  const image = document.createElement("img");
  image.src = safeUrl;
  image.alt = alt;
  image.loading = "lazy";
  return image;
}

function createProfileMarkdownLinkedImage(alt, imageUrl, linkUrl) {
  const image = createProfileMarkdownImage(alt, imageUrl);
  if (image.nodeType !== Node.ELEMENT_NODE) {
    return image;
  }

  const safeLinkUrl = getSafeProfileMarkdownUrl(linkUrl, false);
  if (!safeLinkUrl) {
    return image;
  }

  const link = document.createElement("a");
  link.href = safeLinkUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.appendChild(image);
  return link;
}

function getSafeProfileMarkdownUrl(url, imageOnly) {
  try {
    const parsedUrl = new URL(url, location.href);
    const allowedProtocols = imageOnly ? ["http:", "https:"] : ["http:", "https:", "mailto:"];
    return allowedProtocols.includes(parsedUrl.protocol) ? parsedUrl.href : "";
  } catch {
    return "";
  }
}

function getProfileDetailLabel(key) {
  const field = PROFILE_FIELD_DEFINITIONS.find((definition) => definition.key === key);
  const labels = {
    readme: "Readme"
  };
  return field?.label || labels[key] || key;
}

function formatProfileDetailValue(key, value) {
  const field = PROFILE_FIELD_DEFINITIONS.find((definition) => definition.key === key);
  if (field) {
    return formatProfileValue(field, value);
  }

  if (Array.isArray(value)) {
    return value.map(formatArrayProfileValue).filter(Boolean).join("、");
  }

  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

async function confirmRefreshProfile(memberId, memberName, trigger) {
  const confirmed = await openProfileRefreshDialog(memberName);
  if (!confirmed) {
    return false;
  }

  return refreshProfile(memberId, trigger);
}

async function refreshProfile(memberId, trigger) {
  const originalText = trigger.textContent;
  trigger.disabled = true;
  trigger.textContent = "刷新中";

  try {
    PROFILE_CACHE.delete(memberId);
    const options = await chrome.storage.local.get(DEFAULT_OPTIONS);
    const cacheHours = normalizeUserCacheHours(options.userCacheHours);
    const profile = await loadFreshProfile(memberId);
    await writeStoredProfile(memberId, profile, cacheHours);
    const levelColors = await getLevelColors();

    document.querySelectorAll(`.nsh-user-stats[data-nsh-member-id="${memberId}"]`).forEach((node) => {
      const authorInfo = node.closest(".author-info");
      if (authorInfo) {
        renderProfile(authorInfo, memberId, node.dataset.nshMemberName || memberId, profile, levelColors);
      }
    });
    if (trigger.isConnected) {
      trigger.disabled = false;
      trigger.textContent = originalText;
    }
    return true;
  } catch (error) {
    trigger.disabled = false;
    trigger.textContent = "刷新失败";
    window.setTimeout(() => {
      trigger.textContent = originalText;
    }, 1600);
    return false;
  }
}

function openProfileRefreshDialog(memberName) {
  return openNshConfirmDialog({
    title: "刷新用户数据",
    message: `确定立即刷新「${memberName || "该用户"}」的用户数据吗？`,
    confirmText: "刷新"
  });
}

function openLuckyDeleteDialog(postTitle) {
  return openNshConfirmDialog({
    title: "删除抽奖通知",
    message: `确定删除「${postTitle || "这条抽奖通知"}」吗？`,
    confirmText: "删除",
    confirmClassName: "nsh-dialog-danger"
  });
}

function getProfileLevel(profile) {
  const match = String(profile.rank ?? profile.level ?? "").match(/\d+/);
  const level = match ? Number(match[0]) : 0;
  return level >= 1 && level <= 6 ? String(level) : "1";
}

function applyProfileLevelColors(node, level, levelColors) {
  const background = normalizeColor(levelColors?.[level], DEFAULT_LEVEL_COLORS[level] || DEFAULT_LEVEL_COLORS[1]);
  node.style.setProperty("--nsh-user-stat-bg", background);
  node.style.setProperty("--nsh-user-stat-fg", getReadableTextColor(background));
  node.style.setProperty("--nsh-user-stat-border", getColorRgb(background).toLowerCase() === "#ffffff" ? "#d0d7de" : background);
}

function getReadableTextColor(background) {
  const color = parseColor(background, { red: 0, green: 0, blue: 0, alpha: 1 });
  const red = getEffectiveColorChannel(color.red / 255, color.alpha);
  const green = getEffectiveColorChannel(color.green / 255, color.alpha);
  const blue = getEffectiveColorChannel(color.blue / 255, color.alpha);
  const luminance = 0.2126 * toLinearColor(red) + 0.7152 * toLinearColor(green) + 0.0722 * toLinearColor(blue);
  return luminance > 0.58 ? "#24292f" : "#ffffff";
}

function getColorRgb(value) {
  const color = parseColor(value, { red: 0, green: 0, blue: 0, alpha: 1 });
  return formatHexColor({ ...color, alpha: 1 });
}

function parseColor(value, fallback) {
  const color = normalizeColor(value, "#000000");
  const hexColor = parseHexColor(color);
  return hexColor || parseRgbColor(color) || fallback;
}

function parseHexColor(value) {
  const match = String(value || "").trim().match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (!match) {
    return null;
  }

  return {
    red: parseInt(match[1].slice(0, 2), 16),
    green: parseInt(match[1].slice(2, 4), 16),
    blue: parseInt(match[1].slice(4, 6), 16),
    alpha: match[2] ? parseInt(match[2], 16) / 255 : 1
  };
}

function parseRgbColor(value) {
  const match = String(value || "").trim().match(/^rgba?\((.+)\)$/i);
  if (!match) {
    return null;
  }

  const [colorPart, alphaPart = ""] = match[1].split("/").map((part) => part.trim());
  const parts = colorPart.includes(",")
    ? colorPart.split(",").map((part) => part.trim()).filter(Boolean)
    : colorPart.split(/\s+/).filter(Boolean);
  const alphaValue = alphaPart || (parts.length === 4 ? parts.pop() : "");

  if (parts.length !== 3) {
    return null;
  }

  const channels = parts.map(parseColorChannel);
  const alpha = alphaValue ? parseColorAlpha(alphaValue) : 1;
  if (channels.some((channel) => channel === null) || alpha === null) {
    return null;
  }

  return {
    red: channels[0],
    green: channels[1],
    blue: channels[2],
    alpha
  };
}

function parseColorChannel(value) {
  const text = String(value || "").trim();
  const number = text.endsWith("%") ? Number(text.slice(0, -1)) / 100 * 255 : Number(text);
  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.min(255, Math.max(0, Math.round(number)));
}

function parseColorAlpha(value) {
  const text = String(value || "").trim();
  const alpha = text.endsWith("%") ? Number(text.slice(0, -1)) / 100 : Number(text);
  if (!Number.isFinite(alpha)) {
    return null;
  }

  return Math.min(1, Math.max(0, alpha));
}

function formatHexColor(color) {
  const rgb = [color.red, color.green, color.blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");
  const alpha = Math.round(color.alpha * 255);

  return alpha >= 255 ? `#${rgb}` : `#${rgb}${alpha.toString(16).padStart(2, "0")}`;
}

function getEffectiveColorChannel(value, alpha) {
  return value * alpha + (1 - alpha);
}

function toLinearColor(value) {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function cleanText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}
