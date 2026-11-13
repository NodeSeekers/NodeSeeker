import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, ".debug");
await fs.mkdir(output, { recursive: true });
const context = await chromium.launchPersistentContext(path.join(output, "chromium-profile"), {
  channel: "chromium",
  headless: false,
  viewport: null,
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`]
});
const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
const extensionId = new URL(worker.url()).host;
const options = await context.newPage();
await options.goto(`chrome-extension://${extensionId}/options/options.html`);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => {
  errors.push(error.message);
  console.log("PAGE ERROR:", error.message);
});
const session = await context.newCDPSession(page);
const worlds = new Set();
session.on("Runtime.executionContextCreated", ({ context: executionContext }) => {
  if (executionContext.origin === `chrome-extension://${extensionId}`
      || executionContext.name.includes(extensionId)) worlds.add(executionContext.name);
});
await session.send("Runtime.enable");
try {
  const response = await page.goto("https://www.nodeseek.com/", {
    waitUntil: "domcontentloaded", timeout: 45000
  });
  console.log("INITIAL HTTP STATUS:", response?.status());
} catch (error) {
  console.log("NAVIGATION:", error.message);
}

async function inspect() {
  const status = {
    url: new URL(page.url()).origin + new URL(page.url()).pathname,
    title: await page.title(),
    extensionId,
    contentScriptWorlds: [...worlds],
    extensionElements: await page.locator('[class*="nsh-"], [id^="nsh-"]').count(),
    pageErrors: errors,
    capturedAt: new Date().toISOString()
  };
  await page.screenshot({ path: path.join(output, "nodeseek.png") });
  await fs.writeFile(path.join(output, "status.json"), JSON.stringify(status, null, 2));
  console.log(JSON.stringify(status));
}

await inspect();
console.log("Chromium ready. Complete CF verification/login in its window if needed.");
console.log("Commands: check (status + screenshot), quit (close browser).");
const input = readline.createInterface({ input: process.stdin, output: process.stdout });
input.on("line", async (line) => {
  try {
    if (line.trim() === "check") await inspect();
    if (line.trim() === "quit") await context.close();
  } catch (error) { console.log(error.message); }
});
context.on("close", () => { input.close(); process.exit(0); });
process.on("SIGINT", async () => { await context.close(); });
