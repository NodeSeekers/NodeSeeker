const { test, expect, chromium } = require("@playwright/test");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");

test.use({ channel: "chromium" });

test("signature effects fit the text and preserve its links", async ({ page }) => {
  const url = "https://www.nodeseek.com/post-1-1";
  await page.route(url, (route) => route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: `<!doctype html><style>
      .signature { width: 700px; padding-top: 5px; overflow: hidden; }
      .signature p { margin: 5px 0; }
    </style><article class="content-item">
      <div class="signature"><p><a href="/post-2-1">我的探针</a> ｜ VPS</p></div>
    </article>`
  }));
  await page.goto(url);
  const root = path.resolve(__dirname, "../..");
  for (const file of ["src/avatar-effects.css", "src/content.css"]) {
    await page.addStyleTag({ path: path.join(root, file) });
  }
  for (const file of ["src/shortcuts.js", "src/content/config.js", "src/content/follow-rules.js"]) {
    await page.addScriptTag({ path: path.join(root, file) });
  }
  await page.evaluate(() => {
    featureOptions.followRules = {
      signatureGroups: [{ items: ["探针"], styles: { signatureEffect: "particles" } }]
    };
    scanFollowRules();
  });
  const signature = page.locator(".signature");
  await expect(signature.locator(".nsh-follow-signature-keyword-hit")).toHaveText("探针");
  const bounds = await signature.locator(".nsh-follow-signature-effect").evaluate((effect) => {
    const range = document.createRange();
    range.selectNodeContents(effect.closest(".signature").querySelector("p"));
    return {
      effectWidth: effect.getBoundingClientRect().width,
      textWidth: range.getBoundingClientRect().width
    };
  });
  expect(bounds.effectWidth).toBeGreaterThanOrEqual(bounds.textWidth);
  expect(bounds.effectWidth - bounds.textWidth).toBeLessThanOrEqual(8);

  await page.evaluate(() => {
    featureOptions.followRules = {};
    scanFollowRules();
  });
  await expect(signature.locator(".nsh-follow-signature-effect")).toHaveCount(0);
  await expect(signature.locator(":scope > p > a")).toHaveAttribute("href", "/post-2-1");
  await expect(signature).toHaveText("我的探针 ｜ VPS");
});

