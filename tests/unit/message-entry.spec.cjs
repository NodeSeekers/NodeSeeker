const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/content/message-entry.js"), "utf8");

function loadHelpers() {
  const sandbox = vm.createContext({ URL, location: { origin: "https://www.nodeseek.com" } });
  vm.runInContext(source, sandbox);
  return sandbox;
}

function buildMessageUrl(entry) {
  return vm.runInContext(`buildNotificationMessageUrl(${JSON.stringify(entry)})`, loadHelpers());
}

function buildPostUrl(entry) {
  return vm.runInContext(`buildNotificationPostUrl(${JSON.stringify(entry)})`, loadHelpers());
}

test("message preview opens the sender's direct conversation", () => {
  expect(buildMessageUrl({ sender_id: 12345 })).toBe("/notification#/message?mode=talk&to=12345");
});

test("message preview falls back to the message list without a user ID", () => {
  expect(buildMessageUrl({})).toBe("/notification#/message?mode=list");
});

test("private message preview keeps incoming messages and hides messages sent by the current user", () => {
  const entries = [
    { id: "incoming", sender_id: "222", receiver_id: "777" },
    { id: "outgoing", sender_id: "777", receiver_id: "222" },
    { id: "self", sender_id: "777", receiver_id: "777" }
  ];
  const sandbox = loadHelpers();
  const visibleIds = vm.runInContext(
    `filterIncomingNotificationMessages(${JSON.stringify(entries)}, "777").map((entry) => entry.id)`,
    sandbox
  );

  expect(Array.from(visibleIds)).toEqual(["incoming"]);
});

test("private message preview reads the current user ID from the sidebar profile link", () => {
  const sandbox = vm.createContext({
    URL,
    location: { origin: "https://www.nodeseek.com" },
    document: {
      querySelector: (selector) => selector === "#nsk-right-panel-container .user-card:not(.hover-user-card) a[href^='/space/']"
        ? { getAttribute: () => "/space/777" }
        : null
    }
  });
  vm.runInContext(source, sandbox);

  expect(vm.runInContext("getNotificationPreviewCurrentUserId()", sandbox)).toBe("777");
});

test("reply preview opens the page containing its target floor", () => {
  expect(buildPostUrl({ post_id: 9876, comment_id: 456, floor_id: 15 }))
    .toBe("https://www.nodeseek.com/post-9876-2?nshComment=456&nshFloor=15");
});

test("mention preview keeps first-page floors on the first comment page", () => {
  expect(buildPostUrl({ post_id: 9876, comment_id: 123, floor_id: 9 }))
    .toBe("https://www.nodeseek.com/post-9876-1?nshComment=123&nshFloor=9");
});

test("mention preview uses NodeSeek's at-me mark-all endpoint and refreshes the unread counter", async () => {
  let capturedRequest;
  const button = {
    disabled: false,
    textContent: "提及全部已读",
    title: "",
    classList: { add() {}, remove() {} }
  };
  const sandbox = vm.createContext({
    URL,
    location: { origin: "https://www.nodeseek.com" },
    testButton: button,
    fetch: async (url, options) => {
      capturedRequest = { url, options };
      return { ok: true, json: async () => ({ success: true }) };
    }
  });
  vm.runInContext(source, sandbox);
  vm.runInContext("refreshMessageEntryCounts = async () => {}", sandbox);
  await vm.runInContext('markAllNotificationsRead({key:"at",label:"提及"},testButton)', sandbox);

  expect(capturedRequest.url).toBe("/api/notification/at-me/markViewed?all=true");
  expect(capturedRequest.options.method).toBe("POST");
  expect(capturedRequest.options.body).toBeUndefined();
  expect(button.disabled).toBe(true);
  expect(button.textContent).toBe("提及已读");
});

test("reply preview uses NodeSeek's reply mark-all endpoint", () => {
  const sandbox = loadHelpers();
  expect(vm.runInContext('getNotificationMarkAllUrl("reply")', sandbox))
    .toBe("/api/notification/reply-to-me/markViewed?all=true");
});

