const { test, expect, chromium } = require("@playwright/test");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");

test("one restore action restores config-only without data loss and replaces a complete backup", async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "nodeseek-backup-"));
  const extension = path.resolve(__dirname, "../..");
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: "chromium",
      headless: true,
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`
      ]
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
    const extensionId = new URL(worker.url()).host;
    await expect.poll(() => worker.evaluate(async () => {
      const state = await chrome.storage.local.get("nshPreloadedConfigImported");
      return state.nshPreloadedConfigImported === true;
    })).toBe(true);

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForFunction(() => Boolean(lastStoredOptionsSignature));
    await page.locator('[data-panel-target="sync-panel"]').click();
    await expect(page.getByRole("button", { name: "导出配置" })).toBeVisible();
    await expect(page.getByRole("button", { name: "完整导出" })).toBeVisible();
    await expect(page.getByRole("button", { name: "恢复备份" })).toBeVisible();
    await expect(page.locator("#sync-panel input[type='file']")).toHaveCount(1);

    await worker.evaluate(async () => {
      await chrome.storage.local.set({
        telegramMonitorPaused: true,
        telegramBotToken: "",
        telegramChatId: "stale-legacy-chat",
        telegramKeywordRules: [{ id: "backup-rule", terms: ["keep"], mode: "all", enabled: true }],
        telegramManagedTopics: [{ nsUserId: "42", topicId: "92", name: "backup-topic" }],
        telegramMessageCursors: { "42:92": "123" },
        telegramPersonalStartOffset: 121,
        telegramPendingTopicUpdates: [{ updateId: 1001, text: "pending must not replay" }]
      });
      await withTransaction([STORE_PROFILES], "readwrite", async ({ profiles }) => {
        await requestToPromise(profiles.put({
          memberId: "backup-user",
          memberName: "Backup User",
          cachedAt: 100,
          latestSnapshotId: "",
          latestCollectedAt: 100,
          latestDetailLean: { member_id: "backup-user", member_name: "Backup User" },
          latestTextRefs: { readme: null }
        }));
      });
    });

    const backups = await page.evaluate(async () => {
      window.__capturedBackup = null;
      downloadJsonFile = (payload) => { window.__capturedBackup = payload; };
      await exportConfigFile();
      const configBackup = window.__capturedBackup;
      await exportFullBackupFile();
      return { configBackup, fullBackup: window.__capturedBackup };
    });
    const { configBackup, fullBackup: backup } = backups;
    expect(configBackup.schema).toBe("nodeseek-helper-config");
    expect(configBackup.options.telegramKeywordRules[0].id).toBe("backup-rule");
    expect(configBackup.options.telegramManagedTopics[0].topicId).toBe("92");
    expect(backup.schema).toBe("nodeseek-helper-full-backup");
    expect(backup.configuration.options.telegramKeywordRules[0].id).toBe("backup-rule");
    expect(backup.configuration.options.telegramManagedTopics[0].topicId).toBe("92");
    expect(backup.localState.telegramMessageCursors["42:92"]).toBe("123");
    expect(backup.localState.telegramPersonalStartOffset).toBe(121);
    expect(backup.localState).not.toHaveProperty("telegramPendingTopicUpdates");
    expect(Object.keys(backup.database.stores).sort()).toEqual([
      "luckyNotifications",
      "meta",
      "profileSnapshots",
      "profileTextBlobs",
      "profiles",
      "visitHistory"
    ]);

    await worker.evaluate(() => chrome.storage.local.set({
      telegramKeywordRules: [{ id: "config-change", terms: ["changed"], mode: "all", enabled: true }],
      telegramManagedTopics: [{ nsUserId: "42", topicId: "998", name: "config-change" }]
    }));
    await page.evaluate(async config => restoreConfigBackup(config), configBackup);
    const afterConfigRestore = await worker.evaluate(async () => ({
      settings: await chrome.storage.local.get(["telegramKeywordRules", "telegramManagedTopics", "telegramTargets", "telegramChatId"]),
      profile: await withTransaction([STORE_PROFILES], "readonly", async ({ profiles }) =>
        requestToPromise(profiles.get("backup-user")))
    }));
    expect(afterConfigRestore.settings.telegramKeywordRules[0].id).toBe("backup-rule");
    expect(afterConfigRestore.settings.telegramManagedTopics[0].topicId).toBe("92");
    expect(afterConfigRestore.settings.telegramTargets).toEqual([]);
    expect(afterConfigRestore.settings).not.toHaveProperty("telegramChatId");
    expect(afterConfigRestore.profile.memberName).toBe("Backup User");

    await worker.evaluate(async () => {
      await chrome.storage.local.set({
        telegramKeywordRules: [{ id: "changed-rule", terms: ["changed"], mode: "all", enabled: true }],
        telegramManagedTopics: [{ nsUserId: "42", topicId: "999", name: "changed-topic" }],
        telegramPendingTopicUpdates: [{ updateId: 2002, text: "current pending is cleared on full restore" }]
      });
      await withTransaction([STORE_PROFILES], "readwrite", async ({ profiles }) => {
        await requestToPromise(profiles.clear());
        await requestToPromise(profiles.put({
          memberId: "after-backup-user",
          memberName: "After Backup",
          cachedAt: 200,
          latestSnapshotId: "",
          latestCollectedAt: 200,
          latestDetailLean: { member_id: "after-backup-user", member_name: "After Backup" },
          latestTextRefs: { readme: null }
        }));
      });
    });

    await page.evaluate(async (fullBackup) => {
      await restoreFullBackupFile(fullBackup);
    }, backup);

    const restored = await worker.evaluate(async () => {
      const storage = await chrome.storage.local.get([
        "telegramKeywordRules",
        "telegramManagedTopics",
        "telegramMessageCursors",
        "telegramPendingTopicUpdates"
      ]);
      const profiles = await withTransaction([STORE_PROFILES], "readonly", async ({ profiles }) => ({
        backup: await requestToPromise(profiles.get("backup-user")),
        after: await requestToPromise(profiles.get("after-backup-user"))
      }));
      return { storage, profiles };
    });

    expect(restored.storage.telegramKeywordRules[0].id).toBe("backup-rule");
    expect(restored.storage.telegramManagedTopics[0].topicId).toBe("92");
    expect(restored.storage.telegramMessageCursors["42:92"]).toBe("123");
    expect(restored.storage).not.toHaveProperty("telegramPendingTopicUpdates");
    expect(restored.profiles.backup.memberName).toBe("Backup User");
    expect(restored.profiles.after).toBeUndefined();
  } finally {
    await context?.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
});
