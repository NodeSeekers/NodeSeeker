const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/background/bootstrap.js"), "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf("\n}", start) + 2;
  return source.slice(start, end);
}

test("startup preserves the private-message cursor when offline sync is enabled and resets it when disabled", async () => {
  const scheduled = [];
  const storage = {};
  const sandbox = vm.createContext({
    chrome: {
      storage: { local: {
        get: async (defaults) => ({ ...defaults, ...storage })
      } }
    },
    scheduleTelegramMonitorAlarm: async (options) => scheduled.push(options),
    console: { warn: () => {} }
  });
  vm.runInContext(extractFunction("scheduleTelegramMonitorForLifecycle"), sandbox);

  await vm.runInContext("scheduleTelegramMonitorForLifecycle({ checkImmediately: true })", sandbox);
  storage.telegramOfflineMessageSyncEnabled = false;
  await vm.runInContext("scheduleTelegramMonitorForLifecycle({ checkImmediately: true })", sandbox);

  expect(scheduled).toEqual([
    { resetMessageBaseline: false, checkImmediately: true },
    { resetMessageBaseline: true, checkImmediately: true }
  ]);
});
