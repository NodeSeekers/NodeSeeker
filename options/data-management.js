let clearLocalDataDialogRequest = 0;

async function openClearProfileDialog() {
  const request = ++clearLocalDataDialogRequest;
  const inputs = [...clearProfileDialog.querySelectorAll("[data-clear-data-group]")];
  inputs.forEach((input) => {
    input.checked = false;
    input.nextElementSibling.textContent = "";
  });
  clearProfileDialog.hidden = false;
  cancelClearProfileButton.focus();
  try {
    const counts = await sendExtensionMessage("data:countGroups");
    if (request !== clearLocalDataDialogRequest) return;
    for (const input of inputs) input.nextElementSibling.textContent = `（${counts[input.value]} 条）`;
  } catch (error) {
    showToast(formatToastError(error, "读取本地资料数量失败"), "error");
  }
}

function closeClearProfileDialog() {
  clearLocalDataDialogRequest++;
  clearProfileDialog.hidden = true;
}

async function confirmClearProfileCache() {
  const groups = [...clearProfileDialog.querySelectorAll("[data-clear-data-group]:checked")].map((input) => input.value);
  if (!groups.length) {
    showToast("请选择要清理的资料", "error");
    return;
  }
  closeClearProfileDialog();
  try {
    await sendExtensionMessage("data:clearGroups", { groups });
    if (groups.includes("lucky")) {
      luckyPage = 0;
      await renderLuckyNotifications();
    }
    if (groups.includes("visits")) {
      visitHistoryPage = 0;
      await renderVisitHistory();
    }
    showToast("已清理选中的本地数据");
  } catch (error) {
    showToast(formatToastError(error, "清理本地数据失败"), "error");
  }
}
