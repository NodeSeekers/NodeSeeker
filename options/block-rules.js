const BLOCK_RULE_TYPE_CONFIG = {
  keyword: {
    fieldName: "blockedKeywords",
    itemLabel: "关键词",
    inputPlaceholder: "输入关键词",
    countNode: document.querySelector("#blockedKeywordCount")
  },
  user: {
    fieldName: "blockedUsers",
    itemLabel: "用户",
    inputPlaceholder: "输入用户",
    countNode: document.querySelector("#blockedUserCount")
  }
};

const blockRuleDialog = document.querySelector("#blockRuleDialog");
const blockRuleDialogTitle = document.querySelector("#blockRuleDialogTitle");
const blockRuleDialogBody = document.querySelector("#blockRuleDialogBody");
const cancelBlockRuleDialogButton = document.querySelector("#cancelBlockRuleDialog");
const confirmBlockRuleDialogButton = document.querySelector("#confirmBlockRuleDialog");
const editBlockedKeywordsButton = document.querySelector("#editBlockedKeywords");
const editBlockedUsersButton = document.querySelector("#editBlockedUsers");
let pendingBlockRuleEditor = null;

editBlockedKeywordsButton.addEventListener("click", () => openBlockRuleEditor("keyword"));
editBlockedUsersButton.addEventListener("click", () => openBlockRuleEditor("user"));
cancelBlockRuleDialogButton.addEventListener("click", closeBlockRuleDialog);
confirmBlockRuleDialogButton.addEventListener("click", confirmBlockRuleDialog);
blockRuleDialog.addEventListener("click", (event) => {
  if (event.target === blockRuleDialog) {
    closeBlockRuleDialog();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && confirmDialog.hidden && !blockRuleDialog.hidden) {
    closeBlockRuleDialog();
  }
});

function setBlockRulesEditorValue() {
  closeBlockRuleDialog();
  renderBlockRuleRows();
}

function renderBlockRuleRows() {
  Object.values(BLOCK_RULE_TYPE_CONFIG).forEach((config) => {
    const count = getBlockRuleFormItems(config).length;
    config.countNode.textContent = `${count} 个${config.itemLabel}`;
  });
}

function openBlockRuleEditor(type) {
  const config = BLOCK_RULE_TYPE_CONFIG[type];
  if (!config) {
    return;
  }

  pendingBlockRuleEditor = {
    type,
    items: getBlockRuleFormItems(config)
  };
  blockRuleDialogTitle.textContent = `编辑屏蔽${config.itemLabel}`;
  renderBlockRuleDialogBody();
  blockRuleDialog.hidden = false;
  blockRuleDialogBody.querySelector(".follow-rule-item-input")?.focus();
}

function closeBlockRuleDialog() {
  blockRuleDialog.hidden = true;
  blockRuleDialogBody.replaceChildren();
  pendingBlockRuleEditor = null;
}

function confirmBlockRuleDialog() {
  if (!pendingBlockRuleEditor) {
    return;
  }

  const config = BLOCK_RULE_TYPE_CONFIG[pendingBlockRuleEditor.type];
  const field = getBlockRuleFormField(config);
  const previousValue = getBlockRuleFormItems(config).join("\n");
  const nextValue = pendingBlockRuleEditor.items.join("\n");
  field.value = nextValue;
  closeBlockRuleDialog();
  renderBlockRuleRows();
  if (previousValue !== nextValue) {
    showPendingSaveToast();
  }
}

function renderBlockRuleDialogBody() {
  if (!pendingBlockRuleEditor) {
    return;
  }

  const config = BLOCK_RULE_TYPE_CONFIG[pendingBlockRuleEditor.type];
  const section = document.createElement("div");
  section.className = "follow-rule-items";
  const label = document.createElement("span");
  label.className = "follow-rule-field-label";
  label.textContent = config.itemLabel;

  const addRow = document.createElement("div");
  addRow.className = "follow-rule-add-row";
  const input = document.createElement("input");
  input.className = "follow-rule-item-input";
  input.type = "text";
  input.placeholder = config.inputPlaceholder;
  input.maxLength = 120;
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.textContent = "添加";
  addButton.addEventListener("click", () => addPendingBlockRuleItem(input));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addPendingBlockRuleItem(input);
    }
  });
  addRow.append(input, addButton);

  const itemList = document.createElement("div");
  itemList.className = "follow-rule-items-list";
  if (pendingBlockRuleEditor.items.length === 0) {
    const empty = document.createElement("span");
    empty.className = "follow-rule-items-empty";
    empty.textContent = `暂未添加${config.itemLabel}`;
    itemList.appendChild(empty);
  } else {
    pendingBlockRuleEditor.items.forEach((itemValue) => {
      itemList.appendChild(createBlockRuleItem(config, itemValue));
    });
  }

  section.append(label, addRow, itemList);
  blockRuleDialogBody.replaceChildren(section);
}

function createBlockRuleItem(config, itemValue) {
  const item = document.createElement("span");
  item.className = "follow-rule-item";
  const text = document.createElement("span");
  text.textContent = itemValue;
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "follow-rule-remove-item";
  removeButton.textContent = "×";
  removeButton.title = `删除${config.itemLabel} ${itemValue}`;
  removeButton.setAttribute("aria-label", removeButton.title);
  removeButton.addEventListener("click", () => confirmPendingBlockRuleItemRemoval(itemValue));
  item.append(text, removeButton);
  return item;
}

function addPendingBlockRuleItem(input) {
  if (!pendingBlockRuleEditor) {
    return;
  }

  const config = BLOCK_RULE_TYPE_CONFIG[pendingBlockRuleEditor.type];
  const value = normalizeBlockFilterList([input.value])[0] || "";
  if (!value) {
    input.focus();
    return;
  }
  if (pendingBlockRuleEditor.items.includes(value)) {
    showToast(`${config.itemLabel}已存在`, "error");
    input.focus();
    return;
  }

  pendingBlockRuleEditor.items.push(value);
  renderBlockRuleDialogBody();
  blockRuleDialogBody.querySelector(".follow-rule-item-input")?.focus();
}

function confirmPendingBlockRuleItemRemoval(itemValue) {
  if (!pendingBlockRuleEditor) {
    return;
  }

  const config = BLOCK_RULE_TYPE_CONFIG[pendingBlockRuleEditor.type];
  openConfirmDialog({
    title: `删除屏蔽${config.itemLabel}`,
    message: `确定删除「${itemValue}」吗？`,
    confirmText: "删除",
    danger: true
  }, () => removePendingBlockRuleItem(itemValue));
}

function removePendingBlockRuleItem(itemValue) {
  if (!pendingBlockRuleEditor) {
    return;
  }

  pendingBlockRuleEditor.items = pendingBlockRuleEditor.items
    .filter((item) => item !== itemValue);
  renderBlockRuleDialogBody();
}

function getBlockRuleFormItems(config) {
  return normalizeBlockFilterList(getBlockRuleFormField(config).value);
}

function getBlockRuleFormField(config) {
  return form.elements.namedItem(config.fieldName);
}
