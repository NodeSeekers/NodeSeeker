const { test, expect, chromium } = require("@playwright/test");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");

test("avatar profile previews recover across repeated hovers when profile requests fail", async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "nodeseek-profile-hover-failure-"));
  const extension = path.resolve(__dirname, "../..");
  const failedRequests = [];
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
      autoAttendanceEnabled: false,
      userStatsEnabled: true,
      profileHoverSignatureEnabled: true
    }));

    const page = await context.newPage();
    await page.route("https://www.nodeseek.com/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/") {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: `<!doctype html><html><body>
            <article class="content-item">
              <div class="avatar-wrapper"><a href="/space/901"><img alt="failing user A"></a></div>
              <div class="nsk-content-meta-info"><div class="author-info"><a class="author-name" href="/space/901">failing-user-a</a></div><a href="/post-901-1">post A</a></div>
            </article>
            <article class="content-item" style="margin-top: 500px">
              <div class="avatar-wrapper"><a href="/space/902"><img alt="failing user B"></a></div>
              <div class="nsk-content-meta-info"><div class="author-info"><a class="author-name" href="/space/902">failing-user-b</a></div><a href="/post-902-1">post B</a></div>
            </article>
          </body></html>`
        });
        return;
      }
      if (["/api/account/getInfo/901", "/api/account/getInfo/902"].includes(url.pathname)) {
        failedRequests.push(url.pathname.split("/").at(-1));
        await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
        return;
      }
      await route.abort();
    });

    await page.goto("https://www.nodeseek.com/", { waitUntil: "domcontentloaded" });
    const avatarA = page.locator(".avatar-wrapper a[href='/space/901']");
    const avatarB = page.locator(".avatar-wrapper a[href='/space/902']");
    const popup = page.locator(".nsh-profile-trend-popup");
    await expect(avatarA).toHaveAttribute("data-nsh-trend-bound", "1");
    await expect(avatarB).toHaveAttribute("data-nsh-trend-bound", "1");

    for (const [avatar, id] of [[avatarA, "901"], [avatarB, "902"]]) {
      const countBefore = failedRequests.filter((requestId) => requestId === id).length;
      await avatar.hover();
      await expect(popup).toContainText("用户资料加载失败");
      await expect.poll(() => failedRequests.filter((requestId) => requestId === id).length)
        .toBeGreaterThan(countBefore);
    }

    await popup.hover();
    await page.mouse.move(1, 1);
    await page.waitForTimeout(220);
    await expect(popup).toHaveCount(0);

    for (const [avatar, id] of [[avatarA, "901"], [avatarB, "902"], [avatarA, "901"]]) {
      const countBefore = failedRequests.filter((requestId) => requestId === id).length;
      await avatar.hover();
      await expect(popup).toContainText("用户资料加载失败");
      await expect.poll(() => failedRequests.filter((requestId) => requestId === id).length)
        .toBeGreaterThan(countBefore);
    }
  } finally {
    if (context) await context.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
});
