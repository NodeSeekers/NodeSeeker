import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, ".debug", "cdp-probe");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.connectOverCDP("http://127.0.0.1:9223", { timeout: 15000 });
const context = browser.contexts()[0];
let extensionWorker = context.serviceWorkers().find((worker) => worker.url().startsWith("chrome-extension://"));
const page = context.pages().find((item) => item.url().startsWith("https://www.nodeseek.com/"));
const report = { startedAt: new Date().toISOString(), steps: [], errors: [], passed: false };

async function checkpoint(label, response) {
  await page.waitForFunction(() => document.readyState !== "loading", undefined, { timeout: 15000 });
  const headers = response ? await response.allHeaders() : {};
  const state = await page.evaluate(() => ({
    url: location.origin + location.pathname,
    title: document.title,
    webdriver: navigator.webdriver,
    viewport: { width: innerWidth, height: innerHeight },
    challenge: /just a moment|attention required|请稍候|正在验证/i.test(document.title)
      || !!document.querySelector('#challenge-running, #challenge-stage, form#challenge-form'),
    postLinks: document.querySelectorAll('a[href*="/post-"]').length
  }));
  const step = { label, ...state, httpStatus: response?.status() ?? null,
    cfMitigated: headers["cf-mitigated"] ?? null, at: new Date().toISOString() };
  report.steps.push(step);
  console.log(JSON.stringify(step));
  await page.screenshot({ path: path.join(output, `${report.steps.length}.png`) });
  if (state.challenge || step.cfMitigated === "challenge" || step.httpStatus === 403
      || step.httpStatus === 429) throw new Error(`Stopped at ${label}: challenge or HTTP block`);
}

