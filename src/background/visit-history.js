const VISIT_HISTORY_ORIGIN = "https://www.nodeseek.com";
const VISIT_HISTORY_COUNT_INTERVAL_MS = 5 * 60 * 1000;

async function addVisitHistory(post) {
  const normalized = normalizeVisitHistoryItem(post);
  return withTransaction([STORE_VISIT_HISTORY], "readwrite", async ({ visitHistory }) => {
    const existing = await requestToPromise(visitHistory.get(normalized.id));
    const now = Date.now();
    const shouldCountVisit = !existing || now - (Number(existing.visitedAt) || 0) > VISIT_HISTORY_COUNT_INTERVAL_MS;
    const existingVisitCount = existing ? Math.max(Number(existing.visitCount) || 0, 1) : 0;
    const item = {
      ...existing,
      ...normalized,
      title: normalized.title || existing?.title || "NodeSeek 帖子",
      postUrl: normalized.postUrl || existing?.postUrl || `${VISIT_HISTORY_ORIGIN}/post-${normalized.postId}`,
      authorName: normalized.authorName || existing?.authorName || "",
      authorId: normalized.authorId || existing?.authorId || "",
      authorUrl: normalized.authorUrl || existing?.authorUrl || "",
      postedAt: normalized.postedAt || Number(existing?.postedAt) || 0,
      postedAtText: normalized.postedAtText || existing?.postedAtText || "",
      firstVisitedAt: Number(existing?.firstVisitedAt) || now,
      visitedAt: now,
      visitCount: existingVisitCount + (shouldCountVisit ? 1 : 0),
      updatedAt: now
    };

    await requestToPromise(visitHistory.put(item));
    return { item };
  });
}

async function deleteVisitHistory(payload) {
  const id = normalizeVisitHistoryPostId(payload?.postId || payload?.id);
  if (!id) {
    return { changed: false };
  }

  return withTransaction([STORE_VISIT_HISTORY], "readwrite", async ({ visitHistory }) => {
    const item = await requestToPromise(visitHistory.get(id));
    if (!item) {
      return { changed: false };
    }

    await requestToPromise(visitHistory.delete(id));
    return { changed: true };
  });
}

async function getVisitedHistoryPostIds(payload) {
  const postIds = normalizeVisitHistoryPostIds(payload?.postIds);
  if (postIds.length === 0) {
    return { postIds: [] };
  }

  return withTransaction([STORE_VISIT_HISTORY], "readonly", async ({ visitHistory }) => {
    const visited = [];
    for (const postId of postIds) {
      const item = await requestToPromise(visitHistory.get(postId));
      if (item) {
        visited.push(postId);
      }
    }
    return { postIds: visited };
  });
}

async function listVisitHistory(payload) {
  const filters = normalizeVisitHistoryFilters(payload);
  const limit = Math.min(Math.max(Math.floor(Number(payload.limit) || 50), 1), 100);
  const offset = Math.max(Math.floor(Number(payload.offset) || 0), 0);

  return withTransaction([STORE_VISIT_HISTORY], "readonly", async ({ visitHistory }) => {
    const index = visitHistory.index("byVisitedAt");
    if (hasVisitHistoryFilters(filters)) {
      const dateFiltered = filters.postedAtFrom || filters.postedAtTo;
      const start = filters.postedAtFrom || 1;
      const end = filters.postedAtTo || Number.MAX_SAFE_INTEGER;
      if (start > end) return { items: [], total: 0, offset, limit };
      const source = dateFiltered ? visitHistory.index("byPostedAt") : index;
      const range = dateFiltered ? IDBKeyRange.bound(start, end) : null;
      const { items, total } = await collectFilteredVisitHistory(source, range, filters, offset, limit);
      return { items, total, offset, limit };
    }

    const total = await requestToPromise(visitHistory.count());
    const items = await collectCursorValues(index, null, "prev", offset, limit);
    return { items, total, offset, limit };
  });
}

