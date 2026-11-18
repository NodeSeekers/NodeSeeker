const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const indexSource = fs.readFileSync(path.resolve(__dirname, "../../src/content/index.js"), "utf8")
  .replace(/\ninit\(\);\s*$/, "");
const blockFilterSource = fs.readFileSync(path.resolve(__dirname, "../../src/content/block-filter.js"), "utf8");
const postSwitcherSource = fs.readFileSync(path.resolve(__dirname, "../../src/content/post-switcher.js"), "utf8");

function createIndexSandbox() {
  const sandbox = vm.createContext({ Set, Array, String, Boolean });
  vm.runInContext(indexSource, sandbox);
  return sandbox;
}

function createElement(classNames = [], parentElement = null, childNodes = []) {
  const element = {
    nodeType: 1,
    parentElement,
    classList: new Set(classNames),
    childNodes,
    matches(selector) {
      return selector.split(",").some((entry) => {
        const className = entry.trim().slice(1);
        return this.classList.has(className);
      });
    },
    closest(selector) {
      for (let current = this; current; current = current.parentElement) {
        if (current.matches(selector)) return current;
      }
      return null;
    },
    querySelectorAll(selector) {
      const matches = [];
      const visit = (node) => {
        for (const child of node.childNodes || []) {
          if (child.nodeType !== 1) continue;
          if (child.matches(selector)) matches.push(child);
          visit(child);
        }
      };
      visit(this);
      return matches;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }
  };
  childNodes.forEach((child) => { child.parentElement = element; });
  return element;
}

function createBlockFilterItem() {
  const classes = new Set();
  const attributes = new Map();
  const writes = { classAdds: 0, classRemoves: 0, datasetSets: 0, datasetDeletes: 0, ariaSets: 0, ariaRemoves: 0 };
  const item = {
    classList: {
      contains: (name) => classes.has(name),
      add(name) { writes.classAdds += 1; classes.add(name); },
      remove(name) { writes.classRemoves += 1; classes.delete(name); }
    },
    dataset: new Proxy({}, {
      set(target, key, value) { writes.datasetSets += 1; target[key] = value; return true; },
      deleteProperty(target, key) { writes.datasetDeletes += 1; return delete target[key]; }
    }),
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute(name, value) {
      if (name === "aria-hidden") writes.ariaSets += 1;
      attributes.set(name, value);
    },
    removeAttribute(name) {
      if (name === "aria-hidden") writes.ariaRemoves += 1;
      attributes.delete(name);
    }
  };
  return { item, writes };
}

test("feed mutations collect only newly added posts, not every post under the list", () => {
  const sandbox = createIndexSandbox();
  const existingPost = createElement(["post-list-item"]);
  const addedPost = createElement(["post-list-item"]);
  const postList = createElement(["post-list"], null, [existingPost]);
  const record = { target: postList, addedNodes: [addedPost], removedNodes: [] };
  sandbox.records = [record];

  const roots = vm.runInContext("collectContentMutationItems(records)", sandbox);
  expect(roots).toEqual([addedPost]);
  expect(vm.runInContext("isContentOnlyMutationBatch(records)", sandbox)).toBe(true);
});

test("extension-owned DOM additions are ignored by the page mutation observer", () => {
  const sandbox = createIndexSandbox();
  const post = createElement(["post-list-item"]);
  const marker = createElement(["nsh-follow-group-list"]);
  const record = { target: post, addedNodes: [marker], removedNodes: [] };
  sandbox.record = record;

  expect(vm.runInContext("isExtensionOwnedMutation(record)", sandbox)).toBe(true);
});

test("blocked post attributes are written only when the blocked state changes", () => {
  const { item, writes } = createBlockFilterItem();
  const sandbox = vm.createContext({});
  vm.runInContext(blockFilterSource, sandbox);
  sandbox.item = item;

  vm.runInContext("setBlockFilterState(item, true); setBlockFilterState(item, true)", sandbox);
  expect(writes).toEqual({ classAdds: 1, classRemoves: 0, datasetSets: 1, datasetDeletes: 0, ariaSets: 1, ariaRemoves: 0 });

  vm.runInContext("setBlockFilterState(item, false); setBlockFilterState(item, false)", sandbox);
  expect(writes).toEqual({ classAdds: 1, classRemoves: 1, datasetSets: 1, datasetDeletes: 1, ariaSets: 1, ariaRemoves: 1 });
});

test("post switcher storage skips unchanged lists and refreshes only after its interval", async () => {
  let now = 1_000_000;
  const writes = [];
  let posts = [
    { id: "100", url: "https://www.nodeseek.com/post-100-1", title: "测试" },
    { id: "99", url: "https://www.nodeseek.com/post-99-1", title: "下一页" }
  ];
  class MockDate extends Date {
    static now() { return now; }
  }
  const sandbox = vm.createContext({
    Date: MockDate,
    location: { href: "https://www.nodeseek.com/categories/daily" },
    chrome: { storage: { local: { set: async (value) => writes.push(value), remove: async () => {} } } }
  });
  vm.runInContext(postSwitcherSource, sandbox);
  sandbox.collectPostSwitcherPosts = () => posts;

  await vm.runInContext("savePostSwitcherSequence()", sandbox);
  await vm.runInContext("savePostSwitcherSequence()", sandbox);
  expect(writes).toHaveLength(1);

  posts = [...posts, { id: "98", url: "https://www.nodeseek.com/post-98-1", title: "再下一页" }];
  await vm.runInContext("savePostSwitcherSequence()", sandbox);
  expect(writes).toHaveLength(2);

  now += 60 * 60 * 1000;
  await vm.runInContext("savePostSwitcherSequence()", sandbox);
  expect(writes).toHaveLength(3);
});
