async function handleMessage(message) {
  const payload = message.payload || {};

  switch (message.type) {
    case "uploadImage":
      return uploadImage(payload);
    case "profile:getCached":
      return getCachedProfile(payload);
    case "profile:saveSnapshot":
      return saveProfileSnapshot(payload);
    case "profile:getTrendEntries":
      return getProfileTrendEntries(payload);
    case "profile:getLatestSnapshot":
      return getLatestProfileSnapshot(payload);
    case "lucky:add":
      return addLuckyNotification(payload.notification);
    case "lucky:delete":
      return deleteLuckyNotification(payload);
    case "lucky:getByUrl":
      return getLuckyNotificationByUrl(payload);
    case "lucky:list":
      return listLuckyNotifications(payload);
    case "visitHistory:add":
      return addVisitHistory(payload.post);
    case "visitHistory:delete":
      return deleteVisitHistory(payload);
    case "visitHistory:getVisitedIds":
      return getVisitedHistoryPostIds(payload);
    case "visitHistory:list":
      return listVisitHistory(payload);
    case "data:exportDatabase":
      return exportDatabaseData();
    case "data:importDatabase":
      return importDatabaseData(payload);
    case "data:clearAll":
      return clearAllLocalData();
    default:
      throw new Error(`未知消息类型：${message.type}`);
  }
}
