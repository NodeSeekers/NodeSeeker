const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function load(sandbox, filename) {
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../", filename), "utf8"), sandbox);
}

function createRecoverySandbox() {
  const names = ["profiles", "profileSnapshots", "profileTextBlobs", "luckyNotifications", "visitHistory", "meta"];
  const tables = Object.fromEntries(names.map((name) => [name, new Map()]));
  const local = { old: true };
  const sandbox = vm.createContext({
    BACKUP_DATABASE_STORE_NAMES: names,
    BACKUP_OMITTED_LOCAL_KEYS: [],
    STORE_PROFILES: names[0],
    STORE_PROFILE_SNAPSHOTS: names[1],
    STORE_PROFILE_TEXT_BLOBS: names[2],
    STORE_LUCKY_NOTIFICATIONS: names[3],
    STORE_VISIT_HISTORY: names[4],
    STORE_META: names[5],
    DB_NAME: "test",
    DB_VERSION: 1,
    requestToPromise: async (result) => result,
    collectCursorValues: async (table) => [...table.values()],
    withTransaction: async (_names, _mode, fn) => fn(Object.fromEntries(Object.entries(tables).map(([key, table]) => [
      key, {
        values: () => table.values(),
        get: (id) => table.get(id),
        delete: (id) => table.delete(id),
        clear: () => table.clear(),
        put: (item) => table.set(item.key, item)
      }
    ]))),
    chrome: {
      runtime: { getManifest: () => ({ version: "1.1.32" }) },
      storage: { local: {
        get: async () => ({ ...local }),
        set: async (value) => Object.assign(local, value),
        remove: async (value) => { for (const key of [value].flat()) delete local[key]; }
      } }
    },
    scheduleLuckyNotificationAlarmSync() {},
    scheduleProfileRetentionPrune() {},
    scheduleTelegramMonitorAlarm() {},
    scheduleAutoAttendanceAlarm() {}
  });
  load(sandbox, "src/background/database-sync.js");
  return { sandbox, tables, local, names };
}

test("full backup restore waits for old background writes and gates new background tasks", async () => {
  const { sandbox, local, names } = createRecoverySandbox();
  let releaseOld;
  sandbox.oldOperation = () => new Promise((resolve) => {
    releaseOld = () => {
      local.telegramManagedTopics = [{ name: "old" }];
      resolve();
    };
  });
  sandbox.backup = {
    configuration: { telegramMonitorPaused: false, telegramManagedTopics: [{ name: "restored" }] },
    localState: {},
    database: { schema: "nodeseek-helper-data", stores: Object.fromEntries(names.map((name) => [name, []])) }
  };

  const old = vm.runInContext("runBackgroundOperation(oldOperation)", sandbox);
  await Promise.resolve();
  const restore = vm.runInContext("restoreFullBackup(backup)", sandbox);
  await expect.poll(() => vm.runInContext("fullBackupRestoreInProgress", sandbox)).toBe(true);
  await expect(Promise.resolve(vm.runInContext("runBackgroundOperation(() => true)", sandbox))).rejects.toThrow("正在恢复");
  releaseOld();
  await old;
  await restore;
  expect(local.telegramManagedTopics).toEqual([{ name: "restored" }]);
  expect(local.telegramMonitorPaused).toBe(false);
});

test("startup completes the settings half of an interrupted database restore", async () => {
  const { sandbox, local, tables } = createRecoverySandbox();
  const key = "nshFullBackupRestoreJournal";
  tables.meta.set(key, { key, value: { telegramMonitorPaused: false, userStatsEnabled: true } });
  await vm.runInContext("recoverInterruptedFullBackup()", sandbox);
  expect(local).toEqual({ telegramMonitorPaused: false, userStatsEnabled: true, nshPreloadedConfigImported: true });
  expect(tables.meta.has(key)).toBe(false);
});

test("a late page response cannot append after waterfall is disabled", async () => {
  let releaseResponse;
  let parses = 0;
  const sandbox = vm.createContext({
    AbortController, URL, Set, setTimeout, clearTimeout,
    location: new URL("https://www.nodeseek.com/post-123-1"),
    featureOptions: { readingNavigationEnabled: true, autoPageEnabled: true, autoPageAppendEnabled: true },
    autoPageAppendLoadedUrls: new Set(),
    autoPageAppendLoading: false, autoPageAppendInitialized: false, autoPageAppendBaseUrl: "",
    autoPageAppendNextUrl: "", autoPageTouchStartY: 0, autoPageEdgeState: {},
    document: { querySelector: () => null },
    DOMParser: class { parseFromString() { parses++; } },
    fetch: () => new Promise((resolve) => { releaseResponse = resolve; })
  });
  load(sandbox, "src/content/auto-page.js");
  const request = vm.runInContext('loadAndAppendAutoPage("https://www.nodeseek.com/post-123-2")', sandbox);
  sandbox.featureOptions.autoPageAppendEnabled = false;
  vm.runInContext("resetAutoPageAppendState()", sandbox);
  releaseResponse({ ok: true, text: async () => "<html></html>" });
  await request;
  expect(parses).toBe(0);
});

test("editor keeps successful image links and retries only failed files", async () => {
  const uploads = [];
  const inserted = [];
  const nodes = [];
  let failSecondImage = true;
  const status = {
    textContent: "",
    append(...items) { nodes.push(...items); },
    querySelector: () => nodes.find((node) => node.type === "button")
  };
  const sandbox = vm.createContext({
    document: { createTextNode: (text) => text, createElement: () => ({}) },
    setTimeout() {},
    resolveImage: async (file) => {
      uploads.push(file.name);
      if (file.name === "second.png" && failSecondImage) throw new Error("测试上传失败");
      return { markdown: `![${file.name}](https://image.invalid/${file.name})` };
    }
  });
  load(sandbox, "src/content/editor-upload.js");
  sandbox.showEditorStatus = () => status;
  sandbox.removeUploadStatus = () => { nodes.length = 0; };
  sandbox.fileToUploadPayload = async (file) => file;
  sandbox.uploadImage = sandbox.resolveImage;
  sandbox.insertMarkdown = async (value) => { inserted.push(value); return true; };
  await vm.runInContext('uploadFilesToEditor([{name:"first.png"},{name:"second.png"}], {})', sandbox);
  expect(inserted).toEqual(["![first.png](https://image.invalid/first.png)\n"]);
  failSecondImage = false;
  nodes.find((node) => node.type === "button").onclick();
  await expect.poll(() => inserted.length).toBe(2);
  expect(uploads).toEqual(["first.png", "second.png", "second.png"]);
});
