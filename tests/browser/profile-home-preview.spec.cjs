const { test, expect, chromium } = require("@playwright/test");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");

test("avatar hover shows cached profile overview without a management-record entry", async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "nodeseek-profile-preview-"));
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
      autoAttendanceEnabled: false,
      messageEntryEnabled: true,
      readingNavigationEnabled: true,
      userStatsEnabled: true,
      profileHoverSignatureEnabled: true
    }));

    const page = await context.newPage();
    let failAttendance = true;
    await context.route("https://www.nodeseek.com/post-900-1*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><body>Fixture topic</body></html>"
      });
    });
    await page.route("https://www.nodeseek.com/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/") {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: `<!doctype html><html><head><meta charset="utf-8"></head><body>
            <div id="nsk-right-panel-container">
              <div class="user-card"><div class="user-stat">
                <div class="stat-block"><a href="/notification">通知</a></div>
                <div class="stat-block"><span>等级 Lv 3</span></div>
              </div><a href="/space/123">fixture-user</a></div>
            </div>
            <article class="content-item">
              <div class="avatar-wrapper"><a href="/space/123"><img alt="fixture-user"></a></div>
              <div class="nsk-content-meta-info">
                <div class="author-info"><a class="author-name" href="/space/123">fixture-user</a></div>
                <a href="/post-456-1">fixture post</a>
              </div>
            </article>
            <article class="content-item" style="margin-top: 360px">
              <div class="avatar-wrapper"><a href="/space/124"><img alt="fixture-user-124"></a></div>
              <div class="nsk-content-meta-info">
                <div class="author-info"><a class="author-name" href="/space/124">fixture-user-124</a></div>
                <a href="/post-457-1">fixture post 2</a>
              </div>
            </article>
            <div class="CodeMirror"><div class="CodeMirror-code"></div></div>
          </body></html>`
        });
        return;
      }
      if (["/api/account/getInfo/123", "/api/account/getInfo/124"].includes(url.pathname)) {
        const secondUser = url.pathname.endsWith("/124");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            detail: {
              member_id: secondUser ? 124 : 123,
              member_name: secondUser ? "fixture-user-124" : "fixture-user",
              rank: 3,
              coin: 1164,
              nPost: 84,
              nComment: 539,
              created_at: "2025-11-12T00:00:00.000Z",
              readme: secondUser ? "## 关于我\n**第二用户个人介绍**" : "## 关于我\n**测试个人介绍**"
            }
          })
        });
        return;
      }
      if (url.pathname === "/api/notification/unread-count") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ unreadCount: { atMe: 1, reply: 0, message: 0 } })
        });
        return;
      }
      if (url.pathname === "/api/content/list-discussions") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { discussions: Array.from({ length: 12 }, (_, index) => ({ post_id: 900 + index, title: `最近主题 ${index + 1}` })) }
          })
        });
        return;
      }
      if (url.pathname === "/api/content/list-comments") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            comments: Array.from({ length: 12 }, (_, index) => ({
              post_id: 800,
              floor_id: index + 1,
              title: `评论所在主题 ${index + 1}`,
              text: `最近评论 ${index + 1}`
            }))
          })
        });
        return;
      }
      if (url.pathname === "/api/progress/today") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            postBonusCount: 0,
            maxPostBonusCount: 4,
            commentBonusCount: 11,
            maxCommentBonusCount: 20,
            freeLikeUsed: 0,
            maxFreeLike: 2
          })
        });
        return;
      }
      if (url.pathname === "/api/attendance/board") {
        if (failAttendance) {
          await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, record: { gain: 6 } })
        });
        return;
      }
      await route.abort();
    });

    await page.goto("https://www.nodeseek.com/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-nsh-message-entry="reply"]')).toHaveCount(1);
    await expect(page.locator('[data-nsh-message-entry="message"]')).toHaveCount(1);
    await expect(page.locator('[data-nsh-message-entry="admin"]')).toHaveCount(0);
    await expect(page.locator(".nsh-editor-format-toolbar button").filter({ hasText: "Callout" })).toHaveCount(0);
    await expect(page.locator(".nsh-editor-format-type option[value='caution']")).toHaveText("红色 Caution");
    await expect(page.locator(".nsh-editor-format-type option[value='success'], .nsh-editor-format-type option[value='info'], .nsh-editor-format-type option[value='danger']")).toHaveCount(0);

    await page.locator("[data-nsh-message-entry='message'] .nsh-message-entry-link").hover();
    await expect(page.locator(".nsh-notification-preview-mark-read")).toHaveText("私信全部已读");
    await page.mouse.move(1, 1);
    await page.waitForTimeout(200);

    const avatar = page.locator(".avatar-wrapper a[href='/space/123']");
    await avatar.hover();
    await page.waitForTimeout(75);
    await page.mouse.move(1, 1);
    await page.waitForTimeout(200);
    await expect(page.locator(".nsh-profile-home-popup")).toHaveCount(0);

    await avatar.hover();
    await page.waitForTimeout(75);
    await expect(page.locator(".nsh-profile-home-popup")).toHaveCount(0);
    const popup = page.locator(".nsh-profile-home-popup");
    await expect(popup).toContainText("测试个人介绍");
    await expect(popup.locator(".nsh-profile-home-metric")).toHaveCount(5);
    await expect(popup).toContainText("1,164");
    await expect(popup.locator(".nsh-profile-home-tabs")).toHaveCount(0);
    await expect(popup.locator(".nsh-profile-user-action-button")).toHaveCount(3);
    await expect(popup.locator(".nsh-profile-message-button")).toHaveAttribute(
      "href",
      "/notification#/message?mode=talk&to=123"
    );
    const nameLink = popup.locator(".nsh-profile-home-name-link");
    await expect(nameLink).toHaveAttribute("href", "/space/123");
    await expect(nameLink).toHaveAttribute("target", "_blank");
    const topicMetric = popup.getByRole("link", { name: /主题帖/ });
    const commentMetric = popup.getByRole("link", { name: /评论数/ });
    await expect(topicMetric).toHaveAttribute("href", "/space/123#/discussions");
    await expect(topicMetric).toHaveAttribute("target", "_blank");
    await expect(commentMetric).toHaveAttribute("href", "/space/123#/comments");
    await expect(commentMetric).toHaveAttribute("target", "_blank");

    await page.locator(".avatar-wrapper a[href='/space/124']").hover();
    await expect(popup).toContainText("第二用户个人介绍");

    await topicMetric.hover();
    const activityPopup = page.locator(".nsh-profile-activity-popup.is-open");
    await expect(activityPopup).toContainText("最近 10 条主题");
    await expect(activityPopup.locator(".nsh-profile-activity-item")).toHaveCount(10);
    await expect(activityPopup.locator(".nsh-profile-activity-item").first()).toHaveAttribute("target", "_blank");
    const firstTopic = activityPopup.locator(".nsh-profile-activity-item").first();
    const firstTopicBounds = await firstTopic.boundingBox();
    await page.mouse.move(
      firstTopicBounds.x + firstTopicBounds.width / 2,
      firstTopicBounds.y + firstTopicBounds.height / 2,
      { steps: 16 }
    );
    await expect(activityPopup).toContainText("最近 10 条主题");
    const topicPagePromise = context.waitForEvent("page");
    await firstTopic.click();
    const topicPage = await topicPagePromise;
    await topicPage.waitForLoadState("domcontentloaded");
    await expect(topicPage).toHaveURL(/\/post-900-1/);
    await topicPage.close();
    await page.mouse.move(1, 1);
    await expect(activityPopup).toHaveCount(0);
    await expect(popup).toBeVisible();
    await commentMetric.hover();
    await expect(activityPopup).toContainText("最近 10 条评论");
    await expect(activityPopup.locator(".nsh-profile-activity-item").first()).toHaveAttribute("href", /post-800-1\?nshFloor=1/);

    await page.locator("#nsk-right-panel-container .user-stat > .stat-block:nth-child(2) > span").hover();
    const progressPopup = page.locator(".nsh-profile-progress-popup.is-open");
    await expect(progressPopup).toContainText("NodeSeek进度系统");
    await expect(progressPopup).toContainText("今日评论");
    await expect(progressPopup).toContainText("部分数据暂时无法加载：签到");
    await expect(progressPopup.locator("[role='progressbar']")).toHaveCount(4);
    await expect(progressPopup).toHaveCSS("width", "410px");
    await expect(progressPopup).toHaveCSS("font-size", "12px");
  } finally {
    if (context) await context.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
});
