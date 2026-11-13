let dbPromise = null;
function openDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const upgradeTransaction = request.transaction;

      const profiles = ensureObjectStore(db, upgradeTransaction, STORE_PROFILES, { keyPath: "memberId" });
      ensureIndex(profiles, "byCachedAt", "cachedAt");
      ensureIndex(profiles, "byLatestCollectedAt", "latestCollectedAt");

      const snapshots = ensureObjectStore(db, upgradeTransaction, STORE_PROFILE_SNAPSHOTS, { keyPath: "id" });
      ensureIndex(snapshots, "byMemberId", "memberId");
      ensureIndex(snapshots, "byCollectedAt", "collectedAt");
      ensureIndex(snapshots, "byMemberCollectedAt", ["memberId", "collectedAt"]);

      const textBlobs = ensureObjectStore(db, upgradeTransaction, STORE_PROFILE_TEXT_BLOBS, { keyPath: "hash" });
      ensureIndex(textBlobs, "byLastSeenAt", "lastSeenAt");

      const lucky = ensureObjectStore(db, upgradeTransaction, STORE_LUCKY_NOTIFICATIONS, { keyPath: "id" });
      ensureIndex(lucky, "byAddedAt", "addedAt");
      ensureIndex(lucky, "byDrawAt", "drawAt");
      ensureIndex(lucky, "byStatusDrawAt", ["status", "drawAt"]);
      ensureIndex(lucky, "byStatusAddedAt", ["status", "addedAt"]);
      ensureIndex(lucky, "byPostId", "postId");
      ensureIndex(lucky, "byLuckyUrl", "luckyUrl", { unique: true });
      ensureIndex(lucky, "byNotificationId", "notificationId");

      const visitHistory = ensureObjectStore(db, upgradeTransaction, STORE_VISIT_HISTORY, { keyPath: "id" });
      ensureIndex(visitHistory, "byVisitedAt", "visitedAt");
      ensureIndex(visitHistory, "byPostedAt", "postedAt");
      ensureIndex(visitHistory, "byAuthorName", "authorName");

      ensureObjectStore(db, upgradeTransaction, STORE_META, { keyPath: "key" });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("打开 IndexedDB 失败"));
  });

  return dbPromise;
}

function ensureObjectStore(db, transaction, name, options) {
  return db.objectStoreNames.contains(name)
    ? transaction.objectStore(name)
    : db.createObjectStore(name, options);
}

function ensureIndex(store, name, keyPath, options = {}) {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, options);
  }
}

async function withTransaction(storeNames, mode, callback) {
  const db = await openDatabase();
  const tx = db.transaction(storeNames, mode);
  const done = transactionDone(tx);
  const stores = Object.fromEntries(storeNames.map((name) => [name, tx.objectStore(name)]));

  try {
    const result = await callback(stores, tx);
    await done;
    return result;
  } catch (error) {
    try {
      tx.abort();
    } catch (_abortError) {}
    throw error;
  }
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB 事务失败"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB 事务已中止"));
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB 请求失败"));
  });
}

function collectCursorValues(source, range, direction, offset, limit) {
  return new Promise((resolve, reject) => {
    const items = [];
    let skipped = 0;
    const request = source.openCursor(range, direction);

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || items.length >= limit) {
        resolve(items);
        return;
      }

      if (skipped < offset) {
        skipped += 1;
        cursor.continue();
        return;
      }

      items.push(cursor.value);
      cursor.continue();
    };
    request.onerror = () => reject(request.error || new Error("读取 IndexedDB 游标失败"));
  });
}
