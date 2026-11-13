function openClearProfileDialog() {
  clearProfileDialog.hidden = false;
  cancelClearProfileButton.focus();
}

function closeClearProfileDialog() {
  clearProfileDialog.hidden = true;
}

async function confirmClearProfileCache() {
  closeClearProfileDialog();
  luckyPage = 0;
  try {
    await sendExtensionMessage("data:clearAll");
    await renderLuckyNotifications();
    visitHistoryPage = 0;
    await renderVisitHistory();
    showToast("已清空本地数据");
  } catch (error) {
    showToast(formatToastError(error, "清空本地数据失败"), "error");
  }
}