function collectFilteredVisitHistory(index, range, filters, offset, limit) {
  return new Promise((resolve, reject) => {
    const items = [];
    let total = 0;
    const request = index.openCursor(range, "prev");
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve({ items: range ? items.slice(offset, offset + limit) : items, total });
        return;
      }
      if (matchesVisitHistoryFilters(cursor.value, filters)) {
        if (range) {
          const item = cursor.value;
          let low = 0;
          let high = items.length;
          while (low < high) {
            const middle = Math.floor((low + high) / 2);
            const existing = items[middle];
            if (existing.visitedAt > item.visitedAt || (existing.visitedAt === item.visitedAt && existing.id > item.id)) {
              low = middle + 1;
            } else {
              high = middle;
            }
          }
          if (low < offset + limit) {
            items.splice(low, 0, item);
            if (items.length > offset + limit) items.pop();
          }
        } else if (total >= offset && items.length < limit) items.push(cursor.value);
        total++;
      }
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

function normalizeVisitHistoryItem(post) {
  if (!post || typeof post !== "object") {
    throw new Error("访问足迹无效");
  }

  const postId = normalizeVisitHistoryPostId(post.postId) || getVisitHistoryPostIdFromUrl(post.postUrl);
  if (!postId) {
    throw new Error("帖子链接无效");
  }

  return {
    id: postId,
    postId,
    title: cleanText(post.title) || "NodeSeek 帖子",
    postUrl: normalizeVisitHistoryPostUrl(post.postUrl, postId),
    authorName: cleanText(post.authorName),
    authorId: cleanText(post.authorId),
    authorUrl: normalizeVisitHistoryAuthorUrl(post.authorUrl),
    postedAt: normalizeVisitHistoryTimestamp(post.postedAt),
    postedAtText: cleanText(post.postedAtText)
  };
}

function normalizeVisitHistoryPostIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map(normalizeVisitHistoryPostId).filter(Boolean))];
}

function normalizeVisitHistoryPostId(value) {
  return cleanText(value).match(/^\d+$/)?.[0] || "";
}

function normalizeVisitHistoryPostUrl(value, postId) {
  const text = cleanText(value);
  if (!text) {
    return `${VISIT_HISTORY_ORIGIN}/post-${postId}`;
  }

  try {
    const url = new URL(text, VISIT_HISTORY_ORIGIN);
    return url.toString();
  } catch (_error) {
    return `${VISIT_HISTORY_ORIGIN}/post-${postId}`;
  }
}

function normalizeVisitHistoryAuthorUrl(value) {
  const text = cleanText(value);
  if (!text) {
    return "";
  }

  try {
    return new URL(text, VISIT_HISTORY_ORIGIN).toString();
  } catch (_error) {
    return "";
  }
}

function getVisitHistoryPostIdFromUrl(value) {
  const text = cleanText(value);
  if (!text) {
    return "";
  }

  try {
    return new URL(text, VISIT_HISTORY_ORIGIN).pathname.match(/^\/post-(\d+)/)?.[1] || "";
  } catch (_error) {
    return "";
  }
}

function normalizeVisitHistoryFilters(payload) {
  return {
    titleQuery: cleanText(payload.titleQuery).toLowerCase(),
    authorQuery: cleanText(payload.authorQuery).toLowerCase(),
    postedAtFrom: normalizeVisitHistoryDateStart(payload.postedAtFrom),
    postedAtTo: normalizeVisitHistoryDateEnd(payload.postedAtTo)
  };
}

function hasVisitHistoryFilters(filters) {
  return Boolean(filters.titleQuery || filters.authorQuery || filters.postedAtFrom || filters.postedAtTo);
}

function matchesVisitHistoryFilters(item, filters) {
  if (filters.titleQuery && !cleanText(item?.title).toLowerCase().includes(filters.titleQuery)) {
    return false;
  }

  if (filters.authorQuery) {
    const authorText = `${cleanText(item?.authorName)} ${cleanText(item?.authorId)}`.toLowerCase();
    if (!authorText.includes(filters.authorQuery)) {
      return false;
    }
  }

  if (filters.postedAtFrom || filters.postedAtTo) {
    const postedAt = Number(item?.postedAt) || 0;
    if (!postedAt) {
      return false;
    }

    if (filters.postedAtFrom && postedAt < filters.postedAtFrom) {
      return false;
    }

    if (filters.postedAtTo && postedAt > filters.postedAtTo) {
      return false;
    }
  }

  return true;
}

function normalizeVisitHistoryTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
}

function normalizeVisitHistoryDateStart(value) {
  const text = cleanText(value);
  if (!text) {
    return 0;
  }

  const timestamp = new Date(`${text}T00:00:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeVisitHistoryDateEnd(value) {
  const text = cleanText(value);
  if (!text) {
    return 0;
  }

  const timestamp = new Date(`${text}T23:59:59.999`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}
