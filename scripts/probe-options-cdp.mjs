import { chromium } from "@playwright/test";
import { findTestChromeExtension, openTestChromeBackgroundTab } from "./test-chrome-extension.mjs";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9223", { timeout: 15000 });
let temporaryPage;
let worker;
let passed = false;
let originalConfig;
try {
  const context = browser.contexts()[0];
  const target = await findTestChromeExtension(browser, context);
  const extensionOrigin = `chrome-extension://${target.extension.id}`;
  await target.close();
  const optionsUrl = `${extensionOrigin}/options/options.html`;
  const existingPage = context.pages().find((item) => item.url() === optionsUrl);
  const page = existingPage || (temporaryPage = await openTestChromeBackgroundTab(browser, context, optionsUrl));
  page.setDefaultTimeout(6000);
  const findWorker = () => context.serviceWorkers().find((item) => item.url().startsWith(`${extensionOrigin}/`));
  worker = findWorker();
  if (!worker) {
    await page.evaluate(() => new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "nsh:worker-wake" }, () => resolve(true));
    }));
    worker = findWorker();
  }
  if (!worker) throw new Error("Extension background worker did not wake");
  await page.locator('[data-panel-target="telegram-panel"]').click();
  await page.locator("#telegramConfigGroup").waitFor();
  await page.waitForFunction(() => document.querySelector("#telegramConfigGroup")
    && typeof syncTelegramSetupVisibility === "function");
  const groupParent = await page.locator("#telegramConfigGroup").evaluate((node) => node.parentElement.id);
  if (groupParent !== "telegram-panel") throw new Error("Telegram controls are not inside their top-level panel");
  try {
    await page.locator("#telegramTargetDependentSettings").waitFor({ state: "visible", timeout: 5000 });
  } catch (error) {
    if (error.name !== "TimeoutError") throw error;
    throw new Error("The Test Chrome Telegram options probe requires a validated bot and a configured target");
  }
  originalConfig = await worker.evaluate(() => chrome.storage.local.get({
    telegramKeywordRules: [], telegramBoardSlugs: []
  }));

  const boards = page.locator("[data-telegram-board]");
  const boardCount = await boards.count();
  const checkedBefore = await boards.evaluateAll((nodes) => nodes.filter((node) => node.checked).length);
  if (originalConfig.telegramBoardSlugs.length === 0 && checkedBefore !== boardCount) {
    throw new Error("All boards are not selected by default");
  }
  const firstBoard = boards.first();
  const firstBoardLabel = firstBoard.locator("..");
  const initialChecked = await firstBoard.isChecked();
  await firstBoardLabel.click();
  const deselectWorked = await firstBoard.isChecked() === !initialChecked;
  await firstBoardLabel.click();

  const input = page.locator("#telegramKeywordInput");
  const token = `probe-${Date.now()}`;
  await input.fill(token);
  await page.locator("#addTelegramKeyword").click();
  const rule = page.locator(".telegram-keyword-rule").filter({ hasText: token });
  await rule.waitFor();
  await rule.locator(".telegram-keyword-toggle").click();
  await rule.waitFor({ state: "visible" });
  const disabled = await rule.evaluate((node) => node.classList.contains("is-disabled"));
  await rule.locator("[data-remove-telegram-rule]").click();
  await rule.waitFor({ state: "detached" });
  const persistedRules = await worker.evaluate(async () => chrome.storage.local.get("telegramKeywordRules"));
  passed = deselectWorked && disabled && !persistedRules.telegramKeywordRules?.some((item) => item.terms?.includes(token));
  console.log(JSON.stringify({ label: "telegram-options", panel: groupParent, boardCount, checkedBefore,
    storedBoardCount: originalConfig.telegramBoardSlugs?.length ?? null,
    deselectWorked, keywordToggleWorked: disabled, deleteWorked: passed }));
  if (!passed) throw new Error("Telegram option checks failed");
} finally {
  try {
    if (worker && originalConfig) await worker.evaluate((config) => chrome.storage.local.set(config), originalConfig);
  } finally {
    try {
      await temporaryPage?.close();
    } finally {
      await browser.close();
    }
  }
}