try {
  if (!extensionWorker) {
    extensionWorker = await context.waitForEvent("serviceworker", {
      timeout: 15000,
      predicate: (worker) => worker.url().startsWith("chrome-extension://")
    });
  }
  if (!extensionWorker) throw new Error("No NodeSeek Helper service worker found in the test Chromium");
  if (!page) throw new Error("No NodeSeek tab found; open it in the CDP browser first");
  if (new URL(page.url()).pathname !== "/") {
    await page.goto("https://www.nodeseek.com/", { waitUntil: "domcontentloaded", timeout: 30000 });
  } else {
    // A service-worker reload does not reinject content scripts into existing tabs.
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  }
  report.extension = await extensionWorker.evaluate(async () => {
    const state = await chrome.storage.local.get([
      "quickReplyShortcut", "readingNavigationEnabled", "autoPageEnabled", "autoPageAppendEnabled", "apiKey",
      "telegramMessageNotificationsEnabled", "telegramPostNotificationsEnabled", "autoAttendanceEnabled",
      "autoAttendanceMode", "profileHoverSignatureEnabled", "imagePreviewEnabled", "linkPurifierEnabled"
    ]);
    return {
      id: chrome.runtime.id,
      version: chrome.runtime.getManifest().version,
      readingNavigationEnabled: Boolean(state.readingNavigationEnabled),
      quickReplyShortcut: state.quickReplyShortcut || "",
      autoPageEnabled: Boolean(state.autoPageEnabled),
      waterfallEnabled: Boolean(state.autoPageAppendEnabled),
      apiKeyConfigured: Boolean(state.apiKey),
      telegramMessageNotificationsEnabled: Boolean(state.telegramMessageNotificationsEnabled),
      telegramPostNotificationsEnabled: Boolean(state.telegramPostNotificationsEnabled),
      autoAttendanceEnabled: Boolean(state.autoAttendanceEnabled),
      autoAttendanceMode: state.autoAttendanceMode || "random",
      profileHoverSignatureEnabled: state.profileHoverSignatureEnabled !== false,
      imagePreviewEnabled: state.imagePreviewEnabled !== false,
      linkPurifierEnabled: state.linkPurifierEnabled !== false
    };
  });
  console.log(JSON.stringify({ label: "extension-state", ...report.extension }));
  report.rss = await extensionWorker.evaluate(async () => {
    const response = await fetch("https://rss.nodeseek.com/", {
      credentials: "omit",
      headers: { Accept: "application/rss+xml, application/xml, text/xml" }
    });
    const posts = parseNodeSeekRss(await response.text());
    return {
      httpStatus: response.status,
      contentType: response.headers.get("content-type"),
      parsedPosts: posts.length,
      validPostLinks: posts.filter((post) => /^https:\/\/www\.nodeseek\.com\/post-\d+-\d+\/?$/.test(post.link)).length
    };
  });
  console.log(JSON.stringify({ label: "rss-feed", ...report.rss }));
  if (report.rss.httpStatus !== 200 || report.rss.parsedPosts === 0
      || report.rss.validPostLinks !== report.rss.parsedPosts) {
    throw new Error("NodeSeek RSS feed did not return parseable post entries");
  }
  page.on("pageerror", (error) => report.errors.push(error.message));
  await checkpoint("attached");
  const imagePreview = await page.evaluate(() => {
    const container = document.createElement("div");
    container.className = "post-content";
    const image = document.createElement("img");
    image.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='100'%3E%3Crect width='160' height='100' fill='red'/%3E%3C/svg%3E";
    container.appendChild(image);
    document.body.appendChild(container);
    image.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    const overlay = document.querySelector(".nsh-image-preview");
    const opened = overlay?.classList.contains("is-open") === true;
    overlay?.querySelector("[aria-label='放大']")?.click();
    const zoomed = overlay?.querySelector(".nsh-image-preview-image")?.style.transform === "scale(1.25)";
    overlay?.querySelector("[aria-label='关闭']")?.click();
    const closed = !overlay?.classList.contains("is-open");
    container.remove();
    return { opened, zoomed, closed };
  });
  report.steps.push({ label: "image-preview", ...imagePreview, at: new Date().toISOString() });
  console.log(JSON.stringify({ label: "image-preview", ...imagePreview }));
  if (!imagePreview.opened || !imagePreview.zoomed || !imagePreview.closed) {
    throw new Error("Image lightbox interaction failed");
  }
  const markdown = await page.evaluate(() => {
    const rendered = createProfileMarkdownContent("## 测试签名\n**重点** @codex_user");
    return {
      heading: Boolean(rendered.querySelector("h2")),
      bold: Boolean(rendered.querySelector("strong")),
      mentionHref: rendered.querySelector(".nsh-profile-mention")?.getAttribute("href") || ""
    };
  });
  report.steps.push({ label: "signature-markdown", ...markdown, at: new Date().toISOString() });
  console.log(JSON.stringify({ label: "signature-markdown", ...markdown }));
  if (!markdown.heading || !markdown.bold || markdown.mentionHref !== "/space/codex_user") {
    throw new Error("Signature Markdown or mention links failed");
  }

  const adminEntryCount = await page.locator('[data-nsh-message-entry="admin"]').count();
  report.steps.push({ label: "management-entry-removed", adminEntryCount, at: new Date().toISOString() });
  console.log(JSON.stringify({ label: "management-entry-removed", adminEntryCount }));
  if (adminEntryCount !== 0) throw new Error("Management-record entry was unexpectedly injected");

  for (const key of ["at", "reply", "message"]) {
    const entry = page.locator(`[data-nsh-message-entry="${key}"] .nsh-message-entry-link`).first();
    await entry.waitFor({ timeout: 10000 });
    const apiSummary = [];
    const captureNotificationApi = async (response) => {
      const pathname = new URL(response.url()).pathname;
      if (!pathname.startsWith("/api/notification/")) return;
      try {
        const payload = await response.json();
        const entries = payload?.msgArray ?? payload?.data;
        apiSummary.push({ status: response.status(), pathname, success: payload?.success === true,
          itemCount: Array.isArray(entries) ? entries.length : null });
      } catch {
        apiSummary.push({ status: response.status(), pathname, json: false });
      }
    };
    page.on("response", captureNotificationApi);
    await entry.hover();
    await page.locator(".nsh-notification-preview.is-open").waitFor({ timeout: 10000 });
    await page.waitForFunction(() => {
      const popup = document.querySelector(".nsh-notification-preview.is-open");
      return popup && (popup.querySelector(".nsh-notification-preview-item")
        || popup.textContent.includes("暂无通知")
        || popup.textContent.includes("暂时无法加载"));
    }, undefined, { timeout: 10000 });
    const itemCount = await page.locator(".nsh-notification-preview-item").count();
    const popupOverflow = await page.locator(".nsh-notification-preview").evaluate((node) => getComputedStyle(node).overflowY);
    const previewState = await page.evaluate(() => {
      const popup = document.querySelector(".nsh-notification-preview.is-open");
      const text = popup?.textContent || "";
      return { empty: text.includes("暂无通知"), failed: text.includes("暂时无法加载") };
    });
    report.steps.push({ label: `notification-preview-${key}`, itemCount, at: new Date().toISOString() });
    console.log(JSON.stringify({ label: `notification-preview-${key}`, itemCount, popupOverflow, ...previewState, apiSummary }));
    page.off("response", captureNotificationApi);
    if (itemCount === 0 || itemCount > 10 || popupOverflow === "auto" || popupOverflow === "scroll") {
      throw new Error(`Notification preview rendering failed for ${key}`);
    }
    await page.mouse.move(2, 2);
    await page.waitForTimeout(250);
  }
  const hotkey = await page.evaluate(() => {
    const container = document.createElement("div");
    const editor = document.createElement("div");
    editor.className = "CodeMirror";
    const textarea = document.createElement("textarea");
    const submit = document.createElement("button");
    submit.textContent = "发布";
    let interceptedClickCount = 0;
    submit.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      interceptedClickCount++;
    });
    editor.appendChild(textarea);
    container.append(editor, submit);
    document.body.appendChild(container);
    const keyOptions = navigator.platform.toLowerCase().includes("mac")
      ? { metaKey: true }
      : { ctrlKey: true };
    const event = new KeyboardEvent("keydown", {
      key: "Enter", bubbles: true, cancelable: true, ...keyOptions
    });
    textarea.dispatchEvent(event);
    const result = { interceptedClickCount, shortcutPreventedDefault: event.defaultPrevented };
    container.remove();
    return result;
  });
  report.steps.push({ label: "post-hotkey", ...hotkey, at: new Date().toISOString() });
  console.log(JSON.stringify({ label: "post-hotkey", ...hotkey }));
  if (hotkey.interceptedClickCount !== 1 || !hotkey.shortcutPreventedDefault) {
    throw new Error("Configured Cmd/Ctrl+Enter post shortcut did not trigger safely");
  }
  for (let count = 1; count <= 3; count++) {
    const response = await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await checkpoint(`reload-${count}`, response);
    await page.waitForTimeout(1500);
  }
  await page.locator('a[href*="/post-"]').first().waitFor({ timeout: 10000 });
  const visitedIds = [];
  for (let index = 0; index < 2; index++) {
    const href = await page.locator('a[href*="/post-"]').evaluateAll((links, visited) => {
      return links.filter((link) => link.getClientRects().length > 0)
        .map((link) => link.href).find((href) => {
          const url = new URL(href);
          const id = url.pathname.match(/^\/post-(\d+)-\d+$/)?.[1];
          return url.origin === location.origin && id && !visited.includes(id);
        });
    }, visitedIds);
    if (!href) throw new Error("No distinct visible post link found");
    visitedIds.push(new URL(href).pathname.match(/^\/post-(\d+)/)[1]);
    const anchor = page.locator(`a[href=${JSON.stringify(new URL(href).pathname)}]:visible, a[href=${JSON.stringify(href)}]:visible`).first();
    let response = null;
    const capture = (item) => {
      if (item.request().isNavigationRequest() && item.frame() === page.mainFrame()) response = item;
    };
    page.on("response", capture);
    await Promise.all([
      page.waitForURL((url) => url.pathname === new URL(href).pathname, {
        waitUntil: "commit", timeout: 15000
      }),
      anchor.click()
    ]);
    await checkpoint(`post-${index + 1}`, response);
    if (index === 0) {
      const toolbar = page.locator(".nsh-editor-format-toolbar").first();
      await toolbar.waitFor({ timeout: 10000 });
      const formatButtonCount = await toolbar.locator("button").count();
      report.steps.push({ label: "editor-format-toolbar", formatButtonCount, at: new Date().toISOString() });
      console.log(JSON.stringify({ label: "editor-format-toolbar", formatButtonCount }));
      if (formatButtonCount < 7) throw new Error("Markdown editor toolbar is incomplete");

      const replyHotkey = await page.evaluate(() => {
        const container = document.createElement("div");
        const editor = document.createElement("div");
        editor.className = "CodeMirror";
        const textarea = document.createElement("textarea");
        const submit = document.createElement("button");
        submit.textContent = "回复评论";
        let interceptedClickCount = 0;
        submit.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          interceptedClickCount++;
        });
        editor.appendChild(textarea);
        container.append(editor, submit);
        document.body.appendChild(container);
        const keyOptions = navigator.platform.toLowerCase().includes("mac")
          ? { metaKey: true }
          : { ctrlKey: true };
        const event = new KeyboardEvent("keydown", {
          key: "Enter", bubbles: true, cancelable: true, ...keyOptions
        });
        textarea.dispatchEvent(event);
        const result = { interceptedClickCount, shortcutPreventedDefault: event.defaultPrevented };
        container.remove();
        return result;
      });
      report.steps.push({ label: "reply-hotkey", ...replyHotkey, at: new Date().toISOString() });
      console.log(JSON.stringify({ label: "reply-hotkey", ...replyHotkey }));
      if (replyHotkey.interceptedClickCount !== 1 || !replyHotkey.shortcutPreventedDefault) {
        throw new Error("Configured Cmd/Ctrl+Enter reply shortcut did not trigger safely");
      }

      const commentTools = await page.evaluate(() => ({
        controlsPresent: Boolean(document.querySelector(".nsh-comment-tools, .nsh-comment-collapse-button, .nsh-comment-reply-button"))
      }));
      report.steps.push({ label: "comment-tools-removed", ...commentTools, at: new Date().toISOString() });
      console.log(JSON.stringify({ label: "comment-tools-removed", ...commentTools }));
      if (commentTools.controlsPresent) {
        throw new Error("Removed comment controls are still present");
      }

      await page.locator(".nsh-quick-reply-button").waitFor({ timeout: 10000 });
      await page.keyboard.press("Shift+R");
      await page.waitForFunction(() => Boolean(document.querySelector(".CodeMirror.CodeMirror-focused")), undefined, { timeout: 5000 });
      const beforeBlur = await page.locator('a[href*="/post-"]').count();
      await page.evaluate(() => document.activeElement?.blur());
      await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
      await page.waitForTimeout(300);
      const afterBlur = await page.locator('a[href*="/post-"]').count();
      const guard = { quickReplyFocused: true, postLinksBeforeBlur: beforeBlur, postLinksAfterBlur: afterBlur };
      report.steps.push({ label: "quick-reply-blur-guard", ...guard, at: new Date().toISOString() });
      console.log(JSON.stringify({ label: "quick-reply-blur-guard", ...guard }));
      if (beforeBlur !== afterBlur) throw new Error("Auto page appended after editor blur without user scrolling");
    }
    page.off("response", capture);
    await page.waitForTimeout(1500);
    const home = await page.goto("https://www.nodeseek.com/", {
      waitUntil: "domcontentloaded", timeout: 30000
    });
    await checkpoint(`return-home-${index + 1}`, home);
  }
  report.passed = true;
} catch (error) {
  report.failure = error.message;
  console.log("PROBE FAILED:", error.message);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log("REPORT:", path.join(output, "report.json"));
}
