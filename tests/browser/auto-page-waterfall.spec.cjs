const { test, expect, chromium } = require("@playwright/test");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");

test("waterfall appends after its delay when the pointer is over an unfocused reply editor", async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "nodeseek-auto-page-"));
  const extension = path.resolve(__dirname, "../..");
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: "chromium",
      headless: true,
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
    });
    const worker = context.serviceWorkers()[0]
      || await context.waitForEvent("serviceworker");
    await worker.evaluate(async () => chrome.storage.local.set({
      readingNavigationEnabled: true,
      autoPageEnabled: true,
      autoPageAppendEnabled: true,
      autoPageDelayMs: 100,
      autoAttendanceEnabled: false,
      userStatsEnabled: false,
      profileHoverSignatureEnabled: false,
      editorToolsEnabled: false
    }));

    const page = await context.newPage();
    await page.route("https://www.nodeseek.com/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/post-123-1") {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: `<!doctype html><html><head><meta charset="utf-8"><style>
            body { min-height: 2200px; margin: 0; }
            #nsk-body-left { padding: 12px; }
            .content-item { height: 400px; }
            .reply-form { position: fixed; bottom: 12px; left: 12px; }
            .CodeMirror { width: 320px; height: 40px; }
          </style></head><body>
            <div id="nsk-body-left">
              <div class="comment-container"><ul>
                <li class="content-item">
                  <div class="nsk-content-meta-info"><div class="author-info"><a class="author-name" href="/space/1">user</a></div></div>
                  <article class="post-content">${"long comment ".repeat(40)}</article>
                </li>
              </ul></div>
              <div class="nsk-pager post-top-pager"><span class="pager-prev" aria-disabled="true"></span><span class="pager-pos pager-cur" aria-current="page">1</span><a class="pager-pos" href="/post-123-2" aria-current="page">2</a><a class="pager-next" href="/post-123-2" rel="next"></a></div>
              <div class="nsk-pager post-bottom-pager"><span class="pager-prev" aria-disabled="true"></span><span class="pager-pos pager-cur" aria-current="page">1</span><a class="pager-pos" href="/post-123-2" aria-current="page">2</a><a class="pager-next" href="/post-123-2" rel="next"></a></div>
              <div class="reply-form"><div class="CodeMirror"><div class="CodeMirror-code">
                <div><div class="CodeMirror-gutter-wrapper"><div class="CodeMirror-linenumber">1</div></div><pre class="CodeMirror-line">&#8203;</pre></div>
              </div></div></div>
            </div>
            <script>
              window.addEventListener("wheel", (event) => {
                window.__wheelOverEditor = Boolean(event.target.closest?.(".CodeMirror"));
              }, true);
            </script>
          </body></html>`
        });
        return;
      }
      if (url.pathname === "/post-123-2") {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: `<!doctype html><html><body><div id="nsk-body-left">
            <div class="comment-container"><ul><li class="content-item">
              <div class="nsk-content-meta-info"><div class="author-info"><a class="author-name" href="/space/2">user 2</a></div></div>
              <article class="post-content">${"next long comment ".repeat(40)}</article>
            </li></ul></div>
            <div class="nsk-pager post-top-pager"><a class="pager-prev" href="/post-123-1"></a><a class="pager-pos" href="/post-123-1">1</a><span class="pager-pos pager-cur" aria-current="page">2</span><span class="pager-next" aria-disabled="true"></span></div>
            <div class="nsk-pager post-bottom-pager"><a class="pager-prev" href="/post-123-1"></a><a class="pager-pos" href="/post-123-1">1</a><span class="pager-pos pager-cur" aria-current="page">2</span><span class="pager-next" aria-disabled="true"></span></div>
          </div></body></html>`
        });
        return;
      }
      await route.abort();
    });

    await page.goto("https://www.nodeseek.com/post-123-1", { waitUntil: "domcontentloaded" });
    const editor = page.locator(".CodeMirror");
    const bounds = await editor.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    expect(await editor.evaluate((node) => node.contains(document.activeElement))).toBe(false);
    await page.mouse.wheel(0, 4000);

    await expect.poll(() => page.evaluate(() => window.__wheelOverEditor)).toBe(true);
    await expect(page.locator("#nsk-body-left .comment-container .content-item")).toHaveCount(2, { timeout: 5000 });
    await expect(page.locator(".post-top-pager .pager-cur")).toHaveText("2");
    await expect(page.locator(".post-bottom-pager .pager-cur")).toHaveText("2");
    await expect(page.locator(".post-top-pager .pager-pos[aria-current='page']")).toHaveCount(1);
    await expect(page.locator(".nsh-comment-tools, .nsh-comment-collapsed, .nsh-comment-reply-button")).toHaveCount(0);
    await expect(page).toHaveURL(/\/post-123-1$/);
  } finally {
    if (context) await context.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
});