test("opening an unread mention uses NodeSeek's single-item mark-read request", () => {
  const sandbox = loadHelpers();
  expect(vm.runInContext('getNotificationMarkReadRequest("at", {id: 41})', sandbox))
    .toEqual({ url: "/api/notification/at-me/markViewed", body: { atMe: [41] } });
});

test("opening an unread reply uses NodeSeek's single-item mark-read request", () => {
  const sandbox = loadHelpers();
  expect(vm.runInContext('getNotificationMarkReadRequest("reply", {id: 42})', sandbox))
    .toEqual({ url: "/api/notification/reply-to-me/markViewed", body: { replys: [42] } });
});

for (const { key, id, url, body } of [
  { key: "at", id: 51, url: "/api/notification/at-me/markViewed", body: { atMe: [51] } },
  { key: "reply", id: 52, url: "/api/notification/reply-to-me/markViewed", body: { replys: [52] } }
]) {
  test(`opening an unread ${key} sends the mark-read request and updates local state`, async () => {
    let capturedRequest;
    const entry = { id, viewed: 0 };
    const sandbox = vm.createContext({
      URL,
      location: { origin: "https://www.nodeseek.com" },
      testEntry: entry,
      fetch: async (requestUrl, options) => {
        capturedRequest = { url: requestUrl, options };
        return { ok: true, json: async () => ({ success: true }) };
      }
    });
    vm.runInContext(source, sandbox);
    vm.runInContext("refreshMessageEntryCounts = async () => {}", sandbox);
    const marked = await vm.runInContext(`markNotificationPreviewEntryRead("${key}", testEntry)`, sandbox);

    expect(marked).toBe(true);
    expect(capturedRequest.url).toBe(url);
    expect(capturedRequest.options.method).toBe("POST");
    expect(JSON.parse(capturedRequest.options.body)).toEqual(body);
    expect(entry.viewed).toBe(1);
  });
}

test("reply bulk mark-read updates cached rows after the official endpoint succeeds", async () => {
  let capturedUrl;
  const button = {
    disabled: false,
    textContent: "回复全部已读",
    title: "",
    classList: { add() {}, remove() {} }
  };
  const sandbox = vm.createContext({
    URL,
    location: { origin: "https://www.nodeseek.com" },
    testButton: button,
    fetch: async (url) => {
      capturedUrl = url;
      return { ok: true, json: async () => ({ success: true }) };
    }
  });
  vm.runInContext(source, sandbox);
  vm.runInContext('notificationPreviewCache.set("reply", {loadedAt:Date.now(),entries:[{viewed:0}]})', sandbox);
  vm.runInContext("refreshMessageEntryCounts = async () => {}", sandbox);
  await vm.runInContext('markAllNotificationsRead({key:"reply",label:"回复"},testButton)', sandbox);

  expect(capturedUrl).toBe("/api/notification/reply-to-me/markViewed?all=true");
  expect(button.textContent).toBe("回复已读");
  expect(vm.runInContext('notificationPreviewCache.get("reply").entries[0].viewed', sandbox)).toBe(1);
});

test("private message bulk mark-read uses the official endpoint and updates cached rows", async () => {
  let capturedRequest;
  const button = {
    disabled: false,
    textContent: "私信全部已读",
    title: "",
    classList: { add() {}, remove() {} }
  };
  const sandbox = vm.createContext({
    URL,
    location: { origin: "https://www.nodeseek.com" },
    testButton: button,
    fetch: async (url, options) => {
      capturedRequest = { url, options };
      return { ok: true, json: async () => ({ success: true }) };
    }
  });
  vm.runInContext(source, sandbox);
  vm.runInContext('notificationPreviewCache.set("message", {loadedAt:Date.now(),entries:[{viewed:0}]})', sandbox);
  vm.runInContext("updateNotificationPreviewReadState = () => {}; refreshMessageEntryCounts = async () => {}", sandbox);
  await vm.runInContext('markAllNotificationsRead({key:"message",label:"私信"},testButton)', sandbox);

  expect(capturedRequest.url).toBe("/api/notification/message/markViewed?all=true");
  expect(capturedRequest.options.method).toBe("POST");
  expect(button.textContent).toBe("私信已读");
  expect(vm.runInContext('notificationPreviewCache.get("message").entries[0].viewed', sandbox)).toBe(1);
});
