import { chromium } from "@playwright/test";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9223", { timeout: 5000 });
try {
  const context = browser.contexts()[0];
  const worker = context.serviceWorkers().find((item) => item.url().startsWith("chrome-extension://"));
  if (!worker) throw new Error("Extension service worker is not active");
  const metadata = await worker.evaluate(async () => {
    const values = await chrome.storage.local.get(null);
    return Object.entries(values)
      .filter(([key]) => !/^(nsh[A-Z]|userCache|profileCache|telegramMonitorLast|telegramRssHistory)/.test(key))
      .map(([key, value]) => ({
        key,
        type: Array.isArray(value) ? "array" : typeof value,
        count: Array.isArray(value) ? value.length : undefined,
        objectKeys: value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : undefined
      }));
  });
  console.log(JSON.stringify(metadata));
} finally {
  await browser.close();
}
