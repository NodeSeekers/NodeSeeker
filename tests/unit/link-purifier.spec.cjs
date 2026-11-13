const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/content/link-purifier.js"), "utf8");
const sandbox = vm.createContext({
  URL,
  Set,
  WeakSet,
  location: { href: "https://www.nodeseek.com/post-123-1", origin: "https://www.nodeseek.com" },
  featureOptions: { linkPurifierEnabled: true }
});
vm.runInContext(source, sandbox);

test("NodeSeek jump links unwrap to safe external URLs", () => {
  const target = "https://example.org/path?utm_source=forum&keep=yes";
  const jump = `/jump?to=${encodeURIComponent(target)}`;
  const direct = vm.runInContext(`unwrapNodeSeekJumpUrl(${JSON.stringify(jump)})`, sandbox);
  const clean = vm.runInContext(`sanitizeExternalUrl(${JSON.stringify(direct)})`, sandbox);
  expect(clean).toBe("https://example.org/path?keep=yes");
});

test("link purifier keeps internal URLs and rejects unsafe schemes", () => {
  expect(vm.runInContext('sanitizeExternalUrl("/post-123-1")', sandbox)).toBe("");
  expect(vm.runInContext('sanitizeExternalUrl("javascript:alert(1)")', sandbox)).toBe("");
});
