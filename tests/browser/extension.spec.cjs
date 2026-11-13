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
    await page.locator("#profileLabelSize").selectOption("small");
    await page.locator('[data-panel-target="auto-page-panel"]').click();
    await page.locator("#autoAttendanceMode").selectOption("fixed");
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get(["profileLabelSize", "autoAttendanceEnabled", "autoAttendanceMode"]);
      return [state.profileLabelSize, state.autoAttendanceEnabled, state.autoAttendanceMode];
    })).toEqual(["small", false, "fixed"]);
    await page.reload();
    await expect(page.locator("#profileLabelSize")).toHaveValue("small");
    await expect(page.locator("#autoAttendanceMode")).toHaveValue("fixed");
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
    await expect(page.locator("#telegramTargetListTitle")).toContainText("已添加目标");
    await expect(page.locator("#commentToolsEnabled")).toHaveCount(0);
    await expect(page.locator("#telegramPersonalBotStart")).toBeVisible();
    await expect(page.locator("#telegramPersonalBotStart")).toContainText("监听最长 5 分钟");
    await page.locator("#telegramTargetType").selectOption("direct");
    await expect(page.locator("#telegramTargetActionHint")).toContainText("小号");
    await expect(page.locator("#telegramDirectTopicPickerField")).toBeVisible();
    await expect(page.locator("#telegramTargetChatIdLabel")).toHaveText("频道分享链接");
    await expect(page.locator("#telegramTargetChatId")).toHaveAttribute("placeholder", "https://t.me/channel");
    await expect(page.locator("#telegramDirectTopicPickerField")).toContainText("选择通知接收对话");
    await expect(page.locator("#telegramPersonalBotStart")).toBeHidden();
    await expect(page.locator("#detectTelegramPersonalChatId")).toHaveCount(0);
    const directSteps = page.locator("#telegramDirectTargetHelp li");
    await expect(directSteps).toHaveCount(4);
    await expect(directSteps).toHaveText([
      "在目标频道设置里把 Bot 设为管理员，授予“管理 Direct Messages”。",
      "填写频道公开分享链接（如 https://t.me/channel）。",
      "使用频道创建者以外的 Telegram 账号打开频道分享链接，并向频道 Direct 发一条消息；然后在下拉列表中选择该账号作为通知接收者。Telegram 限制频道创建者主动发起对话。",
      "点击“添加目标”。"
    ]);
    expect(await page.evaluate(() => [
      normalizeTelegramChannelInput("https://t.me/ExampleChannel"),
      normalizeTelegramChannelInput("https://t.me/s/ExampleChannel/123"),
      normalizeTelegramChannelInput("@ExampleChannel"),
      normalizeTelegramChannelInput("https://t.me/+privateInvite")
    ])).toEqual(["examplechannel", "examplechannel", "examplechannel", ""]);
    await page.locator("#telegramTargetType").selectOption("personal");
    await expect(page.locator("#telegramTargetActionHint")).toContainText("点上方按钮开始监听");
    await expect(page.locator("#telegramPersonalBotStart")).toBeVisible();
    await expect(page.locator("#openTelegramBot")).toHaveText("打开机器人并开始监听");
    await expect(page.locator("#telegramDirectTargetHelp")).toBeHidden();
    await expect(page.locator("#telegramPersonalTargetHelp")).toHaveText(
      "个人聊天：点上方按钮后每 3 秒读取一次，最长监听 5 分钟；在 Telegram 中点 Start，收到后自动填入 Chat ID。"
    );
    await expect(page.locator("#telegramTargetChatId")).toHaveAttribute("placeholder", "点击上方按钮后等待 /start 自动填入");
    await worker.evaluate(async () => chrome.storage.local.set({ telegramPendingPersonalChatId: "987654" }));
    await expect(page.locator("#telegramTargetChatId")).toHaveValue("987654");
    await worker.evaluate(async () => chrome.storage.local.remove("telegramPendingPersonalChatId"));
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
    await page.locator("#telegramTargetName").fill("test personal");
    await page.locator("#telegramTargetChatId").fill("123");
    await page.locator("#addTelegramTarget").click();
    await page.locator("#telegramBotToken").fill("test-token");
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
      return [state.telegramTargets?.[0]?.type, state.telegramTargets?.[0]?.chatId, state.telegramBotToken,
        state.telegramKeywordRules?.[0]?.mode, state.telegramBoardSlugs?.[0], state.telegramKeywordRules?.[0]?.excludeTerms];
    })).toEqual(["personal", "123", "test-token", "all", "daily", ["已出", "求购"]]);
    await expect(page.getByRole("status")).toContainText("保存成功");
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
