import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = await fs.realpath(fileURLToPath(new URL("..", import.meta.url)));

export async function openTestChromeBackgroundTab(browser, context, url) {
  const session = await browser.newBrowserCDPSession();
  try {
    const [page] = await Promise.all([
      context.waitForEvent("page", {
        predicate: (candidate) => candidate.url() === url,
        timeout: 15000
      }),
      session.send("Target.createTarget", { url, background: true })
    ]);
    return page;
  } finally {
    await session.detach();
  }
}

export async function findTestChromeExtension(browser, context) {
  const url = "chrome://extensions/";
  const currentPage = context.pages().find((page) => page.url() === url);
  const managementPage = currentPage || await openTestChromeBackgroundTab(browser, context, url);
  try {
    const extensions = await managementPage.evaluate(() => new Promise((resolve, reject) => {
      chrome.developerPrivate.getExtensionsInfo({ includeDisabled: false }, (items) => {
        const message = chrome.runtime.lastError?.message;
        if (message) reject(new Error(message));
        else resolve(items);
      });
    }));
    const extension = extensions.find((item) => item.path && path.resolve(item.path) === projectRoot);
    if (!extension) throw new Error("Test Chrome has no enabled NodeSeeker loaded from this repository");
    return { extension, managementPage, close: () => currentPage ? undefined : managementPage.close() };
  } catch (error) {
    if (!currentPage) await managementPage.close();
    throw error;
  }
}
