const { test, expect, chromium } = require("@playwright/test");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");

test("extension loads, saves settings, and communicates with its background", async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "nodeseek-smoke-"));
  const extension = path.resolve(__dirname, "../..");
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: "chromium",
      headless: true,
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`
      ]
    });
    const worker = context.serviceWorkers()[0]
      || await context.waitForEvent("serviceworker");
    const extensionId = new URL(worker.url()).host;
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForFunction(() => {
      return document.querySelector("#followKeywordGroups")?.children.length > 0;
    });
    await expect(page.locator("#profileLabelSize")).toHaveValue("standard");
    await expect(page.locator("#autoAttendanceEnabled")).not.toBeChecked();
    await expect(page.locator("#profileHoverSignatureEnabled")).toBeChecked();
    await expect(page.locator("#profileHoverTrendEnabled")).not.toBeChecked();
    const expectedReplyShortcut = await page.evaluate(() => detectShortcutPlatform() === "mac" ? "Command+Enter" : "Ctrl+Enter");
    await expect(page.locator("#replySubmitShortcut")).toHaveValue(expectedReplyShortcut);
    await page.locator("label.quick-page-option").filter({ hasText: "悬停时显示用户趋势图" }).click();
    await page.locator("#profileLabelSize").selectOption("small");
    await page.locator('[data-panel-target="auto-page-panel"]').click();
    await page.locator("#autoAttendanceMode").selectOption("fixed");
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get(["profileLabelSize", "autoAttendanceEnabled", "autoAttendanceMode", "profileHoverTrendEnabled"]);
      return [state.profileLabelSize, state.autoAttendanceEnabled, state.autoAttendanceMode, state.profileHoverTrendEnabled];
    })).toEqual(["small", false, "fixed", true]);
    await page.reload();
    await expect(page.locator("#profileLabelSize")).toHaveValue("small");
    await expect(page.locator("#autoAttendanceMode")).toHaveValue("fixed");
    await expect(page.locator("#profileHoverTrendEnabled")).toBeChecked();
    const response = await page.evaluate(() => chrome.runtime.sendMessage({
      type: "profile:getCached",
      payload: { memberId: "automation-smoke-missing", cacheHours: 24 }
    }));
    expect(response.ok).toBe(true);
    await page.locator('[data-panel-target="block-filter-panel"]').click();
    await page.locator("#addFollowKeywordGroup").click();
    await page.locator(".follow-rule-name-input").fill("浏览器测试匹配组");
    await page.locator(".follow-rule-match-mode-select").selectOption("all");
    await page.locator("#confirmFollowRuleDialog").click();
    const keywordGroup = page.locator("#followKeywordGroups .follow-rule-row").filter({ hasText: "浏览器测试匹配组" });
    await keywordGroup.getByRole("button", { name: "编辑" }).click();
    const matchedTerms = page.locator('[data-follow-rule-item-list="items"]');
    await matchedTerms.fill("台湾, 家宽");
    await page.locator('[data-follow-rule-item-list="excludeItems"]').fill("收, 出");
    await page.locator("#followRuleDialogBody .follow-rule-keyword-entry").getByRole("button", { name: "添加" }).click();
    await expect(page.locator("#followRuleDialogBody .telegram-keyword-rule")).toHaveCount(1);
    await matchedTerms.fill("TW, 家宽");
    await page.locator('[data-follow-rule-item-list="excludeItems"]').fill("收, 出");
    await page.locator("#followRuleDialogBody .follow-rule-keyword-entry").getByRole("button", { name: "添加" }).click();
    await expect(page.locator("#followRuleDialogBody .telegram-keyword-rule")).toHaveCount(2);
    await expect(page.locator("#followRuleDialogBody .telegram-keyword-rule").nth(0)).toContainText("台湾");
    await expect(page.locator("#followRuleDialogBody .telegram-keyword-rule").nth(0)).toContainText("家宽");
    await expect(page.locator("#followRuleDialogBody .telegram-keyword-rule").nth(0)).toContainText("收");
    await expect(page.locator("#followRuleDialogBody .telegram-keyword-rule").nth(0)).not.toContainText("TW");
    await expect(page.locator("#followRuleDialogBody .telegram-keyword-rule").nth(1)).toContainText("TW");
    await expect(page.locator("#followRuleDialogBody .telegram-keyword-rule").nth(1)).not.toContainText("台湾");
    await matchedTerms.fill("临时");
    await page.locator("#followRuleDialogBody .follow-rule-keyword-entry").getByRole("button", { name: "添加" }).click();
    await page.getByRole("button", { name: "删除规则 临时" }).click();
    await expect(page.locator("#confirmDialog")).toBeHidden();
    await expect(page.locator("#followRuleDialogBody .telegram-keyword-rule")).toHaveCount(2);
    await page.locator("#confirmFollowRuleDialog").click();
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("followRules");
      const group = state.followRules?.keywordGroups?.find((entry) => entry.name === "浏览器测试匹配组");
      return group?.rules.map((rule) => [rule.mode, rule.terms, rule.excludeTerms]);
    })).toEqual([
      ["all", ["台湾", "家宽"], ["收", "出"]],
      ["all", ["TW", "家宽"], ["收", "出"]]
    ]);
    await page.locator('[data-panel-target="telegram-panel"]').click();
    await expect(page.locator("#addTelegramKeyword")).toHaveText("添加");
    await expect(page.locator("#saveTelegramConfig")).toHaveCount(0);
    await expect(page.locator('button[type="submit"]')).toHaveCount(0);
    await expect(page.locator("#telegramTargetListTitle")).toContainText("推送目标");
    await expect(page.locator("#commentToolsEnabled")).toHaveCount(0);
    await expect(page.locator("#telegramProtectedSettings")).toBeHidden();
    await expect(page.locator(".telegram-token-section a")).toHaveAttribute("href", "https://t.me/BotFather");
    await page.locator("#telegramBotToken").fill("test-token");
    await expect(page.locator("#telegramProtectedSettings")).toBeHidden();
    await page.locator("#telegramBotToken").fill("123456:abcdefghijklmnopqrstuvwxyz123456789");
    await page.evaluate(async () => {
      clearTimeout(telegramTokenValidationTimer);
      telegramTokenValidationRequestId += 1;
      telegramValidatedToken = document.querySelector("#telegramBotToken").value.trim();
      telegramTokenValidationState = "valid";
      syncTelegramSetupVisibility();
      await saveTelegramConfig({ silent: true });
    });
    await expect(page.locator("#telegramProtectedSettings")).toBeVisible();
    await expect(page.locator("#openTelegramBot")).toHaveText("Start");
    await page.locator("#telegramTargetType").selectOption("direct");
    await expect(page.locator("#telegramDirectFields")).toBeVisible();
    await expect(page.locator("#openTelegramBot")).toBeHidden();
    await expect(page.locator("#telegramTargetChatId")).toHaveAttribute("placeholder", "频道分享链接（https://t.me/...）");
    await expect(page.locator("#telegramDirectTopicPickerButton")).toContainText("读取可用接收对话");
    await expect(page.locator("#addTelegramTarget")).toHaveCount(0);
    await expect(page.locator("#testTelegramConfig")).toHaveCount(0);
    expect(await page.evaluate(() => [
      normalizeTelegramChannelInput("https://t.me/ExampleChannel"),
      normalizeTelegramChannelInput("https://t.me/s/ExampleChannel/123"),
      normalizeTelegramChannelInput("@ExampleChannel"),
      normalizeTelegramChannelInput("https://t.me/private-invite-example")
    ])).toEqual(["examplechannel", "examplechannel", "examplechannel", ""]);

    await worker.evaluate(async () => chrome.storage.local.set({
      telegramMessageNotificationsEnabled: false,
      telegramPostNotificationsEnabled: false,
      telegramMonitorPaused: true
    }));
    await page.evaluate(() => {
      document.querySelector("#telegramTargetName").value = "test direct";
      document.querySelector("#telegramTargetChatId").value = "https://t.me/examplechannel";
      telegramTargets = [];
      telegramDirectTopics = [{
        chatId: "-1001234567890", topicId: "424242", topicUser: "Synthetic receiver",
        topicUsername: "synthetic_receiver", sourceChannel: "examplechannel"
      }];
      renderTelegramTargets();
      renderTelegramDirectTopicMenu();
      document.querySelector("#telegramDirectTopicMenu").hidden = false;
    });
    await page.locator('[data-direct-topic-key="-1001234567890:424242"]').click();
    await expect(page.locator("#telegramTargetList")).toContainText("test direct");
    await expect(page.locator("#telegramTargetList [data-telegram-target-test]")).toHaveCount(1);

    await page.locator("#telegramTargetType").selectOption("personal");
    await expect(page.locator("#telegramDirectFields")).toBeHidden();
    await expect(page.locator("#openTelegramBot")).toBeVisible();
    await page.evaluate(async () => ensureTelegramPersonalTarget("987654", "test personal"));
    await expect(page.locator("#telegramTargetList")).toContainText("test personal");
    await expect(page.locator("#telegramTargetList")).not.toContainText("987654");
    await expect(page.locator("#telegramTargetList [data-telegram-target-test]")).toHaveCount(2);
    await expect.poll(() => page.locator("#telegramKeywordRuleList").evaluate((node) => {
      return getComputedStyle(node).gridTemplateColumns.split(" ").length;
    })).toBe(3);
    await expect.poll(() => page.locator("#telegramBoardSlugs").evaluate((node) => {
      return getComputedStyle(node).gridTemplateColumns.split(" ").length;
    })).toBe(5);
    const boardCheckboxWidth = await page.locator("[data-telegram-board]").first().evaluate((node) => {
      return node.getBoundingClientRect().width;
    });
    expect(boardCheckboxWidth).toBeLessThan(24);
    await page.locator("#telegramKeywordInput").fill("v.ps, gen2\n家人");
    await page.locator("#telegramKeywordMode").selectOption("all");
    await page.locator("#telegramKeywordExcludeInput").fill("已出, 求购");
    await page.locator("#addTelegramKeyword").click();
    await page.locator("[data-telegram-board]").evaluateAll((inputs) => {
      inputs.forEach((input) => { input.checked = false; });
    });
    await page.locator('[data-telegram-board][value="daily"]').check();
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get(["telegramTargets", "telegramBotToken", "telegramKeywordRules", "telegramBoardSlugs"]);
      return [state.telegramTargets?.map((target) => [target.type, target.name]), state.telegramBotToken,
        state.telegramKeywordRules?.[0]?.mode, state.telegramBoardSlugs?.[0], state.telegramKeywordRules?.[0]?.excludeTerms];
    })).toEqual([[ ["direct", "test direct"], ["personal", "test personal"] ], "123456:abcdefghijklmnopqrstuvwxyz123456789", "all", "daily", ["已出", "求购"]]);
    await page.reload();
    await page.waitForFunction(() => {
      return document.querySelector("#followKeywordGroups")?.children.length > 0;
    });
    await page.locator('[data-panel-target="block-filter-panel"]').click();
    const restoredKeywordGroup = page.locator("#followKeywordGroups .follow-rule-row").filter({ hasText: "浏览器测试匹配组" });
    await expect(restoredKeywordGroup).toContainText("2 条规则");
    await restoredKeywordGroup.getByRole("button", { name: "编辑" }).click();
    await expect(page.locator(".follow-rule-match-mode-select")).toHaveValue("all");
    await expect(page.locator("#followRuleDialogBody .telegram-keyword-rule")).toHaveCount(2);
    await expect(page.locator("#followRuleDialogBody .telegram-keyword-rule").nth(0)).toContainText("台湾");
    await expect(page.locator("#followRuleDialogBody .telegram-keyword-rule").nth(0)).not.toContainText("TW");
    await expect(page.locator("#followRuleDialogBody .telegram-keyword-rule").nth(1)).toContainText("TW");
    await page.locator("#cancelFollowRuleDialog").click();
    await page.locator('[data-panel-target="telegram-panel"]').click();
    await expect(page.locator("#telegramTargetList")).toContainText("test personal");
    await expect(page.locator("#telegramKeywordRuleList")).toContainText("已出");
    await page.locator('[data-panel-target="telegram-panel"]').click();
    const targetToggle = page.locator("#telegramTargetList [data-telegram-target-enabled]").first();
    await expect(targetToggle).toBeChecked();
    await targetToggle.uncheck();
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("telegramTargets");
      return state.telegramTargets?.[0]?.enabled;
    })).toBe(false);
    await expect(page.locator("#telegramTargetList")).toContainText("已关闭");
    await page.reload();
    await page.locator('[data-panel-target="telegram-panel"]').click();
    await expect(page.locator("#telegramTargetList [data-telegram-target-enabled]").first()).not.toBeChecked();
    await page.locator("#telegramTargetList [data-telegram-target-enabled]").first().check();
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("telegramTargets");
      return state.telegramTargets?.[0]?.enabled;
    })).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.locator("#telegramKeywordRuleList").evaluate((node) => {
      return getComputedStyle(node).gridTemplateColumns.split(" ").length;
    })).toBe(1);
    await expect.poll(() => page.locator("#telegramBoardSlugs").evaluate((node) => {
      return getComputedStyle(node).gridTemplateColumns.split(" ").length;
    })).toBe(2);
    expect(errors).toEqual([]);
  } finally {
    if (context) await context.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
});
