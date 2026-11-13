const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/background/attendance.js"), "utf8");

function createAttendanceSandbox({ enabled = true, mode = "random", sendMessage, now = Date.now(), attendanceState = null } = {}) {
  const alarms = { created: [], cleared: [] };
  const messages = [];
  class MockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const storage = {
    autoAttendanceEnabled: enabled,
    autoAttendanceMode: mode,
    nshAutoAttendanceState: attendanceState
  };
  const chrome = {
    storage: { local: {
      async get(query) {
        if (typeof query === "string") return { [query]: storage[query] };
        return Object.fromEntries(Object.entries(query).map(([key, value]) => [key, storage[key] ?? value]));
      },
      async set(values) { Object.assign(storage, values); }
    } },
    alarms: {
      clear: async (name) => { alarms.cleared.push(name); return true; },
      create: (name, schedule) => alarms.created.push({ name, schedule })
    },
    tabs: {
      query: async () => [{ id: 1, url: "https://www.nodeseek.com/" }],
      create: async () => ({ id: 2, status: "complete" }),
      sendMessage: async (tabId, message) => {
        messages.push({ tabId, message });
        return sendMessage ? sendMessage(tabId, message) : { ok: true, result: { gain: 5 } };
      },
      remove: async () => {},
      onUpdated: { addListener() {}, removeListener() {} }
    }
  };
  const sandbox = vm.createContext({ chrome, Date: MockDate, Intl, URL, Number, String, Math, setTimeout, clearTimeout });
  vm.runInContext(source, sandbox);
  return { sandbox, storage, alarms, messages };
}

test("automatic check-in schedules for the next UTC+8 midnight after today's success", async () => {
  const now = Date.parse("2026-11-12T16:09:00.000Z");
  const { sandbox, alarms } = createAttendanceSandbox({
    now,
    attendanceState: { dateKey: "2026-11-13", status: "success", attemptedAt: now - 60_000 }
  });

  await vm.runInContext("scheduleAutoAttendanceAlarm()", sandbox);

  expect(alarms.created[0].schedule.when).toBe(Date.parse("2026-11-13T16:00:00.000Z"));
});

test("automatic check-in retries five minutes after a failed attempt", async () => {
  const now = Date.parse("2026-11-12T16:09:00.000Z");
  const attemptedAt = now - 2 * 60_000;
  const { sandbox, alarms } = createAttendanceSandbox({
    now,
    attendanceState: { dateKey: "2026-11-13", status: "failed", attemptedAt }
  });

  await vm.runInContext("scheduleAutoAttendanceAlarm()", sandbox);

  expect(alarms.created[0].schedule.when).toBe(now + 3 * 60_000);
});

test("automatic check-in starts promptly when today has no result", async () => {
  const now = Date.parse("2026-11-12T16:09:00.000Z");
  const { sandbox, alarms } = createAttendanceSandbox({ now });

  await vm.runInContext("scheduleAutoAttendanceAlarm()", sandbox);

  expect(alarms.created[0].schedule.when).toBe(now + 60_000);
});

test("automatic check-in uses the configured mode and records success once per day", async () => {
  const { sandbox, storage, messages } = createAttendanceSandbox({
    now: Date.parse("2026-11-13T00:10:00.000Z"),
    mode: "fixed",
  });

  await vm.runInContext("runAutoAttendance()", sandbox);
  await vm.runInContext("runAutoAttendance()", sandbox);

  expect(messages).toEqual([{
    tabId: 2,
    message: { type: "attendance:perform", payload: { mode: "fixed", dateKey: "2026-11-13" } }
  }]);
  expect(storage.nshAutoAttendanceState.status).toBe("success");
  expect(storage.nshAttendanceReminder.gain).toBe(5);
});

test("automatic check-in stays inactive until enabled", async () => {
  let requestCount = 0;
  const { sandbox } = createAttendanceSandbox({
    enabled: false,
    sendMessage: async () => { requestCount += 1; return { ok: true, result: { gain: 5 } }; }
  });

  await vm.runInContext("runAutoAttendance()", sandbox);
  expect(requestCount).toBe(0);
});

