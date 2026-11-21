import fs from "node:fs/promises";
import { chromium } from "@playwright/test";
import { findTestChromeExtension } from "./test-chrome-extension.mjs";

const manifest = JSON.parse(await fs.readFile(new URL("../manifest.json", import.meta.url), "utf8"));
const browser = await chromium.connectOverCDP("http://127.0.0.1:9223", { timeout: 15000 });
let target;
try {
  const context = browser.contexts()[0];
  target = await findTestChromeExtension(browser, context);
  const { extension, managementPage } = target;
  const version = await managementPage.evaluate(async (id) => {
    const api = chrome.developerPrivate;
    const profile = await api.getProfileConfiguration();
    if (!profile.inDeveloperMode) throw new Error("Enable Developer mode in Test Chrome before reloading NodeSeeker");

    let timer;
    try {
      const failure = await Promise.race([
        api.reload(id, { failQuietly: true, populateErrorForUnpacked: true }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("Chrome did not confirm the extension reload")), 15000);
        })
      ]);
      if (failure?.error) throw new Error(failure.error);
      const item = await api.getExtensionInfo(id);
      if (item.state !== "ENABLED") throw new Error("NodeSeeker is disabled after reload");
      return item.version;
    } finally {
      clearTimeout(timer);
    }
  }, extension.id);
  if (version !== manifest.version) {
    throw new Error(`NodeSeeker reloaded version ${version}; expected ${manifest.version}`);
  }

  const pages = context.pages().filter((page) => page.url().startsWith("https://www.nodeseek.com/"));
  const results = await Promise.allSettled(pages.map((page) =>
    page.reload({ waitUntil: "domcontentloaded", timeout: 30000 })));
  const failures = results.filter((result) => result.status === "rejected").length;
  if (failures) throw new Error(`NodeSeeker ${version} reloaded, but ${failures} NodeSeek tab(s) failed to refresh`);
  console.log(JSON.stringify({ reloaded: true, id: extension.id, version, refreshedNodeSeekTabs: pages.length }));
} finally {
  try {
    await target?.close();
  } finally {
    await browser.close();
  }
}
