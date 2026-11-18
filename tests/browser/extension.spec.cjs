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
    await context.route("https://api.telegram.org/**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, result: { id: 1, is_bot: true, first_name: "Test", username: "test_bot" } })
    }));
    const worker = context.serviceWorkers()[0]
      || await context.waitForEvent("serviceworker");
    const extensionId = new URL(worker.url()).host;
    const hasPreloadedConfig = await worker.evaluate(async () => {
      const response = await fetch(chrome.runtime.getURL("nsh-preloaded-config.json"));
      return response.ok;
    });
    if (hasPreloadedConfig) {
      await expect.poll(() => worker.evaluate(async () => {
        const state = await chrome.storage.local.get("nshPreloadedConfigImported");
        return state.nshPreloadedConfigImported === true;
      })).toBe(true);
    }
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForFunction(() => {
      return document.querySelector("#followKeywordGroups")?.children.length > 0;
    });
    await page.waitForFunction(() => Boolean(lastStoredOptionsSignature));
    await expect(page.locator("#profileLabelSize")).toHaveValue("standard");
    await expect(page.locator("#autoAttendanceEnabled")).not.toBeChecked();
    await expect(page.locator("#profileHoverSignatureEnabled")).toBeChecked();
    await expect(page.locator("#profileHoverTrendEnabled")).not.toBeChecked();
    const expectedReplyShortcut = await page.evaluate(async () => {
      const options = await readStoredOptions();
      return formatShortcutForDisplay(options.replySubmitShortcut);
    });
    await expect(page.locator("#replySubmitShortcut")).toHaveValue(expectedReplyShortcut);
    await page.locator("label.quick-page-option").filter({ hasText: "悬停时显示用户趋势图" }).click();
    await page.locator("#profileLabelSize").selectOption("small");
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get(["profileLabelSize", "profileHoverTrendEnabled"]);
      return [state.profileLabelSize, state.profileHoverTrendEnabled];
    })).toEqual(["small", true]);
    await page.waitForFunction(() => {
      return !optionsDirty && !optionsAutoSaveTimer && !optionsSyncTimer && !optionsSyncInProgress && !optionsSyncPending;
    });
    await expect(page.locator("#confirmDialog")).toBeHidden();
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
    const keywordGroup = page.locator("#followKeywordGroups .follow-rule-row").last();
    await expect(page.locator("#followKeywordGroups")).toHaveClass(/follow-rule-card-grid/);
    await expect(keywordGroup.locator(".follow-rule-row-count")).toHaveText("0 条规则");
    await expect(keywordGroup.getByRole("button", { name: "样式" })).toBeVisible();
    await expect(keywordGroup.getByRole("button", { name: "删除" })).toBeVisible();
    await expect(keywordGroup).toHaveCSS("border-top-color", "rgb(255, 255, 255)");
    await expect(keywordGroup.locator(".follow-rule-inline-editor")).toBeVisible();
    await expect(keywordGroup).toHaveCSS("grid-column-end", "-1");
    await keywordGroup.locator(".follow-rule-card-title").click();
    await expect(keywordGroup.locator(".follow-rule-inline-editor")).toBeHidden();
    await keywordGroup.locator(".follow-rule-card-title").click();
    await expect(keywordGroup.locator(".follow-rule-inline-editor")).toBeVisible();
    await keywordGroup.locator(".follow-rule-name-input").fill("浏览器测试匹配组");
    await expect(keywordGroup.getByRole("button", { name: "编辑" })).toHaveCount(0);

    const editor = keywordGroup.locator(".follow-rule-inline-editor");
    const matchedTerms = editor.locator('[data-follow-rule-item-list="items"]');
    const excludedTerms = editor.locator('[data-follow-rule-item-list="excludeItems"]');
    const groupSwitch = keywordGroup.locator(".follow-rule-card-switch");
    await expect(groupSwitch.locator("input")).toBeChecked();
    await matchedTerms.fill("(台湾/TW), 家宽");
    await excludedTerms.fill("收, 出");
    await groupSwitch.click();
    await expect(groupSwitch.locator("input")).not.toBeChecked();
    await groupSwitch.click();
    await expect(groupSwitch.locator("input")).toBeChecked();
    await expect(matchedTerms).toHaveValue("(台湾/TW), 家宽");
    await editor.locator(".follow-rule-keyword-entry").getByRole("button", { name: "添加" }).click();
    await expect(editor.locator(".telegram-keyword-rule")).toHaveCount(1);
    await expect(editor.locator(".telegram-keyword-required-label")).toHaveCount(0);
    await expect(editor.locator(".telegram-keyword-rule").first()).toContainText("台湾");
    await expect(editor.locator(".telegram-keyword-rule").first()).toContainText("或");
    await expect(editor.locator(".telegram-keyword-rule").first()).toContainText("且");
    await expect(editor.locator(".telegram-keyword-rule").first()).toContainText("收或出");
    await expect.poll(() => editor.locator(".telegram-keyword-rule-list").evaluate((node) => getComputedStyle(node).overflowY))
      .toBe("visible");

    await matchedTerms.fill("NoBrand, 无限");
    await excludedTerms.fill("");
    await editor.locator(".follow-rule-keyword-entry").getByRole("button", { name: "添加" }).click();
    await expect(editor.locator(".telegram-keyword-rule")).toHaveCount(2);
    await matchedTerms.fill("临时");
    await editor.locator(".follow-rule-keyword-entry").getByRole("button", { name: "添加" }).click();
    await page.getByRole("button", { name: "删除规则 临时" }).click();
    await expect(editor.locator(".telegram-keyword-rule")).toHaveCount(2);
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("followRules");
      const group = state.followRules?.keywordGroups?.find((entry) => entry.name === "浏览器测试匹配组");
      return group?.rules.map((rule) => [rule.mode, rule.termGroups, rule.excludeTerms]);
    })).toEqual([
      ["all", [["台湾", "TW"], ["家宽"]], ["收", "出"]],
      ["all", [["NoBrand"], ["无限"]], []]
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
    })).toBe(7);
    await expect.poll(() => page.locator("#telegramBoardSlugs").evaluate((node) => {
      const rows = new Map();
      for (const label of node.querySelectorAll("label")) {
        const top = Math.round(label.getBoundingClientRect().top);
        rows.set(top, (rows.get(top) || 0) + 1);
      }
      return [...rows.values()];
    })).toEqual([7, 6]);
    const boardCheckboxWidth = await page.locator("[data-telegram-board]").first().evaluate((node) => {
      return node.getBoundingClientRect().width;
    });
    expect(boardCheckboxWidth).toBeLessThan(24);
    await page.locator("#telegramKeywordInput").fill("v.ps, gen2\n家人");
    await page.locator("#telegramKeywordExcludeInput").fill("已出, 求购");
    await page.locator("#addTelegramKeyword").click();
    await expect(page.locator("#telegramKeywordRuleList .telegram-keyword-required-label")).toHaveCount(0);
    await page.locator("[data-telegram-board]").evaluateAll((inputs) => {
      inputs.forEach((input) => { input.checked = false; });
    });
    await page.locator('#telegramBoardSlugs label:has(input[value="daily"])').click();
    const boardStyles = await page.evaluate(() => {
      const selected = document.querySelector('[data-telegram-board][value="daily"]').closest("label");
      const unselected = document.querySelector('[data-telegram-board][value="tech"]').closest("label");
      return {
        selectedBorder: getComputedStyle(selected).borderColor,
        unselectedBorder: getComputedStyle(unselected).borderColor,
        checkboxOpacity: getComputedStyle(selected.querySelector("input")).opacity
      };
    });
    expect(boardStyles.selectedBorder).not.toBe(boardStyles.unselectedBorder);
    expect(boardStyles.checkboxOpacity).toBe("0");
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
    await restoredKeywordGroup.locator(".follow-rule-row-expand").click();
    await expect(restoredKeywordGroup.locator(".follow-rule-inline-editor .telegram-keyword-rule")).toHaveCount(2);
    await expect(restoredKeywordGroup.locator(".follow-rule-inline-editor .telegram-keyword-rule").first()).toContainText("台湾");
    await expect(restoredKeywordGroup.locator(".follow-rule-inline-editor .telegram-keyword-rule").first()).toContainText("TW");
    const restoredRule = restoredKeywordGroup.locator(".follow-rule-inline-editor .telegram-keyword-rule").first();
    const ruleGeometry = await restoredRule.evaluate((card) => {
      const toggle = card.querySelector(".telegram-keyword-toggle").getBoundingClientRect();
      const remove = card.querySelector(".telegram-keyword-remove").getBoundingClientRect();
      const bounds = card.getBoundingClientRect();
      return {
        toggleWidth: toggle.width,
        cardWidth: bounds.width,
        blankClickX: toggle.right + 4 - bounds.left,
        blankClickY: toggle.top + toggle.height / 2 - bounds.top,
        hasBlankSpace: toggle.right + 8 < remove.left
      };
    });
    expect(ruleGeometry.toggleWidth).toBeLessThan(ruleGeometry.cardWidth - 40);
    expect(ruleGeometry.hasBlankSpace).toBe(true);
    await restoredRule.click({ position: { x: ruleGeometry.blankClickX, y: ruleGeometry.blankClickY } });
    await expect(restoredRule).toHaveClass(/is-editing/);
    await restoredRule.locator(".telegram-keyword-tags").click();
    await expect(restoredRule).not.toHaveClass(/is-editing/);
    await expect(restoredKeywordGroup.locator('.follow-rule-inline-editor [data-follow-rule-item-list="items"]')).toHaveValue("");
    const nextRule = restoredKeywordGroup.locator(".follow-rule-inline-editor .telegram-keyword-rule").nth(1);
    await nextRule.dragTo(restoredRule, { targetPosition: { x: 40, y: 2 } });
    await expect(restoredKeywordGroup.locator(".follow-rule-inline-editor .telegram-keyword-rule").first()).toContainText("NoBrand");
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("followRules");
      const group = state.followRules?.keywordGroups?.find((entry) => entry.name === "浏览器测试匹配组");
      return group?.rules.map((rule) => rule.termGroups);
    })).toEqual([[ ["NoBrand"], ["无限"] ], [ ["台湾", "TW"], ["家宽"] ]]);
    await page.locator('[data-panel-target="telegram-panel"]').click();
    await expect(page.locator("#telegramTargetList")).toContainText("test personal");
    await expect(page.locator("#telegramKeywordRuleList")).toContainText("已出");
    await page.locator('[data-panel-target="telegram-panel"]').click();
    const targetToggle = page.locator("#telegramTargetList [data-telegram-target-enabled]").first();
    await expect(targetToggle).toBeChecked();
    await page.locator("#telegramTargetList .telegram-target-toggle").first().click();
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("telegramTargets");
      return state.telegramTargets?.[0]?.enabled;
    })).toBe(false);
    await expect(page.locator("#telegramTargetList")).toContainText("已关闭");
    await page.reload();
    await page.locator('[data-panel-target="telegram-panel"]').click();
    await expect(page.locator("#telegramTargetList [data-telegram-target-enabled]").first()).not.toBeChecked();
    await page.locator("#telegramTargetList .telegram-target-toggle").first().click();
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("telegramTargets");
      return state.telegramTargets?.[0]?.enabled;
    })).toBe(true);
    await page.locator("#telegramKeywordInput").fill("NoBrand, 无限");
    await page.locator("#telegramKeywordExcludeInput").fill("");
    await page.locator("#addTelegramKeyword").click();
    const telegramRules = page.locator("#telegramKeywordRuleList .telegram-keyword-rule");
    await expect(telegramRules).toHaveCount(2);
    const firstTelegramRule = telegramRules.first();
    await firstTelegramRule.locator(".telegram-keyword-tags").click();
    await expect(firstTelegramRule).toHaveClass(/is-editing/);
    await firstTelegramRule.locator(".telegram-keyword-tags").click();
    await expect(firstTelegramRule).not.toHaveClass(/is-editing/);
    await expect(page.locator("#telegramKeywordInput")).toHaveValue("");
    await telegramRules.nth(1).dragTo(firstTelegramRule, { targetPosition: { x: 40, y: 2 } });
    await expect(telegramRules.first().locator(".telegram-keyword-tags")).toContainText("NoBrand");
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("telegramKeywordRules");
      return state.telegramKeywordRules?.map((rule) => rule.termGroups);
    })).toEqual([[ ["NoBrand"], ["无限"] ], [["v.ps"], ["gen2"], ["家人"]]]);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.locator("#telegramKeywordRuleList").evaluate((node) => {
      return getComputedStyle(node).gridTemplateColumns.split(" ").length;
    })).toBe(1);
    await expect.poll(() => page.locator("#telegramBoardSlugs").evaluate((node) => {
      return getComputedStyle(node).gridTemplateColumns.split(" ").length;
    })).toBe(3);
    expect(errors).toEqual([]);
  } finally {
    if (context) await context.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
});
