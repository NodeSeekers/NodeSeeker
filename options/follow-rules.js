const FOLLOW_RULE_TYPE_CONFIG = {
  keyword: {
    collectionKey: "keywordGroups",
    groupLabel: "标记关键词组",
    itemLabel: "关键词",
    itemPlaceholder: "输入关键词"
  },
  user: {
    collectionKey: "userGroups",
    groupLabel: "标记用户组",
    itemLabel: "用户名",
    itemPlaceholder: "输入用户名"
  }
};
const FOLLOW_RULE_STYLE_COLOR_DEFAULTS = {
  groupNameColor: "#8250df",
  titleColor: "#0969da",
  keywordColor: "#d73a7f",
  usernameColor: "#bc4c00",
  borderColor: "#8250df",
  backgroundColor: "#fff8c5"
};
const FOLLOW_RULE_STYLE_DEFINITIONS = [
  { key: "showGroupName", label: "显示组名", groupName: true },
  { key: "titleColor", label: "标题颜色" },
  { key: "keywordColor", label: "关键词颜色" },
  { key: "usernameColor", label: "用户名颜色" },
  { key: "borderColor", label: "边框颜色" },
  { key: "backgroundColor", label: "背景颜色" }
];
const FOLLOW_RULE_AVATAR_EFFECT_OPTIONS = [
  { value: "none", label: "关闭" },
  { value: "rainbow", label: "彩色流光" },
  { value: "particles", label: "粒子环绕" },
  { value: "snake", label: "贪食蛇" },
  { value: "cosmos", label: "日月星河" }
];
const FOLLOW_RULE_AVATAR_EFFECT_LAYER_COUNTS = {
  none: 0,
  rainbow: 2,
  particles: 6,
  snake: 3,
  cosmos: 2
};

const followKeywordGroupsNode = document.querySelector("#followKeywordGroups");
const followUserGroupsNode = document.querySelector("#followUserGroups");
const addFollowKeywordGroupButton = document.querySelector("#addFollowKeywordGroup");
const addFollowUserGroupButton = document.querySelector("#addFollowUserGroup");
const followRuleDialog = document.querySelector("#followRuleDialog");
const followRuleDialogTitle = document.querySelector("#followRuleDialogTitle");
const followRuleDialogBody = document.querySelector("#followRuleDialogBody");
const cancelFollowRuleDialogButton = document.querySelector("#cancelFollowRuleDialog");
const confirmFollowRuleDialogButton = document.querySelector("#confirmFollowRuleDialog");
const followRuleStyleDialog = document.querySelector("#followRuleStyleDialog");
const followRuleStyleDialogTitle = document.querySelector("#followRuleStyleDialogTitle");
const followRuleStyleDialogBody = document.querySelector("#followRuleStyleDialogBody");
const cancelFollowRuleStyleDialogButton = document.querySelector("#cancelFollowRuleStyleDialog");
const confirmFollowRuleStyleDialogButton = document.querySelector("#confirmFollowRuleStyleDialog");
let followRulesDraft = {
  keywordGroups: [],
  userGroups: []
};
let pendingFollowRuleEditor = null;
let pendingFollowRuleStyleEditor = null;

addFollowKeywordGroupButton.addEventListener("click", () => openFollowRuleEditor("keyword"));
addFollowUserGroupButton.addEventListener("click", () => openFollowRuleEditor("user"));
cancelFollowRuleDialogButton.addEventListener("click", closeFollowRuleDialog);
confirmFollowRuleDialogButton.addEventListener("click", confirmFollowRuleDialog);
cancelFollowRuleStyleDialogButton.addEventListener("click", closeFollowRuleStyleDialog);
confirmFollowRuleStyleDialogButton.addEventListener("click", confirmFollowRuleStyleDialog);
followRuleDialog.addEventListener("click", (event) => {
  if (event.target === followRuleDialog) {
    closeFollowRuleDialog();
  }
});
followRuleStyleDialog.addEventListener("click", (event) => {
  if (event.target === followRuleStyleDialog) {
    closeFollowRuleStyleDialog();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !confirmDialog.hidden) {
    return;
  }
  if (!followRuleStyleDialog.hidden) {
    closeFollowRuleStyleDialog();
    return;
  }
  if (!followRuleDialog.hidden) {
    closeFollowRuleDialog();
  }
});

function normalizeFollowRules(value) {
  const source = isFollowRuleObject(value) ? value : {};
  const usedIds = new Set();
  const keywordGroups = normalizeFollowRuleGroups(source.keywordGroups, "keyword", usedIds);
  const userGroups = normalizeFollowRuleGroups(source.userGroups, "user", usedIds);
  return {
    keywordGroups: removeDuplicateFollowRuleItems(keywordGroups, "keyword"),
    userGroups
  };
}