test("page-context check-in uses the site's same-origin board and attendance requests", async () => {
  const contentSource = fs.readFileSync(path.resolve(__dirname, "../../src/content/auto-attendance.js"), "utf8");
  const pageSource = fs.readFileSync(path.resolve(__dirname, "../../src/main-world/auto-attendance.js"), "utf8");
  const requests = [];
  const eventListeners = new Map();
  let messageListener;
  const window = {
    addEventListener(type, callback) {
      eventListeners.set(type, [...(eventListeners.get(type) || []), callback]);
    },
    removeEventListener(type, callback) {
      eventListeners.set(type, (eventListeners.get(type) || []).filter((item) => item !== callback));
    },
    dispatchEvent(event) {
      (eventListeners.get(event.type) || []).forEach((callback) => callback(event));
    },
    setTimeout,
    clearTimeout
  };
  class MockCustomEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
  }
  const sandbox = vm.createContext({
    chrome: { runtime: { onMessage: { addListener(callback) { messageListener = callback; } } } },
    window,
    CustomEvent: MockCustomEvent,
    fetch: async (url, options = {}) => {
      requests.push({ url, method: options.method || "GET" });
      return options.method
        ? { ok: true, json: async () => ({ success: true, gain: 3 }) }
        : { ok: true, json: async () => ({ record: null }) };
    },
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [Date.parse("2026-11-13T00:10:00.000Z")])); }
      static now() { return Date.parse("2026-11-13T00:10:00.000Z"); }
    },
    Intl,
    Number,
    String
  });
  vm.runInContext(pageSource, sandbox);
  vm.runInContext(contentSource, sandbox);

  const response = await new Promise((resolve) => {
    messageListener({ type: "attendance:perform", payload: { mode: "random", dateKey: "2026-11-13" } }, {}, resolve);
  });

  expect(response).toEqual({ ok: true, result: { gain: 3, alreadySigned: false } });
  expect(requests).toEqual([
    { url: "/api/attendance/board?page=1", method: "GET" },
    { url: "/api/attendance?random=true", method: "POST" }
  ]);
});

test("page-context check-in skips the POST when today's record already exists", async () => {
  const contentSource = fs.readFileSync(path.resolve(__dirname, "../../src/content/auto-attendance.js"), "utf8");
  const pageSource = fs.readFileSync(path.resolve(__dirname, "../../src/main-world/auto-attendance.js"), "utf8");
  const requests = [];
  const eventListeners = new Map();
  let messageListener;
  const window = {
    addEventListener(type, callback) {
      eventListeners.set(type, [...(eventListeners.get(type) || []), callback]);
    },
    removeEventListener(type, callback) {
      eventListeners.set(type, (eventListeners.get(type) || []).filter((item) => item !== callback));
    },
    dispatchEvent(event) {
      (eventListeners.get(event.type) || []).forEach((callback) => callback(event));
    },
    setTimeout,
    clearTimeout
  };
  class MockCustomEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
  }
  const sandbox = vm.createContext({
    chrome: { runtime: { onMessage: { addListener(callback) { messageListener = callback; } } } },
    window,
    CustomEvent: MockCustomEvent,
    fetch: async (url, options = {}) => {
      requests.push({ url, method: options.method || "GET" });
      return { ok: true, json: async () => ({ record: { gain: 4, created_at: "2026-11-13T00:01:00.000Z" } }) };
    },
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [Date.parse("2026-11-13T00:10:00.000Z")])); }
      static now() { return Date.parse("2026-11-13T00:10:00.000Z"); }
    },
    Intl,
    Number,
    String
  });
  vm.runInContext(pageSource, sandbox);
  vm.runInContext(contentSource, sandbox);

  const response = await new Promise((resolve) => {
    messageListener({ type: "attendance:perform", payload: { mode: "random", dateKey: "2026-11-13" } }, {}, resolve);
  });

  expect(response).toEqual({ ok: true, result: { gain: 4, alreadySigned: true } });
  expect(requests).toEqual([{ url: "/api/attendance/board?page=1", method: "GET" }]);
});
