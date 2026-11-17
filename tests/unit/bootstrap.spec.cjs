const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/background/bootstrap.js"), "utf8");

function extractFunction(name) {
  let start = source.indexOf(`function ${name}(`);
  if (source.slice(start - 6, start) === "async ") start -= 6;
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

test("a fresh extension session runs an immediate Telegram catch-up and respects offline-message sync", async () => {
  const session = {};
  const scheduled = [];
  const sandbox = vm.createContext({
    chrome: {
      storage: {
        session: {
          get: async (defaults) => ({ ...defaults, ...session }),
          set: async (values) => Object.assign(session, values)
        },
        local: {
          get: async (defaults) => ({ ...defaults, telegramOfflineMessageSyncEnabled: false })
        }
      }
    },
    TELEGRAM_WORKER_SESSION_KEY: "telegramMonitorWorkerSessionInitialized",
    scheduleTelegramMonitorAlarm: async (options = {}) => scheduled.push({
      resetMessageBaseline: options.resetMessageBaseline ?? false,
      checkImmediately: options.checkImmediately ?? false
    }),
    console: { warn: () => {} }
  });
  vm.runInContext(extractFunction("scheduleTelegramMonitorForLifecycle"), sandbox);
  vm.runInContext(extractFunction("scheduleTelegramMonitorAlarmForWorkerStart"), sandbox);

  await vm.runInContext("scheduleTelegramMonitorAlarmForWorkerStart()", sandbox);
  await vm.runInContext("scheduleTelegramMonitorAlarmForWorkerStart()", sandbox);

  expect(scheduled).toEqual([
    { resetMessageBaseline: true, checkImmediately: true },
    { resetMessageBaseline: false, checkImmediately: false }
  ]);
});
