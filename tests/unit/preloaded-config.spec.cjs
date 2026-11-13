const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/background/preloaded-config.js"), "utf8");

function createPreloadedConfigSandbox({ saved = {}, payload, responseOk = true } = {}) {
  const storage = { ...saved };
  const chrome = {
    runtime: { getURL: (file) => `chrome-extension://test/${file}` },
    storage: { local: {
      async get(keys) {
        return Object.fromEntries(keys.filter((key) => Object.prototype.hasOwnProperty.call(storage, key))
          .map((key) => [key, storage[key]]));
      },
      async set(values) { Object.assign(storage, values); }
    } }
  };
  const fetch = async () => ({ ok: responseOk, json: async () => payload });
  const sandbox = vm.createContext({ chrome, fetch, Object });
  vm.runInContext(source, sandbox);
  return { sandbox, storage };
}

test("bundled config seeds settings and ignores runtime keys", async () => {
  const { sandbox, storage } = createPreloadedConfigSandbox({
    payload: {
      schema: "nodeseek-helper-preloaded-config",
      version: 1,
      options: {
        autoAttendanceEnabled: true,
        telegramBotToken: "example-token",
        telegramTargets: [{ type: "direct", chatId: "-1001", topicId: "12" }],
        nshAutoAttendanceState: { status: "success" }
      }
    }
  });

  const imported = await vm.runInContext("importPreloadedConfiguration()", sandbox);

  expect(imported).toBe(true);
  expect(storage.autoAttendanceEnabled).toBe(true);
  expect(storage.telegramTargets).toEqual([{ type: "direct", chatId: "-1001", topicId: "12" }]);
  expect(storage.nshAutoAttendanceState).toBeUndefined();
  expect(storage.nshPreloadedConfigImported).toBe(true);
});

test("bundled config fills missing settings without overwriting saved values", async () => {
  const { sandbox, storage } = createPreloadedConfigSandbox({
    saved: { autoAttendanceEnabled: false, imageUploadEnabled: true },
    payload: {
      schema: "nodeseek-helper-preloaded-config",
      version: 1,
      options: {
        autoAttendanceEnabled: true,
        imageUploadEnabled: false,
        telegramBotToken: "bundled-token",
        telegramTargets: [{ type: "direct", chatId: "-1001", topicId: "12" }]
      }
    }
  });

  const imported = await vm.runInContext("importPreloadedConfiguration()", sandbox);

  expect(imported).toBe(true);
  expect(storage.autoAttendanceEnabled).toBe(false);
  expect(storage.imageUploadEnabled).toBe(true);
  expect(storage.telegramBotToken).toBe("bundled-token");
  expect(storage.telegramTargets).toEqual([{ type: "direct", chatId: "-1001", topicId: "12" }]);
  expect(storage.nshPreloadedConfigImported).toBe(true);
});
