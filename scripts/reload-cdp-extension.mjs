import { chromium } from "@playwright/test";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9223", { timeout: 15000 });
try {
  const context = browser.contexts()[0];
  let worker = context.serviceWorkers().find((item) => item.url().startsWith("chrome-extension://"));
  if (!worker) {
    const extensionPage = context.pages().find((page) => page.url().startsWith("chrome-extension://"));
    if (extensionPage) {
      await extensionPage.evaluate(() => new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "nsh:worker-wake" }, () => resolve(true));
      }));
      worker = context.serviceWorkers().find((item) => item.url().startsWith("chrome-extension://"));
    }
  }
  if (!worker) {
    worker = await context.waitForEvent("serviceworker", {
      timeout: 15000,
      predicate: (item) => item.url().startsWith("chrome-extension://")
    });
  }
  if (!worker) throw new Error("No extension service worker found in the test Chromium");

  const extension = await worker.evaluate(() => ({
    id: chrome.runtime.id,
    version: chrome.runtime.getManifest().version
  }));
  await worker.evaluate(() => {
    setTimeout(() => chrome.runtime.reload(), 250);
    return true;
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  console.log(JSON.stringify({ reloaded: true, ...extension }));
} finally {
  await browser.close();
}