function normalizeFollowRuleGroups(value, type, usedIds) {
  if (!Array.isArray(value)) {
    return [];
  }

  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  return value
    .filter(isFollowRuleObject)
    .map((group, index) => {
      const fallbackId = `${type}-${index + 1}`;
      const baseId = normalizeFollowRuleText(group.id) || fallbackId;
      const normalizedGroup = {
        id: createUniqueFollowRuleId(baseId, usedIds),
        name: normalizeFollowRuleText(group.name) || `${config.groupLabel} ${index + 1}`,
        enabled: group.enabled !== false,
        styles: normalizeFollowRuleStyles(group.styles, type)
      };
      if (type === "keyword") {
        normalizedGroup.rules = normalizeFollowRuleKeywordRules(group, normalizedGroup.id, usedIds);
      } else {
        normalizedGroup.items = normalizeFollowRuleItems(group.items);
      }
      return normalizedGroup;
    });
}

function normalizeFollowRuleKeywordRules(group, groupId, usedIds) {
  const legacyTerms = normalizeFollowRuleItems(group.items);
  const legacyExclusions = normalizeFollowRuleItems(group.excludeItems);
  const savedRules = Array.isArray(group.rules)
    ? group.rules
    : (legacyTerms.length > 0 || legacyExclusions.length > 0
      ? [{ id: `${groupId}-rule-1`, terms: legacyTerms, mode: group.mode, excludeTerms: legacyExclusions }]
      : []);

  return savedRules.filter(isFollowRuleObject).map((rule, index) => {
    const terms = normalizeFollowRuleItems(rule.terms);
    if (terms.length === 0) return null;
    const baseId = normalizeFollowRuleText(rule.id) || `${groupId}-rule-${index + 1}`;
    return {
      id: createUniqueFollowRuleId(baseId, usedIds),
      enabled: rule.enabled !== false,
      mode: normalizeFollowRuleMatchMode(rule.mode, terms.length),
      terms,
      excludeTerms: normalizeFollowRuleItems(rule.excludeTerms)
    };
  }).filter(Boolean);
}

function normalizeFollowRuleMatchMode(value, itemCount = 0) {
  if (value === "any" || value === "all") {
    return value;
  }
  return itemCount > 1 ? "all" : "any";
}

function normalizeFollowRuleStyles(value, type = "") {
  const styles = isFollowRuleObject(value) ? value : {};
  const normalized = {
    showGroupName: styles.showGroupName === true,
    avatarEffect: type === "user"
      ? normalizeFollowRuleAvatarEffect(styles.avatarEffect)
      : "none"
  };

  Object.entries(FOLLOW_RULE_STYLE_COLOR_DEFAULTS).forEach(([key, defaultColor]) => {
    const option = isFollowRuleObject(styles[key]) ? styles[key] : {};
    normalized[key] = {
      enabled: option.enabled === true,
      color: normalizeFollowRuleColor(option.color, defaultColor)
    };
  });
  normalized.groupNameColor.enabled = normalized.showGroupName;

  return normalized;
}

function normalizeFollowRuleAvatarEffect(value) {
  const savedEffect = String(value || "").trim();
  const effect = savedEffect === "comet" ? "snake" : savedEffect;
  return FOLLOW_RULE_AVATAR_EFFECT_OPTIONS.some((option) => option.value === effect)
    ? effect
    : "none";
}

function normalizeFollowRuleItems(value) {
  const entries = Array.isArray(value)
    ? value
    : String(value || "").split(/\r?\n/);

  return [...new Set(entries.map(normalizeFollowRuleText).filter(Boolean))];
}

function removeDuplicateFollowRuleItems(groups, type) {
  if (type === "keyword") return groups;
  const seen = new Set();
  return groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const identity = getFollowRuleItemIdentity(type, item);
      if (seen.has(identity)) {
        return false;
      }
      seen.add(identity);
      return true;
    })
  }));
}

function getFollowRuleItemIdentity(type, value) {
  const normalized = normalizeFollowRuleText(value);
  return type === "keyword" ? normalized.toLocaleLowerCase() : normalized;
}

function normalizeFollowRuleText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeFollowRuleColor(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}

function isFollowRuleObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function createUniqueFollowRuleId(baseId, usedIds) {
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

function createFollowRuleId() {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `follow-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createFollowRuleGroup(type) {
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  const groups = followRulesDraft[config.collectionKey];
  return {
    id: createFollowRuleId(),
    name: `${config.groupLabel} ${groups.length + 1}`,
    enabled: true,
    ...(type === "keyword" ? { rules: [] } : { items: [] }),
    styles: normalizeFollowRuleStyles({
      showGroupName: true,
      avatarEffect: type === "user" ? "rainbow" : "none",
      groupNameColor: {
        enabled: true,
        color: FOLLOW_RULE_STYLE_COLOR_DEFAULTS.groupNameColor
      }
    }, type)
  };
}

function cloneFollowRuleGroup(type, group) {
  return {
    id: group.id,
    name: group.name,
    enabled: group.enabled !== false,
    ...(type === "keyword"
      ? { rules: group.rules.map((rule) => ({ ...rule, terms: [...rule.terms], excludeTerms: [...rule.excludeTerms] })) }
      : { items: [...group.items] }),
    styles: normalizeFollowRuleStyles(group.styles, type)
  };
}

function setFollowRulesEditorValue(value) {
  closeFollowRuleDialog();
  closeFollowRuleStyleDialog();
  followRulesDraft = normalizeFollowRules(value);
  renderFollowRuleEditor();
}

function readFollowRulesFromForm() {
  ["keywordGroups", "userGroups"].forEach((collectionKey) => {
    followRulesDraft[collectionKey].forEach((group) => {
      group.name = normalizeFollowRuleText(group.name);
      if (!group.name) {
        throw new Error("标记规则组名称不能为空");
      }
    });
  });

  return normalizeFollowRules(followRulesDraft);
}

function renderFollowRuleEditor() {
  renderFollowRuleGroups("keyword");
  renderFollowRuleGroups("user");
}

function renderFollowRuleGroups(type) {
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  const groups = followRulesDraft[config.collectionKey];
  const list = getFollowRuleListNode(type);
  list.replaceChildren();

  if (groups.length === 0) {
    const empty = document.createElement("p");
    empty.className = "follow-rule-empty";
    empty.textContent = `暂无${config.groupLabel}`;
    list.appendChild(empty);
    return;
  }

  groups.forEach((group) => list.appendChild(createFollowRuleRow(type, group)));
}

function createFollowRuleRow(type, group) {
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  const row = document.createElement("article");
  row.className = "follow-rule-row";
  row.classList.toggle("is-disabled", group.enabled === false);
  row.dataset.followRuleGroupId = group.id;

  const summary = document.createElement("div");
  summary.className = "follow-rule-row-summary";
  const name = document.createElement("strong");
  name.className = "follow-rule-row-name";
  name.textContent = group.name;
  const count = document.createElement("span");
  count.className = "follow-rule-row-count";
  count.textContent = type === "keyword"
    ? `${group.rules.length} 条规则`
    : `${group.items.length} 个${config.itemLabel}`;
  summary.append(name, count);
  if (group.enabled === false) {
    const status = document.createElement("span");
    status.className = "follow-rule-row-status";
    status.textContent = "已禁用";
    summary.appendChild(status);
  }

  const actions = document.createElement("div");
  actions.className = "follow-rule-row-actions";
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "编辑";
  editButton.addEventListener("click", () => openFollowRuleEditor(type, group.id));
  const styleButton = document.createElement("button");
  styleButton.type = "button";
  styleButton.textContent = "样式";
  styleButton.addEventListener("click", () => openFollowRuleStyleEditor(type, group.id));
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "follow-rule-delete-group";
  deleteButton.textContent = "删除";
  deleteButton.addEventListener("click", () => confirmFollowRuleGroupRemoval(type, group.id));
  actions.append(editButton, styleButton, deleteButton);

  row.append(summary, actions);
  return row;
}

function getFollowRuleListNode(type) {
  return type === "user" ? followUserGroupsNode : followKeywordGroupsNode;
}

function getFollowRuleGroup(type, groupId) {
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  return followRulesDraft[config.collectionKey].find((group) => group.id === groupId) || null;
}

function removeFollowRuleGroup(type, groupId) {
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  followRulesDraft[config.collectionKey] = followRulesDraft[config.collectionKey]
    .filter((group) => group.id !== groupId);
  renderFollowRuleGroups(type);
  showPendingSaveToast();
}

function confirmFollowRuleGroupRemoval(type, groupId) {
  const group = getFollowRuleGroup(type, groupId);
  if (!group) {
    return;
  }

  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  openConfirmDialog({
    title: `删除${config.groupLabel}`,
    message: `确定删除「${group.name}」吗？`,
    confirmText: "删除",
    danger: true
  }, () => removeFollowRuleGroup(type, groupId));
}

function openFollowRuleEditor(type, groupId = "") {
  const source = groupId ? getFollowRuleGroup(type, groupId) : createFollowRuleGroup(type);
  if (!source) {
    return;
  }

  pendingFollowRuleEditor = {
    type,
    groupId,
    ruleMode: "all",
    editingRuleId: "",
    group: cloneFollowRuleGroup(type, source)
  };
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  followRuleDialogTitle.textContent = `${groupId ? "编辑" : "新建"}${config.groupLabel}`;
  renderFollowRuleDialogBody();
  followRuleDialog.hidden = false;
  followRuleDialogBody.querySelector(".follow-rule-name-input")?.focus();
}

function closeFollowRuleDialog() {
  followRuleDialog.hidden = true;
  followRuleDialogBody.replaceChildren();
  pendingFollowRuleEditor = null;
}

function confirmFollowRuleDialog() {
  if (!pendingFollowRuleEditor) {
    return;
  }

  const { type, groupId, group } = pendingFollowRuleEditor;
  group.name = normalizeFollowRuleText(group.name);
  if (!group.name) {
    showToast("标记规则组名称不能为空", "error");
    followRuleDialogBody.querySelector(".follow-rule-name-input")?.focus();
    return;
  }

  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  const normalizedGroup = normalizeFollowRuleGroups([group], type, new Set())[0];
  const groups = followRulesDraft[config.collectionKey];
  let changed = !groupId;
  if (groupId) {
    const index = groups.findIndex((entry) => entry.id === groupId);
    if (index >= 0) {
      changed = JSON.stringify(groups[index]) !== JSON.stringify(normalizedGroup);
      groups[index] = normalizedGroup;
    }
  } else {
    groups.push(normalizedGroup);
  }

  closeFollowRuleDialog();
  renderFollowRuleGroups(type);
  if (changed) {
    showPendingSaveToast();
  }
}

function openFollowRuleStyleEditor(type, groupId) {
  const group = getFollowRuleGroup(type, groupId);
  if (!group) {
    return;
  }

  pendingFollowRuleStyleEditor = {
    type,
    groupId,
    styles: normalizeFollowRuleStyles(group.styles, type)
  };
  followRuleStyleDialogTitle.textContent = `${group.name} · 样式`;
  followRuleStyleDialogBody.replaceChildren(
    createFollowRuleStyleEditor(type, pendingFollowRuleStyleEditor.styles)
  );
  followRuleStyleDialog.hidden = false;
}

function closeFollowRuleStyleDialog() {
  followRuleStyleDialog.hidden = true;
  followRuleStyleDialogBody.replaceChildren();
  pendingFollowRuleStyleEditor = null;
}

function confirmFollowRuleStyleDialog() {
  if (!pendingFollowRuleStyleEditor) {
    return;
  }

  const { type, groupId, styles } = pendingFollowRuleStyleEditor;
  const group = getFollowRuleGroup(type, groupId);
  if (group) {
    const normalizedStyles = normalizeFollowRuleStyles(styles, type);
    const changed = JSON.stringify(group.styles) !== JSON.stringify(normalizedStyles);
    group.styles = normalizedStyles;
    if (changed) {
      showPendingSaveToast();
    }
  }
  closeFollowRuleStyleDialog();
}

function renderFollowRuleDialogBody() {
  if (!pendingFollowRuleEditor) {
    return;
  }

  const { type, group } = pendingFollowRuleEditor;
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  followRuleDialogBody.replaceChildren();

  const nameLabel = document.createElement("label");
  const nameText = document.createElement("span");
  nameText.textContent = "组名称";
  const nameInput = document.createElement("input");
  nameInput.className = "follow-rule-name-input";
  nameInput.type = "text";
  nameInput.value = group.name;
  nameInput.maxLength = 40;
  nameInput.addEventListener("input", () => {
    group.name = nameInput.value;
  });
  nameLabel.append(nameText, nameInput);

  const mainFields = document.createElement("div");
  mainFields.className = `follow-rule-main-fields${pendingFollowRuleEditor.groupId ? "" : " is-new"}`;
  mainFields.appendChild(nameLabel);

  if (pendingFollowRuleEditor.groupId) {
    const statusLabel = document.createElement("label");
    const statusText = document.createElement("span");
    statusText.textContent = "状态";
    const statusSelect = document.createElement("select");
    statusSelect.className = "follow-rule-status-select";
    [
      { value: "enabled", label: "启用" },
      { value: "disabled", label: "禁用" }
    ].forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.value;
      option.textContent = entry.label;
      statusSelect.appendChild(option);
    });
    statusSelect.value = group.enabled === false ? "disabled" : "enabled";
    statusSelect.addEventListener("change", () => {
      group.enabled = statusSelect.value === "enabled";
    });
    statusLabel.append(statusText, statusSelect);
    mainFields.appendChild(statusLabel);
  }

  followRuleDialogBody.appendChild(mainFields);
  if (type === "keyword") {
    followRuleDialogBody.appendChild(createFollowRuleKeywordEditor(group));
  } else if (pendingFollowRuleEditor.groupId) {
    followRuleDialogBody.appendChild(createFollowRuleItemEditor(group, config));
  }
}

function createFollowRuleMatchModeSelect(value, onChange) {
  const select = document.createElement("select");
  select.className = "follow-rule-match-mode-select";
  select.setAttribute("aria-label", "关键词匹配方式");
  [
    { value: "any", label: "任一关键词命中" },
    { value: "all", label: "全部关键词同时命中" }
  ].forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.value;
    option.textContent = entry.label;
    select.appendChild(option);
  });
  select.value = value;
  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function createFollowRuleKeywordEditor(group) {
  const section = document.createElement("div");
  section.className = "follow-rule-keyword-editor";
  const heading = document.createElement("div");
  heading.className = "follow-rule-keyword-heading";
  const title = document.createElement("span");
  title.className = "follow-rule-field-label";
  title.textContent = "关键词";
  const hint = document.createElement("small");
  hint.textContent = "每次添加生成一条独立规则；组内任一规则命中即可。";
  heading.append(title, hint);

  const entry = document.createElement("div");
  entry.className = "follow-rule-keyword-entry";
  const keywordInput = createFollowRuleKeywordInput("items", "命中词，例如：台湾, 家宽");
  const excludeInput = createFollowRuleKeywordInput("excludeItems", "排除词，例如：已出, 求购");
  const editingRule = group.rules.find((rule) => rule.id === pendingFollowRuleEditor.editingRuleId);
  if (editingRule) {
    keywordInput.value = editingRule.terms.join(", ");
    excludeInput.value = editingRule.excludeTerms.join(", ");
    pendingFollowRuleEditor.ruleMode = editingRule.mode;
  }
  const matchMode = createFollowRuleMatchModeSelect(editingRule?.mode || pendingFollowRuleEditor.ruleMode, (value) => {
    pendingFollowRuleEditor.ruleMode = value;
  });
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.textContent = editingRule ? "修改" : "添加";
  addButton.title = editingRule ? "保存对这条规则的修改" : "将命中词和排除词作为一条独立规则添加";
  addButton.addEventListener("click", addPendingFollowRuleItems);
  [keywordInput, excludeInput].forEach((input) => input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addPendingFollowRuleItems();
    }
  }));
  entry.append(keywordInput, excludeInput, matchMode, addButton);

  section.append(heading, entry, createFollowRuleKeywordRuleList(group));
  return section;
}

function createFollowRuleKeywordRuleList(group) {
  const list = document.createElement("ul");
  list.className = "telegram-keyword-rule-list";
  group.rules.forEach((rule) => list.appendChild(createFollowRuleKeywordRuleCard(rule)));
  if (group.rules.length === 0) {
    const empty = document.createElement("li");
    empty.className = "config-description telegram-keyword-empty";
    empty.textContent = "暂无规则。添加规则后，可单独启用或暂停。";
    list.appendChild(empty);
  }
  return list;
}

function createFollowRuleKeywordRuleCard(rule) {
  const item = document.createElement("li");
  item.className = `telegram-keyword-rule is-editable${rule.enabled ? " is-enabled" : " is-disabled"}${rule.excludeTerms.length ? " has-exclusions" : ""}${rule.id === pendingFollowRuleEditor.editingRuleId ? " is-editing" : ""}`;
  item.dataset.followRuleKeywordRuleId = rule.id;
  item.title = "点击卡片编辑规则";
  item.addEventListener("click", (event) => {
    if (event.target.closest("button, input, label")) return;
    const current = pendingFollowRuleEditor?.group.rules.find((entry) => entry.id === rule.id);
    if (!current) return;
    pendingFollowRuleEditor.editingRuleId = current.id;
    pendingFollowRuleEditor.ruleMode = current.mode;
    renderFollowRuleDialogBody();
    followRuleDialogBody.querySelector('[data-follow-rule-item-list="items"]')?.focus();
  });

  const enabledLabel = document.createElement("label");
  enabledLabel.className = "telegram-keyword-toggle";
  const enabled = document.createElement("input");
  enabled.type = "checkbox";
  enabled.checked = rule.enabled;
  enabled.setAttribute("aria-label", `启用规则 ${rule.terms.join("、")}`);
  enabled.addEventListener("change", () => {
    const current = pendingFollowRuleEditor?.group.rules.find((entry) => entry.id === rule.id);
    if (!current) return;
    current.enabled = enabled.checked;
    renderFollowRuleDialogBody();
  });
  enabledLabel.append(enabled, document.createTextNode(rule.enabled ? "监控中" : "已暂停"));

  const tags = document.createElement("div");
  tags.className = "telegram-keyword-tags";
  rule.terms.forEach((term, index) => {
    if (index > 0) {
      const joiner = document.createElement("span");
      joiner.className = "telegram-keyword-joiner";
      joiner.textContent = rule.mode === "all" ? "且" : "或";
      tags.appendChild(joiner);
    }
    const tag = document.createElement("span");
    tag.className = "telegram-keyword-tag";
    tag.textContent = term;
    tags.appendChild(tag);
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "telegram-keyword-remove";
  remove.textContent = "删除";
  remove.setAttribute("aria-label", `删除规则 ${rule.terms.join("、")}`);
  remove.addEventListener("click", () => removePendingFollowRuleKeywordRule(rule.id));
  item.append(enabledLabel, tags, remove);

  if (rule.excludeTerms.length > 0) {
    const excludes = document.createElement("div");
    excludes.className = "telegram-keyword-excludes";
    const label = document.createElement("span");
    label.textContent = "排除：";
    excludes.appendChild(label);
    rule.excludeTerms.forEach((term) => {
      const tag = document.createElement("span");
      tag.className = "telegram-keyword-exclude-tag";
      tag.textContent = term;
      excludes.appendChild(tag);
    });
    item.appendChild(excludes);
  }
  return item;
}

function createFollowRuleKeywordInput(listKey, placeholder) {
  const input = document.createElement("input");
  input.className = "follow-rule-item-input";
  input.type = "text";
  input.placeholder = placeholder;
  input.maxLength = 120;
  input.dataset.followRuleItemList = listKey;
  input.setAttribute("aria-label", listKey === "items" ? "命中关键词" : "排除关键词");
  return input;
}

function createFollowRuleKeywordList(values, listKey, labelText) {
  if (!values.length) return null;
  const excluded = listKey === "excludeItems";
  const row = document.createElement("div");
  row.className = `follow-rule-keyword-list${excluded ? " is-excluded" : ""}`;
  const label = document.createElement("span");
  label.textContent = `${labelText}：`;
  const itemList = document.createElement("div");
  itemList.className = "follow-rule-items-list";
  values.forEach((itemValue) => {
    itemList.appendChild(createFollowRuleItemChip(itemValue, listKey, labelText, excluded));
  });
  row.append(label, itemList);
  return row;
}

function createFollowRuleItemChip(itemValue, listKey, labelText, excluded = false) {
  const item = document.createElement("span");
  item.className = `follow-rule-item${excluded ? " is-excluded" : ""}`;
  const text = document.createElement("span");
  text.textContent = itemValue;
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "follow-rule-remove-item";
  removeButton.textContent = "×";
  removeButton.title = `删除${labelText} ${itemValue}`;
  removeButton.setAttribute("aria-label", removeButton.title);
  removeButton.addEventListener("click", () => removePendingFollowRuleItem(itemValue, listKey));
  item.append(text, removeButton);
  return item;
}

function createFollowRuleItemEditor(group, config) {
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
  input.placeholder = config.itemPlaceholder;
  input.maxLength = 120;
  input.dataset.followRuleItemList = "items";
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.textContent = "添加";
  addButton.addEventListener("click", () => addPendingFollowRuleItem(input));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addPendingFollowRuleItem(input);
    }
  });
  addRow.append(input, addButton);
  const itemList = document.createElement("div");
  itemList.className = "follow-rule-items-list";
  if (group.items.length === 0) {
    const empty = document.createElement("span");
    empty.className = "follow-rule-items-empty";
    empty.textContent = `暂未添加${config.itemLabel}`;
    itemList.appendChild(empty);
  } else {
    group.items.forEach((itemValue) => itemList.appendChild(createFollowRuleItemChip(itemValue, "items", config.itemLabel)));
  }
  section.append(label, addRow);
  section.appendChild(itemList);
  return section;
}

function addPendingFollowRuleItem(input) {
  if (!pendingFollowRuleEditor) {
    return;
  }

  const value = normalizeFollowRuleText(input.value);
  if (!value) {
    input.focus();
    return;
  }
  const { type, groupId, group } = pendingFollowRuleEditor;
  const listKey = input.dataset.followRuleItemList || "items";
  const values = group[listKey] || [];
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  const itemLabel = listKey === "excludeItems" ? "排除关键词" : config.itemLabel;
  const identity = getFollowRuleItemIdentity(type, value);
  if (values.some((item) => getFollowRuleItemIdentity(type, item) === identity)) {
    showToast(`${itemLabel}已存在`, "error");
    input.focus();
    return;
  }

  const otherListKey = listKey === "items" ? "excludeItems" : "items";
  if (type === "keyword" && (group[otherListKey] || []).some((item) => getFollowRuleItemIdentity(type, item) === identity)) {
    showToast("同一关键词不能同时作为命中词和排除词", "error");
    input.focus();
    return;
  }

  if (type !== "user" && listKey === "items") {
    const existingGroup = findFollowRuleItemGroup(type, value, groupId);
    if (existingGroup) {
      showToast(`${config.itemLabel}已存在于「${existingGroup.name}」`, "error");
      input.focus();
      return;
    }
  }

  group[listKey].push(value);
  renderFollowRuleDialogBody();
  followRuleDialogBody.querySelector(`[data-follow-rule-item-list="${listKey}"]`)?.focus();
}

function parseFollowRuleEditorItems(value) {
  const seen = new Set();
  return String(value || "").split(/[,，\s]+/)
    .map(normalizeFollowRuleText)
    .filter((item) => {
      if (!item) return false;
      const identity = getFollowRuleItemIdentity("keyword", item);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
}

function addPendingFollowRuleItems() {
  if (!pendingFollowRuleEditor || pendingFollowRuleEditor.type !== "keyword") return;

  const { group } = pendingFollowRuleEditor;
  const editingRule = group.rules.find((rule) => rule.id === pendingFollowRuleEditor.editingRuleId);
  const keywordInput = followRuleDialogBody.querySelector('[data-follow-rule-item-list="items"]');
  const excludeInput = followRuleDialogBody.querySelector('[data-follow-rule-item-list="excludeItems"]');
  const newItems = parseFollowRuleEditorItems(keywordInput?.value);
  const newExcludedItems = parseFollowRuleEditorItems(excludeInput?.value);

  if (newItems.length === 0) {
    keywordInput?.focus();
    return;
  }
  const newExcludedIdentities = new Set(newExcludedItems.map((item) => getFollowRuleItemIdentity("keyword", item)));

  if (newItems.some((item) => newExcludedIdentities.has(getFollowRuleItemIdentity("keyword", item)))) {
    showToast("同一关键词不能同时作为命中词和排除词", "error");
    (newExcludedItems.length > 0 ? excludeInput : keywordInput)?.focus();
    return;
  }

  const newRule = {
    id: editingRule?.id || createFollowRuleId(),
    enabled: editingRule?.enabled ?? true,
    mode: pendingFollowRuleEditor.ruleMode,
    terms: newItems,
    excludeTerms: newExcludedItems
  };
  const ruleIdentity = (rule) => JSON.stringify({
    terms: rule.terms.map((item) => getFollowRuleItemIdentity("keyword", item)),
    mode: rule.mode,
    excludeTerms: rule.excludeTerms.map((item) => getFollowRuleItemIdentity("keyword", item))
  });
  if (group.rules.some((rule) => rule.id !== editingRule?.id && ruleIdentity(rule) === ruleIdentity(newRule))) {
    showToast("相同规则已存在", "error");
    keywordInput?.focus();
    return;
  }

  if (editingRule) {
    Object.assign(editingRule, newRule);
  } else {
    group.rules.push(newRule);
  }
  pendingFollowRuleEditor.editingRuleId = "";
  pendingFollowRuleEditor.ruleMode = "all";
  if (keywordInput) keywordInput.value = "";
  if (excludeInput) excludeInput.value = "";
  renderFollowRuleDialogBody();
  followRuleDialogBody.querySelector('[data-follow-rule-item-list="items"]')?.focus();
}

function findFollowRuleItemGroup(type, value, excludedGroupId = "") {
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  const identity = getFollowRuleItemIdentity(type, value);
  return followRulesDraft[config.collectionKey].find((group) => {
    return group.id !== excludedGroupId
      && group.items.some((item) => getFollowRuleItemIdentity(type, item) === identity);
  }) || null;
}

function removePendingFollowRuleItem(itemValue, listKey = "items") {
  if (!pendingFollowRuleEditor) {
    return;
  }

  pendingFollowRuleEditor.group[listKey] = pendingFollowRuleEditor.group[listKey]
    .filter((item) => item !== itemValue);
  renderFollowRuleDialogBody();
}

function removePendingFollowRuleKeywordRule(ruleId) {
  if (!pendingFollowRuleEditor || pendingFollowRuleEditor.type !== "keyword") return;
  pendingFollowRuleEditor.group.rules = pendingFollowRuleEditor.group.rules
    .filter((rule) => rule.id !== ruleId);
  if (pendingFollowRuleEditor.editingRuleId === ruleId) {
    pendingFollowRuleEditor.editingRuleId = "";
    pendingFollowRuleEditor.ruleMode = "all";
  }
  renderFollowRuleDialogBody();
}

function createFollowRuleStyleEditor(type, styles) {
  const fieldset = document.createElement("fieldset");
  fieldset.className = "follow-rule-style-fieldset";
  fieldset.setAttribute("aria-label", "命中样式");
  const grid = document.createElement("div");
  grid.className = "follow-rule-style-grid";

  FOLLOW_RULE_STYLE_DEFINITIONS.forEach((definition) => {
    const label = document.createElement("label");
    label.className = "follow-rule-style-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const text = document.createElement("span");
    text.textContent = definition.label;
    const color = document.createElement("input");
    color.type = "color";

    if (definition.groupName) {
      checkbox.checked = styles.showGroupName;
      color.value = styles.groupNameColor.color;
      color.disabled = !styles.showGroupName;
      checkbox.addEventListener("change", () => {
        styles.showGroupName = checkbox.checked;
        styles.groupNameColor.enabled = checkbox.checked;
        color.disabled = !checkbox.checked;
      });
      color.addEventListener("input", () => {
        styles.groupNameColor.color = normalizeFollowRuleColor(
          color.value,
          FOLLOW_RULE_STYLE_COLOR_DEFAULTS.groupNameColor
        );
      });
      label.append(checkbox, text, color);
      grid.appendChild(label);
      return;
    }

    const option = styles[definition.key];
    checkbox.checked = option.enabled;
    color.value = option.color;
    color.disabled = !option.enabled;
    checkbox.addEventListener("change", () => {
      option.enabled = checkbox.checked;
      color.disabled = !option.enabled;
    });
    color.addEventListener("input", () => {
      option.color = normalizeFollowRuleColor(color.value, FOLLOW_RULE_STYLE_COLOR_DEFAULTS[definition.key]);
    });
    label.append(checkbox, text, color);
    grid.appendChild(label);
  });

  if (type === "user") {
    grid.appendChild(createFollowRuleAvatarEffectEditor(styles));
  }

  fieldset.appendChild(grid);
  return fieldset;
}

function createFollowRuleAvatarEffectEditor(styles) {
  const editor = document.createElement("div");
  editor.className = "follow-rule-avatar-effect-option";

  const control = document.createElement("label");
  control.className = "follow-rule-avatar-effect-control";
  const text = document.createElement("span");
  text.textContent = "头像特效";
  const select = document.createElement("select");
  FOLLOW_RULE_AVATAR_EFFECT_OPTIONS.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.value;
    option.textContent = entry.label;
    select.appendChild(option);
  });
  select.value = styles.avatarEffect;
  const hint = document.createElement("small");
  hint.textContent = "仅在标记用户命中时展示";
  control.append(text, select, hint);

  const preview = document.createElement("span");
  preview.className = "follow-rule-avatar-preview nsh-avatar-effect-host";
  preview.setAttribute("aria-hidden", "true");
  const face = document.createElement("span");
  face.className = "follow-rule-avatar-preview-face";
  face.textContent = "标";
  const effect = document.createElement("span");
  effect.className = "nsh-avatar-effect";
  preview.append(face, effect);

  const updatePreview = () => {
    styles.avatarEffect = normalizeFollowRuleAvatarEffect(select.value);
    preview.dataset.nshAvatarEffect = styles.avatarEffect;
    renderFollowRuleAvatarEffectLayers(effect, styles.avatarEffect);
  };
  select.addEventListener("change", updatePreview);
  updatePreview();

  editor.append(control, preview);
  return editor;
}

function renderFollowRuleAvatarEffectLayers(effect, avatarEffect) {
  const layerCount = FOLLOW_RULE_AVATAR_EFFECT_LAYER_COUNTS[avatarEffect] || 0;
  const layers = Array.from({ length: layerCount }, (_, index) => {
    const layer = document.createElement("span");
    layer.className = "nsh-avatar-effect-layer";
    if (index === 0) {
      layer.classList.add("is-primary");
    } else if (index === 1) {
      layer.classList.add("is-secondary");
    }
    return layer;
  });
  effect.replaceChildren(...layers);
}
