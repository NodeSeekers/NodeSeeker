import { chromium } from "@playwright/test";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9223", { timeout: 15000 });
const context = browser.contexts()[0];
let worker = context.serviceWorkers().find((item) => item.url().startsWith("chrome-extension://"));
const extensionId = worker ? new URL(worker.url()).host : "fljjlmmflicoocnceopdeeibflcohenp";
const page = context.pages().find((item) => item.url().startsWith(`chrome-extension://${extensionId}/options/`))
  || context.pages().find((item) => item.url().startsWith("https://www.nodeseek.com/"))
  || context.pages()[0];
const originalUrl = page.url();
let passed = false;
let originalRules = null;
try {
  if (!page.url().startsWith(`chrome-extension://${extensionId}/options/`)) {
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
  }
  if (!worker) {
    await page.evaluate(() => new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "nsh:worker-wake" }, () => resolve(true));
    }));
    worker = context.serviceWorkers().find((item) => item.url().startsWith("chrome-extension://"));
  }
  if (!worker) throw new Error("Extension background worker did not wake");
  const original = await worker.evaluate(async () => chrome.storage.local.get({ telegramKeywordRules: [], telegramBoardSlugs: [] }));
  originalRules = original.telegramKeywordRules;
  await page.locator('[data-panel-target="telegram-panel"]').click();
  await page.locator("#telegramConfigGroup").waitFor();
  await page.waitForFunction(() => document.querySelector("#telegramConfigGroup")
    && typeof syncTelegramSetupVisibility === "function");
  const groupParent = await page.locator("#telegramConfigGroup").evaluate((node) => node.parentElement.id);
  if (groupParent !== "telegram-panel") throw new Error("Telegram controls are not inside their top-level panel");

  const boards = page.locator("[data-telegram-board]");
  const boardCount = await boards.count();
  const checkedBefore = await boards.evaluateAll((nodes) => nodes.filter((node) => node.checked).length);
  if (original.telegramBoardSlugs.length === 0 && checkedBefore !== boardCount) {
    throw new Error("All boards are not selected by default");
  }
  const firstBoard = boards.first();
  const initialChecked = await firstBoard.isChecked();
  await firstBoard.setChecked(!initialChecked);
  const deselectWorked = await firstBoard.isChecked() === !initialChecked;
  await firstBoard.setChecked(initialChecked);

  const input = page.locator("#telegramKeywordInput");
  const token = `probe-${Date.now()}`;
  await input.fill(token);
  await page.locator("#addTelegramKeyword").click();
  const rule = page.locator(".telegram-keyword-rule").filter({ hasText: token });
  await rule.waitFor();
  const toggle = rule.locator("[data-telegram-rule-toggle]");
  await toggle.uncheck();
  await rule.waitFor({ state: "visible" });
  const disabled = await rule.evaluate((node) => node.classList.contains("is-disabled"));
  await rule.locator("[data-remove-telegram-rule]").click();
  await rule.waitFor({ state: "detached" });
  const persistedRules = await worker.evaluate(async () => chrome.storage.local.get("telegramKeywordRules"));
  passed = deselectWorked && disabled && !persistedRules.telegramKeywordRules?.some((item) => item.terms?.includes(token));
  console.log(JSON.stringify({ label: "telegram-options", panel: groupParent, boardCount, checkedBefore,
    storedBoardCount: original.telegramBoardSlugs?.length ?? null,
    deselectWorked, keywordToggleWorked: disabled, deleteWorked: passed }));
  if (!passed) throw new Error("Telegram option checks failed");
} finally {
  if (worker && originalRules) {
    await worker.evaluate(async (rules) => chrome.storage.local.set({ telegramKeywordRules: rules }), originalRules);
  }
  if (originalUrl && originalUrl.startsWith("https://www.nodeseek.com/")) {
    await page.goto(originalUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  }
  await browser.close();
}