test("keyword editors explain invalid syntax and keep paused rules in place", async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "nodeseek-keyword-rules-"));
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
    const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
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
    const activeRule = (id, term) => ({
      id, enabled: true, mode: "all", terms: [term], termGroups: [[term]], excludeTerms: []
    });
    const pausedRule = (id, term) => ({
      ...activeRule(id, term), enabled: false
    });
    const followRules = {
      keywordGroups: [{
        id: "test-content-group", name: "回归测试", enabled: true,
        rules: [activeRule("content-alpha", "alpha"), pausedRule("content-bravo", "bravo"), activeRule("content-charlie", "charlie")],
        styles: {}
      }],
      signatureGroups: [{
        id: "test-signature-group", name: "签名探针", enabled: true,
        rules: [activeRule("signature-probe", "探针")],
        styles: { signatureEffect: "rainbow" }
      }],
      userGroups: []
    };
    const telegramKeywordRules = [
      activeRule("telegram-alpha", "tg-alpha"),
      pausedRule("telegram-bravo", "tg-bravo"),
      activeRule("telegram-charlie", "tg-charlie")
    ];
    await worker.evaluate(async ({ followRules, telegramKeywordRules }) => {
      await chrome.storage.local.set({
        followRules,
        telegramKeywordRules,
        telegramBotToken: "123456:abcdefghijklmnopqrstuvwxyz123456789",
        telegramTargets: [{
          id: "test-target", name: "回归目标", type: "personal", chatId: "123456789", topicId: "", enabled: true
        }]
      });
    }, { followRules, telegramKeywordRules });

    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForFunction(() => document.querySelector("#followKeywordGroups")?.children.length > 0);
    await page.locator('[data-panel-target="block-filter-panel"]').click();
    const signatureList = page.locator("#followSignatureGroups");
    await expect(signatureList).toHaveClass(/follow-rule-card-grid/);
    const signatureGroup = signatureList.locator(".follow-rule-row").filter({ hasText: "签名探针" });
    await expect(signatureGroup.locator(".follow-rule-card-switch input")).toBeChecked();
    await signatureGroup.locator(".follow-rule-row-expand").click();
    const signatureRules = signatureGroup.locator(".follow-rule-inline-editor .telegram-keyword-rule");
    await expect(signatureRules).toHaveCount(1);
    await signatureGroup.locator('[data-follow-rule-item-list="items"]').fill("探针,VPS");
    await signatureGroup.locator(".follow-rule-keyword-entry").getByRole("button", { name: "添加" }).click();
    await expect(signatureRules).toHaveCount(2);
    await signatureGroup.getByRole("button", { name: "样式" }).click();
    const signatureStyle = page.locator("#followRuleStyleDialogBody");
    await expect(signatureStyle.locator(".follow-rule-signature-effect-control")).toHaveCount(1);
    await expect(signatureStyle.locator(".follow-rule-style-option")).toHaveCount(0);
    await expect(signatureStyle).not.toContainText("标题颜色");
    await expect(signatureStyle).not.toContainText("边框颜色");
    await expect(signatureStyle.locator(".follow-rule-signature-preview")).toContainText("探针");
    await signatureStyle.locator(".follow-rule-signature-effect-control select").selectOption("cosmos");
    await page.locator("#confirmFollowRuleStyleDialog").click();
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("followRules");
      return {
        terms: state.followRules.signatureGroups[0].rules.map((rule) => rule.terms),
        signatureEffect: state.followRules.signatureGroups[0].styles.signatureEffect
      };
    })).toEqual({ terms: [["探针"], ["探针", "VPS"]], signatureEffect: "cosmos" });

    const group = page.locator("#followKeywordGroups .follow-rule-row").filter({ hasText: "回归测试" });
    await group.locator(".follow-rule-row-expand").click();
    const contentRules = group.locator(".follow-rule-inline-editor .telegram-keyword-rule");
    await expect(contentRules).toHaveCount(3);
    await expect.poll(() => contentRules.evaluateAll((cards) => cards.map((card) => card.dataset.followRuleKeywordRuleId)))
      .toEqual(["content-alpha", "content-bravo", "content-charlie"]);
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("followRules");
      return state.followRules.keywordGroups[0].rules.map((rule) => rule.id);
    })).toEqual(["content-alpha", "content-bravo", "content-charlie"]);

    const contentInput = group.locator('[data-follow-rule-item-list="items"]');
    await contentInput.fill("(NoBrand,NB,NNB), 无限");
    await group.locator(".follow-rule-keyword-entry").getByRole("button", { name: "添加" }).click();
    await expect(page.getByRole("alert")).toContainText("括号内只能使用 / 分隔符");
    await expect(contentRules).toHaveCount(3);
    await page.locator('[data-follow-rule-keyword-rule-id="content-alpha"] .telegram-keyword-toggle').click();
    await expect.poll(() => contentRules.evaluateAll((cards) => cards.map((card) => card.dataset.followRuleKeywordRuleId)))
      .toEqual(["content-alpha", "content-bravo", "content-charlie"]);
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("followRules");
      return state.followRules.keywordGroups[0].rules.map((rule) => [rule.id, rule.enabled]);
    })).toEqual([["content-alpha", false], ["content-bravo", false], ["content-charlie", true]]);
    const contentDropTarget = page.locator('[data-follow-rule-keyword-rule-id="content-charlie"]');
    const contentDropTargetBox = await contentDropTarget.boundingBox();
    await page.locator('[data-follow-rule-keyword-rule-id="content-alpha"]').dragTo(contentDropTarget, {
      targetPosition: { x: 40, y: contentDropTargetBox.height - 2 }
    });
    await expect.poll(() => contentRules.evaluateAll((cards) => cards.map((card) => card.dataset.followRuleKeywordRuleId)))
      .toEqual(["content-bravo", "content-charlie", "content-alpha"]);
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("followRules");
      return state.followRules.keywordGroups[0].rules.map((rule) => rule.id);
    })).toEqual(["content-bravo", "content-charlie", "content-alpha"]);

    await page.locator('[data-panel-target="telegram-panel"]').click();
    await expect(page.locator("#telegramProtectedSettings")).toBeVisible();
    const telegramRules = page.locator("#telegramKeywordRuleList .telegram-keyword-rule");
    await expect.poll(() => telegramRules.evaluateAll((cards) => cards.map((card) => card.dataset.telegramRuleId)))
      .toEqual(["telegram-alpha", "telegram-bravo", "telegram-charlie"]);
    await page.locator("#telegramKeywordInput").fill("(NoBrand,NB,NNB), 无限");
    await page.locator("#addTelegramKeyword").click();
    await expect(page.getByRole("alert")).toContainText("括号内只能使用 / 分隔符");
    await expect(telegramRules).toHaveCount(3);
    await page.locator('[data-telegram-rule-id="telegram-alpha"] .telegram-keyword-toggle').click();
    await expect.poll(() => telegramRules.evaluateAll((cards) => cards.map((card) => card.dataset.telegramRuleId)))
      .toEqual(["telegram-alpha", "telegram-bravo", "telegram-charlie"]);
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("telegramKeywordRules");
      return state.telegramKeywordRules.map((rule) => [rule.id, rule.enabled]);
    })).toEqual([["telegram-alpha", false], ["telegram-bravo", false], ["telegram-charlie", true]]);
    const telegramDropTarget = page.locator('[data-telegram-rule-id="telegram-charlie"]');
    const telegramDropTargetBox = await telegramDropTarget.boundingBox();
    await page.locator('[data-telegram-rule-id="telegram-alpha"]').dragTo(telegramDropTarget, {
      targetPosition: { x: 40, y: telegramDropTargetBox.height - 2 }
    });
    await expect.poll(() => telegramRules.evaluateAll((cards) => cards.map((card) => card.dataset.telegramRuleId)))
      .toEqual(["telegram-bravo", "telegram-charlie", "telegram-alpha"]);
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("telegramKeywordRules");
      return state.telegramKeywordRules.map((rule) => rule.id);
    })).toEqual(["telegram-bravo", "telegram-charlie", "telegram-alpha"]);
    expect(errors).toEqual([]);
  } finally {
    if (context) await context.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
});
