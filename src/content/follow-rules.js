const FOLLOW_RULE_STYLE_COLOR_DEFAULTS = {
  groupNameColor: "#8250df",
  titleColor: "#0969da",
  keywordColor: "#d73a7f",
  usernameColor: "#bc4c00",
  borderColor: "#8250df",
  backgroundColor: "#fff8c5"
};
const FOLLOW_RULE_AVATAR_EFFECTS = new Set([
  "none",
  "rainbow",
  "particles",
  "snake",
  "cosmos"
]);
const FOLLOW_RULE_AVATAR_EFFECT_LAYER_COUNTS = {
  none: 0,
  rainbow: 2,
  particles: 6,
  snake: 3,
  cosmos: 2
};
const FOLLOW_RULE_TYPE_CONFIG = {
  keyword: {
    collectionKey: "keywordGroups",
    groupLabel: "标记关键词组",
    itemLabel: "关键词"
  },
  signature: {
    collectionKey: "signatureGroups",
    groupLabel: "标记签名组",
    itemLabel: "签名关键词"
  },
  user: {
    collectionKey: "userGroups",
    groupLabel: "标记用户组",
    itemLabel: "用户名"
  }
};
let compiledFollowRulesSource = null;
let compiledFollowRules = null;

function normalizeFollowRules(value) {
  const source = isFollowRuleObject(value) ? value : {};
  const usedIds = new Set();
  const keywordGroups = normalizeFollowRuleGroups(source.keywordGroups, "keyword", usedIds);
  const signatureGroups = normalizeFollowRuleGroups(source.signatureGroups, "signature", usedIds);
  const userGroups = normalizeFollowRuleGroups(source.userGroups, "user", usedIds);
  return {
    keywordGroups: removeDuplicateFollowRuleItems(keywordGroups, "keyword"),
    signatureGroups: removeDuplicateFollowRuleItems(signatureGroups, "signature"),
    userGroups
  };
}

function isFollowRuleKeywordType(type) {
  return type === "keyword" || type === "signature";
}

function normalizeFollowRuleGroups(value, type, usedIds) {
  if (!Array.isArray(value)) {
    return [];
  }

  const groupLabel = FOLLOW_RULE_TYPE_CONFIG[type].groupLabel;
  return value
    .filter(isFollowRuleObject)
    .map((group, index) => {
      const fallbackId = `${type}-${index + 1}`;
      const baseId = normalizeFollowRuleText(group.id) || fallbackId;
      const normalizedGroup = {
        id: createUniqueFollowRuleId(baseId, usedIds),
        name: normalizeFollowRuleText(group.name) || `${groupLabel} ${index + 1}`,
        enabled: group.enabled !== false,
        styles: normalizeFollowRuleStyles(group.styles, type)
      };
      if (isFollowRuleKeywordType(type)) {
        normalizedGroup.rules = normalizeFollowRuleKeywordRules(group, normalizedGroup.id, usedIds);
      } else {
        normalizedGroup.items = normalizeBlockFilterList(group.items);
      }
      return normalizedGroup;
    });
}

function normalizeFollowRuleKeywordRules(group, groupId, usedIds) {
  const legacyTerms = normalizeBlockFilterList(group.items);
  const legacyExclusions = normalizeBlockFilterList(group.excludeItems);
  const savedRules = Array.isArray(group.rules)
    ? group.rules
    : (legacyTerms.length > 0 || legacyExclusions.length > 0
      ? [{ id: `${groupId}-rule-1`, terms: legacyTerms, mode: group.mode, excludeTerms: legacyExclusions }]
      : []);

  return savedRules.filter(isFollowRuleObject).map((rule, index) => {
    const legacyTerms = normalizeBlockFilterList(rule.terms);
    const termGroups = normalizeFollowRuleTermGroups(rule.termGroups, legacyTerms, rule.mode);
    const terms = normalizeBlockFilterList(termGroups.flat());
    if (terms.length === 0) return null;
    const baseId = normalizeFollowRuleText(rule.id) || `${groupId}-rule-${index + 1}`;
    return {
      id: createUniqueFollowRuleId(baseId, usedIds),
      enabled: rule.enabled !== false,
      mode: "all",
      terms,
      termGroups,
      excludeTerms: normalizeBlockFilterList(rule.excludeTerms)
    };
  }).filter(Boolean);
}

function normalizeFollowRuleTermGroups(value, fallbackTerms = [], fallbackMode = "all") {
  const savedGroups = Array.isArray(value)
    ? value.map((group) => normalizeBlockFilterList(group)).filter((group) => group.length > 0)
    : [];
  if (savedGroups.length > 0) return savedGroups;
  const terms = normalizeBlockFilterList(fallbackTerms);
  return fallbackMode === "any" ? (terms.length > 0 ? [terms] : []) : terms.map((term) => [term]);
}

function normalizeFollowRuleMatchMode(value, itemCount = 0) {
  if (value === "any" || value === "all") {
    return value;
  }
  return itemCount > 1 ? "all" : "any";
}

function removeDuplicateFollowRuleItems(groups, type) {
  if (isFollowRuleKeywordType(type)) return groups;
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
  return isFollowRuleKeywordType(type) ? normalized.toLocaleLowerCase() : normalized;
}

function normalizeFollowRuleStyles(value, type = "") {
  const styles = isFollowRuleObject(value) ? value : {};
  const normalized = {
    showGroupName: styles.showGroupName === true,
    avatarEffect: type === "user"
      ? normalizeFollowRuleAvatarEffect(styles.avatarEffect)
      : "none"
  };
  if (type === "signature") {
    normalized.showGroupName = false;
    normalized.signatureEffect = normalizeFollowRuleAvatarEffect(styles.signatureEffect);
  }

  Object.entries(FOLLOW_RULE_STYLE_COLOR_DEFAULTS).forEach(([key, defaultColor]) => {
    const option = isFollowRuleObject(styles[key]) ? styles[key] : {};
    normalized[key] = {
      enabled: type !== "signature" && option.enabled === true,
      color: normalizeFollowRuleColor(option.color, defaultColor)
    };
  });
  normalized.groupNameColor.enabled = normalized.showGroupName;

  return normalized;
}

function normalizeFollowRuleAvatarEffect(value) {
  const savedEffect = String(value || "").trim();
  const effect = savedEffect === "comet" ? "snake" : savedEffect;
  return FOLLOW_RULE_AVATAR_EFFECTS.has(effect) ? effect : "none";
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

async function getFollowUserGroupOptions(userName) {
  return getFollowRuleGroupOptions("user", userName);
}

async function getFollowRuleGroupOptions(type, value) {
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  const normalizedValue = normalizeBlockFilterList([value])[0] || "";
  if (!config || !normalizedValue) {
    return [];
  }

  const saved = await chrome.storage.local.get({ followRules: DEFAULT_FOLLOW_RULES });
  const rules = normalizeFollowRules(saved.followRules);
  const identity = getFollowRuleItemIdentity(type, normalizedValue);
  return rules[config.collectionKey].map((group) => ({
    id: group.id,
    name: group.name,
    enabled: group.enabled,
    followed: isFollowRuleKeywordType(type)
      ? group.rules.some((rule) => rule.terms.length === 1
        && getFollowRuleItemIdentity(type, rule.terms[0]) === identity)
      : group.items.some((item) => getFollowRuleItemIdentity(type, item) === identity)
  }));
}

async function renameFollowRuleGroup(type, groupId, name) {
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  const normalizedName = normalizeFollowRuleText(name);
  if (!config || !normalizedName) throw new Error("组名不能为空");
  const saved = await chrome.storage.local.get({ followRules: DEFAULT_FOLLOW_RULES });
  const rules = normalizeFollowRules(saved.followRules);
  const group = rules[config.collectionKey].find((entry) => entry.id === groupId);
  if (!group) throw new Error(`${config.groupLabel}不存在`);
  group.name = normalizedName;
  await saveFollowRules(rules);
  return rules;
}

async function deleteFollowRuleGroup(type, groupId) {
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  if (!config) return false;
  const saved = await chrome.storage.local.get({ followRules: DEFAULT_FOLLOW_RULES });
  const rules = normalizeFollowRules(saved.followRules);
  const groups = rules[config.collectionKey];
  const nextGroups = groups.filter((group) => group.id !== groupId);
  if (nextGroups.length === groups.length) return false;
  rules[config.collectionKey] = nextGroups;
  await saveFollowRules(rules);
  return true;
}

async function removeFollowRuleKeyword(value) {
  const keyword = normalizeBlockFilterList([value])[0] || "";
  if (!keyword) return false;
  const saved = await chrome.storage.local.get({ followRules: DEFAULT_FOLLOW_RULES });
  const rules = normalizeFollowRules(saved.followRules);
  const identity = getFollowRuleItemIdentity("keyword", keyword);
  let removed = false;
  rules.keywordGroups.forEach((group) => {
    const nextRules = group.rules.filter((rule) => {
      const isExactKeyword = rule.terms.length === 1
        && getFollowRuleItemIdentity("keyword", rule.terms[0]) === identity;
      if (isExactKeyword) removed = true;
      return !isExactKeyword;
    });
    group.rules = nextRules;
  });
  if (removed) await saveFollowRules(rules);
  return removed;
}

async function assignFollowRuleItemToGroup(type, value, groupId) {
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  const normalizedValue = normalizeBlockFilterList([value])[0] || "";
  if (!config || !normalizedValue) {
    throw new Error(`${config?.itemLabel || "内容"}不能为空`);
  }

  const saved = await chrome.storage.local.get({ followRules: DEFAULT_FOLLOW_RULES });
  const rules = normalizeFollowRules(saved.followRules);
  const groups = rules[config.collectionKey];
  const group = groups.find((entry) => entry.id === groupId);
  if (!group) {
    throw new Error(`${config.groupLabel}不存在`);
  }

  const identity = getFollowRuleItemIdentity(type, normalizedValue);
  if (isFollowRuleKeywordType(type)) {
    groups.forEach((entry) => {
      if (entry.id === groupId) return;
      entry.rules = entry.rules.filter((rule) => !(rule.terms.length === 1
        && getFollowRuleItemIdentity(type, rule.terms[0]) === identity));
    });
    const alreadyPresent = group.rules.some((rule) => rule.terms.length === 1
      && getFollowRuleItemIdentity(type, rule.terms[0]) === identity);
    if (!alreadyPresent) {
      group.rules.push(createFollowRuleSingleKeywordRule(normalizedValue));
    }
  } else {
    groups.forEach((entry) => {
      entry.items = entry.items.filter((item) => getFollowRuleItemIdentity(type, item) !== identity);
    });
    group.items.push(normalizedValue);
  }
  await saveFollowRules(rules);
  return rules;
}

async function setFollowedUserGroups(userName, groupIds) {
  const normalizedUserName = normalizeBlockFilterList([userName])[0] || "";
  if (!normalizedUserName) {
    throw new Error("用户名不能为空");
  }

  const saved = await chrome.storage.local.get({ followRules: DEFAULT_FOLLOW_RULES });
  const rules = normalizeFollowRules(saved.followRules);
  const groups = rules.userGroups;
  const selectedIds = new Set(Array.isArray(groupIds) ? groupIds : []);
  const availableIds = new Set(groups.map((group) => group.id));
  if ([...selectedIds].some((groupId) => !availableIds.has(groupId))) {
    throw new Error("标记用户组不存在");
  }

  const identity = getFollowRuleItemIdentity("user", normalizedUserName);
  groups.forEach((group) => {
    group.items = group.items.filter((item) => getFollowRuleItemIdentity("user", item) !== identity);
    if (selectedIds.has(group.id)) {
      group.items.push(normalizedUserName);
    }
  });
  await saveFollowRules(rules);
  return rules;
}

async function createNamedFollowRuleGroup(type, name, value, selectedGroupIds = null) {
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  const normalizedName = normalizeFollowRuleText(name);
  const normalizedValue = normalizeBlockFilterList([value])[0] || "";
  if (!config || !normalizedName || !normalizedValue) {
    throw new Error(`${config?.groupLabel || "标记规则组"}名称或内容不能为空`);
  }

  const saved = await chrome.storage.local.get({ followRules: DEFAULT_FOLLOW_RULES });
  const rules = normalizeFollowRules(saved.followRules);
  const groups = rules[config.collectionKey];
  const identity = getFollowRuleItemIdentity(type, normalizedValue);
  if (type === "user" && Array.isArray(selectedGroupIds)) {
    const selectedIds = new Set(selectedGroupIds);
    const availableIds = new Set(groups.map((group) => group.id));
    if ([...selectedIds].some((groupId) => !availableIds.has(groupId))) {
      throw new Error(`${config.groupLabel}不存在`);
    }
    groups.forEach((group) => {
      group.items = group.items.filter((item) => getFollowRuleItemIdentity(type, item) !== identity);
      if (selectedIds.has(group.id)) {
        group.items.push(normalizedValue);
      }
    });
  } else if (isFollowRuleKeywordType(type)) {
    groups.forEach((group) => {
      group.rules = group.rules.filter((rule) => !(rule.terms.length === 1
        && getFollowRuleItemIdentity(type, rule.terms[0]) === identity));
    });
  }
  groups.push({
    id: createFollowRuleStorageId(type, rules),
    name: normalizedName,
    enabled: true,
    ...(isFollowRuleKeywordType(type)
      ? { rules: [createFollowRuleSingleKeywordRule(normalizedValue)] }
      : { items: [normalizedValue] }),
    styles: normalizeFollowRuleStyles({
      showGroupName: type !== "signature",
      avatarEffect: type === "user" ? "rainbow" : "none",
      signatureEffect: type === "signature" ? "rainbow" : "none",
      groupNameColor: {
        enabled: true,
        color: FOLLOW_RULE_STYLE_COLOR_DEFAULTS.groupNameColor
      }
    }, type)
  });
  await saveFollowRules(rules);
  return rules;
}

function createFollowRuleSingleKeywordRule(term) {
  return {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `keyword-rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    enabled: true,
    mode: "all",
    terms: [term],
    termGroups: [[term]],
    excludeTerms: []
  };
}

function createFollowRuleStorageId(type, rules) {
  const usedIds = new Set([
    ...rules.keywordGroups.map((group) => group.id),
    ...rules.signatureGroups.map((group) => group.id),
    ...rules.userGroups.map((group) => group.id)
  ]);
  const randomPart = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const baseId = `${type}-${randomPart}`;
  return createUniqueFollowRuleId(baseId, usedIds);
}

async function saveFollowRules(rules) {
  await chrome.storage.local.set({ followRules: rules });
  featureOptions = {
    ...featureOptions,
    followRules: rules
  };
  scanFollowRules();
}

function openFollowRuleGroupDialog(type, value, groups) {
  const config = FOLLOW_RULE_TYPE_CONFIG[type];
  if (!config) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const isUser = type === "user";
    const backdrop = document.createElement("div");
    backdrop.className = "nsh-dialog-backdrop";

    const dialog = document.createElement("section");
    dialog.className = "nsh-dialog nsh-follow-rule-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const title = document.createElement("h2");
    title.textContent = isUser ? "管理标记用户" : getFollowRuleActionLabel(type);
    const selectionMessage = isUser
      ? `管理“${value}”所属的${config.groupLabel}：勾选添加，取消勾选移除`
      : `选择“${value}”所属的${config.groupLabel}`;
    const message = document.createElement("p");
    message.textContent = selectionMessage;
    const list = document.createElement("div");
    list.className = "nsh-follow-rule-group-list";
    const inputName = `nsh-follow-rule-group-${Date.now().toString(36)}`;
    const getSelectedGroupIds = () => Array.from(
      list.querySelectorAll(`input[name="${inputName}"]:checked`)
    ).map((input) => input.value);
    const createGroupField = document.createElement("label");
    createGroupField.className = "nsh-follow-rule-create-group";
    createGroupField.hidden = true;
    const createGroupLabel = document.createElement("span");
    createGroupLabel.textContent = "组名称";
    const createGroupInput = document.createElement("input");
    createGroupInput.type = "text";
    createGroupInput.maxLength = 40;
    createGroupInput.placeholder = `输入${config.groupLabel}名称`;
    createGroupInput.required = true;
    createGroupField.append(createGroupLabel, createGroupInput);

    groups.forEach((group, index) => {
      const label = document.createElement("label");
      label.className = "nsh-follow-rule-group-option";
      const input = document.createElement("input");
      input.type = isUser ? "checkbox" : "radio";
      input.name = inputName;
      input.value = group.id;
      input.checked = group.followed
        || (!isUser && !groups.some((entry) => entry.followed) && index === 0);
      if (isUser && !group.enabled && !group.followed) {
        input.disabled = true;
        label.classList.add("is-disabled");
      }
      const name = document.createElement("span");
      name.textContent = group.name;
      label.append(input, name);

      const statuses = [];
      if (group.followed && !isUser) {
        statuses.push("当前分组");
      }
      if (!group.enabled) {
        statuses.push("已禁用");
      }
      if (statuses.length > 0) {
        const status = document.createElement("small");
        status.textContent = statuses.join(" · ");
        label.appendChild(status);
      }
      list.appendChild(label);
    });
    if (groups.length === 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "nsh-follow-rule-group-empty";
      emptyState.textContent = `暂无${config.groupLabel}，请点击“新增组”创建`;
      list.appendChild(emptyState);
    }

    const actions = document.createElement("div");
    actions.className = "nsh-dialog-actions";
    const addGroupButton = document.createElement("button");
    addGroupButton.type = "button";
    addGroupButton.className = "nsh-follow-rule-add-group";
    addGroupButton.textContent = "新增组";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "取消";
    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "nsh-dialog-primary";
    confirmButton.textContent = isUser ? "保存" : "确定";
    confirmButton.disabled = groups.length === 0;
    let createMode = false;

    const close = (selection = null) => {
      document.removeEventListener("keydown", handleKeyDown);
      backdrop.remove();
      resolve(selection);
    };
    const setCreateMode = (enabled) => {
      createMode = enabled;
      list.hidden = enabled;
      createGroupField.hidden = !enabled;
      addGroupButton.hidden = enabled;
      cancelButton.textContent = enabled ? "返回" : "取消";
      confirmButton.textContent = enabled ? "创建并标记" : (isUser ? "保存" : "确定");
      confirmButton.disabled = !enabled && groups.length === 0;
      message.textContent = enabled
        ? `输入新的${config.groupLabel}名称`
        : selectionMessage;
      if (enabled) {
        createGroupInput.value = "";
        createGroupInput.setCustomValidity("");
        createGroupInput.focus();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (createMode) {
          setCreateMode(false);
          addGroupButton.focus();
          return;
        }
        close();
      }
    };

    addGroupButton.addEventListener("click", () => setCreateMode(true));
    cancelButton.addEventListener("click", () => {
      if (createMode) {
        setCreateMode(false);
        addGroupButton.focus();
        return;
      }
      close();
    });
    confirmButton.addEventListener("click", () => {
      if (createMode) {
        const groupName = normalizeFollowRuleText(createGroupInput.value);
        if (!groupName) {
          createGroupInput.setCustomValidity("请输入组名称");
          createGroupInput.reportValidity();
          return;
        }
        close({
          mode: "create",
          groupName,
          ...(isUser ? { groupIds: getSelectedGroupIds() } : {})
        });
        return;
      }
      if (isUser) {
        close({ mode: "manage", groupIds: getSelectedGroupIds() });
        return;
      }
      const groupId = list.querySelector(`input[name="${inputName}"]:checked`)?.value || "";
      close(groupId ? { mode: "select", groupId } : null);
    });
    createGroupInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        confirmButton.click();
      }
    });
    createGroupInput.addEventListener("input", () => {
      createGroupInput.setCustomValidity("");
    });
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        close();
      }
    });
    document.addEventListener("keydown", handleKeyDown);

    actions.append(addGroupButton, cancelButton, confirmButton);
    dialog.append(title, message, list, createGroupField, actions);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    cancelButton.focus();
  });
}

function openKeywordFollowRuleDialog(value, initialGroups) {
  return new Promise((resolve) => {
    let groups = initialGroups;
    let selectedGroupId = groups.find((group) => group.followed)?.id || groups[0]?.id || "";
    let mode = groups.length ? "select" : "create";
    let lookupId = 0;
    const backdrop = document.createElement("div");
    backdrop.className = "nsh-dialog-backdrop";
    const dialog = document.createElement("section");
    dialog.className = "nsh-dialog nsh-follow-rule-dialog nsh-keyword-follow-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    const title = document.createElement("h2");
    title.textContent = "标记关键词";
    const message = document.createElement("p");
    message.textContent = "可以直接修改选中的文字，再选择保存到哪个分组。";
    const keywordField = document.createElement("label");
    keywordField.className = "nsh-keyword-follow-field";
    const keywordLabel = document.createElement("span");
    keywordLabel.textContent = "关键词";
    const keywordInput = document.createElement("input");
    keywordInput.type = "text";
    keywordInput.maxLength = 120;
    keywordInput.value = value;
    keywordInput.autocomplete = "off";
    keywordField.append(keywordLabel, keywordInput);
    const markStatus = document.createElement("div");
    markStatus.className = "nsh-keyword-follow-status";
    const markStatusText = document.createElement("span");
    const unmarkButton = document.createElement("button");
    unmarkButton.type = "button";
    unmarkButton.className = "nsh-keyword-follow-unmark";
    unmarkButton.textContent = "取消独立标记";
    markStatus.append(markStatusText, unmarkButton);
    const list = document.createElement("div");
    list.className = "nsh-follow-rule-group-list";
    const createField = document.createElement("label");
    createField.className = "nsh-follow-rule-create-group";
    const createLabel = document.createElement("span");
    createLabel.textContent = "新分组名称";
    const createInput = document.createElement("input");
    createInput.type = "text";
    createInput.maxLength = 40;
    createInput.placeholder = "输入分组名称";
    createField.append(createLabel, createInput);
    const manageList = document.createElement("div");
    manageList.className = "nsh-keyword-follow-manage-list";
    const actions = document.createElement("div");
    actions.className = "nsh-dialog-actions";
    const addGroupButton = document.createElement("button");
    addGroupButton.type = "button";
    addGroupButton.className = "nsh-follow-rule-add-group";
    addGroupButton.textContent = "新建分组";
    const manageGroupsButton = document.createElement("button");
    manageGroupsButton.type = "button";
    manageGroupsButton.textContent = "管理分组";
    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.textContent = "返回分组";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "取消";
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "nsh-dialog-primary";
    saveButton.textContent = "标记";
    actions.append(addGroupButton, manageGroupsButton, backButton, cancelButton, saveButton);
    dialog.append(title, message, keywordField, markStatus, list, createField, manageList, actions);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    const close = (selection = null) => {
      document.removeEventListener("keydown", handleKeyDown);
      backdrop.remove();
      resolve(selection);
    };
    const renderList = () => {
      list.replaceChildren();
      if (!groups.length) {
        const empty = document.createElement("p");
        empty.className = "nsh-follow-rule-group-empty";
        empty.textContent = "还没有关键词分组，请新建一个。";
        list.appendChild(empty);
      }
      groups.forEach((group) => {
        const label = document.createElement("label");
        label.className = "nsh-follow-rule-group-option";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "nsh-keyword-follow-group";
        input.value = group.id;
        input.checked = selectedGroupId === group.id;
        const name = document.createElement("span");
        name.textContent = group.name;
        const status = document.createElement("small");
        status.textContent = group.followed ? "已标记" : (!group.enabled ? "已停用" : "");
        label.append(input, name);
        if (status.textContent) label.appendChild(status);
        list.appendChild(label);
      });
      const markedGroups = groups.filter((group) => group.followed);
      markStatus.hidden = mode !== "select" || markedGroups.length === 0;
      markStatusText.textContent = markedGroups.length
        ? `「${normalizeFollowRuleText(keywordInput.value)}」作为单独关键词标记在：${markedGroups.map((group) => group.name).join("、")}`
        : "";
      addGroupButton.hidden = mode !== "select";
      manageGroupsButton.hidden = mode !== "select";
      backButton.hidden = mode === "select";
      list.hidden = mode !== "select";
      createField.hidden = mode !== "create";
      manageList.hidden = mode !== "manage";
      saveButton.hidden = mode === "manage";
      saveButton.textContent = mode === "create" ? "创建并标记" : "标记";
      saveButton.disabled = mode === "select" && !selectedGroupId;
    };
    const renderManageList = () => {
      manageList.replaceChildren();
      if (!groups.length) {
        const empty = document.createElement("p");
        empty.className = "nsh-follow-rule-group-empty";
        empty.textContent = "没有可管理的关键词分组。";
        manageList.appendChild(empty);
        return;
      }
      groups.forEach((group) => {
        const row = document.createElement("div");
        row.className = "nsh-keyword-follow-manage-row";
        const name = document.createElement("input");
        name.type = "text";
        name.maxLength = 40;
        name.value = group.name;
        name.setAttribute("aria-label", `分组名称：${group.name}`);
        const rename = document.createElement("button");
        rename.type = "button";
        rename.textContent = "保存名称";
        rename.addEventListener("click", async () => {
          try {
            await renameFollowRuleGroup("keyword", group.id, name.value);
            await refreshGroups();
          } catch (error) {
            message.textContent = error.message || "分组名称保存失败";
          }
        });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "nsh-keyword-follow-delete";
        remove.textContent = "删除";
        remove.addEventListener("click", async () => {
          const confirmed = await openNshConfirmDialog({
            title: "删除关键词分组",
            message: `确定删除「${group.name}」及其中的标记规则吗？`,
            confirmText: "删除分组",
            confirmClassName: "nsh-dialog-danger"
          });
          if (!confirmed) return;
          try {
            await deleteFollowRuleGroup("keyword", group.id);
            await refreshGroups();
          } catch (error) {
            message.textContent = error.message || "分组删除失败";
          }
        });
        row.append(name, rename, remove);
        manageList.appendChild(row);
      });
    };
    const refreshGroups = async () => {
      const currentLookupId = ++lookupId;
      const nextGroups = await getFollowRuleGroupOptions("keyword", keywordInput.value);
      if (currentLookupId !== lookupId) return;
      groups = nextGroups;
      if (!groups.some((group) => group.id === selectedGroupId)) {
        selectedGroupId = groups.find((group) => group.followed)?.id || groups[0]?.id || "";
      }
      renderList();
      if (mode === "manage") renderManageList();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") close();
      if (event.key === "Enter" && mode !== "manage") {
        event.preventDefault();
        saveButton.click();
      }
    };
    keywordInput.addEventListener("input", refreshGroups);
    list.addEventListener("change", (event) => {
      if (event.target.matches("input[type='radio']")) {
        selectedGroupId = event.target.value;
        renderList();
      }
    });
    addGroupButton.addEventListener("click", () => {
      mode = "create";
      createInput.value = "";
      renderList();
      createInput.focus();
    });
    manageGroupsButton.addEventListener("click", () => {
      mode = "manage";
      renderList();
      renderManageList();
    });
    backButton.addEventListener("click", () => {
      mode = "select";
      renderList();
    });
    unmarkButton.addEventListener("click", () => {
      const currentValue = normalizeFollowRuleText(keywordInput.value);
      if (currentValue) close({ mode: "unmark", value: currentValue });
    });
    cancelButton.addEventListener("click", () => close());
    saveButton.addEventListener("click", () => {
      const currentValue = normalizeFollowRuleText(keywordInput.value);
      if (!currentValue) {
        keywordInput.setCustomValidity("请输入关键词");
        keywordInput.reportValidity();
        return;
      }
      keywordInput.setCustomValidity("");
      if (mode === "create") {
        const groupName = normalizeFollowRuleText(createInput.value);
        if (!groupName) {
          createInput.setCustomValidity("请输入分组名称");
          createInput.reportValidity();
          return;
        }
        close({ mode: "create", groupName, value: currentValue });
        return;
      }
      if (selectedGroupId) close({ mode: "select", groupId: selectedGroupId, value: currentValue });
    });
    createInput.addEventListener("input", () => createInput.setCustomValidity(""));
    keywordInput.addEventListener("input", () => keywordInput.setCustomValidity(""));
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });
    document.addEventListener("keydown", handleKeyDown);
    renderList();
    keywordInput.focus();
    keywordInput.select();
  });
}

function getFollowRuleActionLabel(type) {
  return type === "user" ? "标记用户" : "标记关键字";
}

function scanFollowRules(roots = null) {
  const rules = getCompiledFollowRules();
  const isDetailPage = isFollowRuleDetailPage();
  getFollowRuleTargets(isDetailPage, roots).forEach((root) => {
    const context = getFollowRuleTargetContext(root, isDetailPage);
    const decoration = context ? getFollowRuleDecoration(context, rules) : null;
    updateFollowRuleDecoration(root, context, decoration);
  });
}

function getCompiledFollowRules() {
  if (compiledFollowRulesSource === featureOptions.followRules && compiledFollowRules) {
    return compiledFollowRules;
  }

  const normalized = normalizeFollowRules(featureOptions.followRules);
  compiledFollowRulesSource = featureOptions.followRules;
  compiledFollowRules = {
    keywordGroups: normalized.keywordGroups
      .filter((group) => group.enabled)
      .map((group) => ({
        ...group,
        rules: group.rules.map((rule) => ({
          ...rule,
          normalizedItems: rule.terms.map((item) => item.toLocaleLowerCase()),
          normalizedTermGroups: rule.termGroups.map((terms) => terms.map((item) => item.toLocaleLowerCase())),
          normalizedExcludedItems: rule.excludeTerms.map((item) => item.toLocaleLowerCase())
        }))
      })),
    signatureGroups: normalized.signatureGroups
      .filter((group) => group.enabled)
      .map((group) => ({
        ...group,
        rules: group.rules.map((rule) => ({
          ...rule,
          normalizedItems: rule.terms.map((item) => item.toLocaleLowerCase()),
          normalizedTermGroups: rule.termGroups.map((terms) => terms.map((item) => item.toLocaleLowerCase())),
          normalizedExcludedItems: rule.excludeTerms.map((item) => item.toLocaleLowerCase())
        }))
      })),
    userGroups: normalized.userGroups
      .filter((group) => group.enabled)
      .map((group) => ({
        ...group,
        itemSet: new Set(group.items)
      }))
  };
  return compiledFollowRules;
}

function isFollowRuleDetailPage() {
  return /^\/post-\d+(?:-\d+)?$/.test(location.pathname);
}

function getFollowRuleTargets(isDetailPage, roots = null) {
  if (Array.isArray(roots)) {
    const selector = isDetailPage ? ".content-item" : ".post-list-item";
    const items = new Set();
    roots.forEach((root) => {
      if (root.matches?.(selector)) {
        items.add(root);
      }
      root.querySelectorAll?.(selector).forEach((item) => items.add(item));
    });

    if (items.size > 0 || isDetailPage) {
      return Array.from(items);
    }

    roots.forEach((root) => {
      if (
        root.matches?.(".content-item")
        && root.querySelector(".post-title a[href^='/post-'], .post-title a[href*='/post-']")
      ) {
        items.add(root);
      }
      root.querySelectorAll?.(".content-item").forEach((item) => {
        if (item.querySelector(".post-title a[href^='/post-'], .post-title a[href*='/post-']")) {
          items.add(item);
        }
      });
    });
    return Array.from(items);
  }

  if (isDetailPage) {
    return Array.from(document.querySelectorAll(".content-item"));
  }

  const postListItems = Array.from(document.querySelectorAll(".post-list-item"));
  if (postListItems.length > 0) {
    return postListItems;
  }

  return Array.from(document.querySelectorAll(".content-item")).filter((item) => {
    return item.querySelector(".post-title a[href^='/post-'], .post-title a[href*='/post-']");
  });
}

function getFollowRuleTargetContext(root, isDetailPage) {
  const authorElement = getFollowRuleAuthorElement(root);
  const authorName = normalizeFollowRuleText(authorElement?.textContent);
  const avatarElement = getFollowRuleAvatarElement(root, authorElement);
  if (isDetailPage) {
    return {
      root,
      type: "detail",
      authorElement,
      authorName,
      avatarElement,
      titleElement: null,
      titleText: "",
      signatureElement: root.querySelector(".signature"),
      signatureText: normalizeFollowRuleText(root.querySelector(".signature")?.textContent)
    };
  }

  const titleElement = getFollowRuleTitleElement(root);
  const titleText = getFollowRuleTitleText(titleElement);
  if (!titleElement) {
    return null;
  }

  return {
    root,
    type: "list",
    authorElement,
    authorName,
    avatarElement,
    titleElement,
    titleText
  };
}

function getFollowRuleAuthorElement(root) {
  const meta = root.querySelector(".nsk-content-meta-info") || root;
  return meta.querySelector(".author-info .author-name[href*='/space/']")
    || meta.querySelector(".info-author a[href*='/space/']")
    || meta.querySelector("a.author-name[href*='/space/']")
    || Array.from(meta.querySelectorAll("a[href*='/space/']"))
      .find((link) => normalizeFollowRuleText(link.textContent));
}

function getFollowRuleAvatarElement(root, authorElement) {
  const candidates = Array.from(root.querySelectorAll("a[href*='/space/']"))
    .filter((link) => link.querySelector("img"));
  if (candidates.length === 0) {
    return null;
  }

  const authorPath = getFollowRuleSpacePath(authorElement);
  if (authorPath) {
    const matchingAvatar = candidates.find((link) => getFollowRuleSpacePath(link) === authorPath);
    if (matchingAvatar) {
      return matchingAvatar;
    }
  }

  return root.querySelector(".avatar-wrapper a[href*='/space/']") || candidates[0];
}

function getFollowRuleSpacePath(link) {
  const href = link?.getAttribute("href") || "";
  if (!href) {
    return "";
  }

  try {
    return new URL(href, location.origin).pathname.replace(/\/+$/, "");
  } catch {
    return href.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  }
}

function getFollowRuleTitleElement(root) {
  return root.querySelector(".post-title a[href^='/post-'], .post-title a[href*='/post-']")
    || root.querySelector(".post-title");
}

function getFollowRuleTitleText(titleElement) {
  if (!titleElement) {
    return "";
  }

  const clone = titleElement.cloneNode(true);
  clone.querySelectorAll?.(".nsh-follow-group-list").forEach((node) => node.remove());
  return normalizeFollowRuleText(clone.textContent);
}

function getFollowRuleDecoration(context, rules) {
  const normalizedTitle = context.titleText.toLocaleLowerCase();
  const keywordGroups = context.type === "list"
    ? rules.keywordGroups.filter((group) => {
      return isFollowRuleKeywordGroupMatch(group, normalizedTitle);
    }).map((group) => ({
      ...group,
      matchedRules: getMatchingFollowRuleKeywordRules(group, normalizedTitle)
    }))
    : [];
  const normalizedSignature = context.type === "detail"
    ? normalizeFollowRuleText(context.signatureText).toLocaleLowerCase()
    : "";
  const signatureGroups = normalizedSignature
    ? (rules.signatureGroups || []).map((group) => ({
      ...group,
      matchedRules: getMatchingFollowRuleKeywordRules(group, normalizedSignature)
    })).filter((group) => group.matchedRules.length > 0)
    : [];
  const userGroups = context.authorName
    ? rules.userGroups.filter((group) => group.itemSet.has(context.authorName))
    : [];

  if (keywordGroups.length === 0 && signatureGroups.length === 0 && userGroups.length === 0) {
    return null;
  }

  const keywordTerms = keywordGroups
    .flatMap((group) => group.matchedRules.flatMap((rule) => rule.normalizedItems))
    .filter((keyword) => normalizedTitle.includes(keyword.toLocaleLowerCase()));
  const signatureTerms = signatureGroups
    .flatMap((group) => group.matchedRules.flatMap((rule) => rule.normalizedItems))
    .filter((keyword) => normalizedSignature.includes(keyword.toLocaleLowerCase()));
  const groupBadges = [
    ...getFollowRuleGroupBadges(userGroups, "user"),
    ...getFollowRuleGroupBadges(keywordGroups, "keyword")
  ];
  const decoration = {
    groupBadges,
    titleColor: context.titleElement
      ? resolveFollowRuleColor("titleColor", userGroups, keywordGroups)
      : "",
    keywordColor: context.titleElement && keywordTerms.length > 0
      ? resolveFollowRuleColor("keywordColor", userGroups, keywordGroups)
      : "",
    usernameColor: context.authorElement
      ? resolveFollowRuleColor("usernameColor", userGroups, keywordGroups)
      : "",
    avatarEffect: context.avatarElement
      ? resolveFollowRuleAvatarEffect(userGroups)
      : "",
    signatureEffect: context.signatureElement
      ? resolveFollowRuleSignatureEffect(signatureGroups)
      : "",
    signatureTerms: [...new Set(signatureTerms)],
    borderColor: resolveFollowRuleColor("borderColor", userGroups, keywordGroups),
    backgroundColor: resolveFollowRuleColor("backgroundColor", userGroups, keywordGroups),
    keywordTerms: [...new Set(keywordTerms)]
  };

  return hasVisibleFollowRuleDecoration(decoration) ? decoration : null;
}

function isFollowRuleKeywordGroupMatch(group, normalizedTitle) {
  return getMatchingFollowRuleKeywordRules(group, normalizedTitle).length > 0;
}

function getMatchingFollowRuleKeywordRules(group, normalizedTitle) {
  return group.rules.filter((rule) => {
    if (rule.enabled === false || rule.normalizedItems.length === 0) return false;
    if (rule.normalizedExcludedItems.some((keyword) => keyword && normalizedTitle.includes(keyword))) return false;
    return rule.normalizedTermGroups.length > 0
      && rule.normalizedTermGroups.every((terms) => terms.some((keyword) => normalizedTitle.includes(keyword)));
  });
}

function getFollowRuleGroupBadges(groups, type) {
  return groups
    .filter((group) => group.styles.showGroupName)
    .map((group) => ({
      id: group.id,
      name: group.name,
      type,
      color: group.styles.groupNameColor.enabled
        ? group.styles.groupNameColor.color
        : ""
    }));
}

function resolveFollowRuleColor(styleKey, userGroups, keywordGroups) {
  const group = [...userGroups, ...keywordGroups]
    .find((entry) => entry.styles[styleKey].enabled);
  return group?.styles[styleKey].color || "";
}

function resolveFollowRuleAvatarEffect(userGroups) {
  const group = userGroups
    .find((entry) => entry.styles.avatarEffect !== "none");
  return group?.styles.avatarEffect || "";
}

function resolveFollowRuleSignatureEffect(signatureGroups) {
  const group = signatureGroups.find((entry) => entry.styles.signatureEffect !== "none");
  return group?.styles.signatureEffect || "";
}

function hasVisibleFollowRuleDecoration(decoration) {
  return decoration.groupBadges.length > 0
    || Boolean(decoration.titleColor)
    || Boolean(decoration.keywordColor)
    || Boolean(decoration.usernameColor)
    || Boolean(decoration.avatarEffect)
    || Boolean(decoration.signatureEffect)
    || decoration.signatureTerms.length > 0
    || Boolean(decoration.borderColor)
    || Boolean(decoration.backgroundColor);
}

function updateFollowRuleDecoration(root, context, decoration) {
  if (!decoration && !hasExistingFollowRuleDecoration(root)) {
    return;
  }

  const signature = decoration
    ? JSON.stringify({
      type: context.type,
      title: context.titleText,
      author: context.authorName,
      ...decoration
    })
    : "";

  if (
    root.dataset.nshFollowRuleSignature === signature
    && isFollowRuleDecorationCurrent(root, context, decoration)
  ) {
    return;
  }

  clearFollowRuleDecoration(root);
  if (!decoration) {
    return;
  }

  applyFollowRuleRootStyles(root, decoration);
  applyFollowRuleTextStyles(context, decoration);
  applyFollowRuleAvatarEffect(context, decoration.avatarEffect);
  if (decoration.signatureTerms.length > 0) {
    highlightFollowRuleKeywords(context.signatureElement, decoration.signatureTerms, "", "nsh-follow-signature-keyword-hit");
  }
  applyFollowRuleSignatureEffect(context, decoration.signatureEffect);
  renderFollowRuleGroupBadges(context, decoration.groupBadges);
  root.dataset.nshFollowRuleSignature = signature;
}

function hasExistingFollowRuleDecoration(root) {
  return Boolean(root.dataset.nshFollowRuleSignature)
    || root.classList.contains("nsh-follow-border")
    || root.classList.contains("nsh-follow-background")
    || Boolean(root.querySelector(
      ".nsh-follow-group-list, .nsh-follow-keyword-hit, .nsh-follow-signature-keyword-hit, .nsh-follow-title, .nsh-follow-username, .nsh-follow-avatar, .nsh-follow-signature-effect"
    ));
}

function isFollowRuleDecorationCurrent(root, context, decoration) {
  if (!decoration) {
    return !root.querySelector(".nsh-follow-group-list, .nsh-follow-keyword-hit, .nsh-follow-signature-keyword-hit, .nsh-follow-avatar, .nsh-follow-signature-effect")
      && !root.classList.contains("nsh-follow-border")
      && !root.classList.contains("nsh-follow-background");
  }

  if (root.querySelectorAll(".nsh-follow-group-badge").length !== decoration.groupBadges.length) {
    return false;
  }
  if (Boolean(decoration.borderColor) !== root.classList.contains("nsh-follow-border")) {
    return false;
  }
  if (Boolean(decoration.backgroundColor) !== root.classList.contains("nsh-follow-background")) {
    return false;
  }
  if (Boolean(decoration.titleColor) !== Boolean(context.titleElement?.classList.contains("nsh-follow-title"))) {
    return false;
  }
  if (Boolean(decoration.usernameColor) !== Boolean(context.authorElement?.classList.contains("nsh-follow-username"))) {
    return false;
  }
  if (Boolean(decoration.avatarEffect) !== Boolean(root.querySelector(".nsh-follow-avatar-effect"))) {
    return false;
  }
  if (
    decoration.avatarEffect
    && (
      !context.avatarElement?.classList.contains("nsh-follow-avatar")
      || context.avatarElement.dataset.nshAvatarEffect !== decoration.avatarEffect
    )
  ) {
    return false;
  }
  const signatureHost = context.signatureElement?.querySelector(":scope > .nsh-follow-signature");
  if (Boolean(decoration.signatureEffect) !== Boolean(signatureHost)) {
    return false;
  }
  if (
    decoration.signatureEffect
    && (
      signatureHost.dataset.nshAvatarEffect !== decoration.signatureEffect
      || !signatureHost.querySelector(".nsh-follow-signature-effect")
    )
  ) {
    return false;
  }
  if (Boolean(decoration.signatureTerms.length) !== Boolean(context.signatureElement?.querySelector(".nsh-follow-signature-keyword-hit"))) {
    return false;
  }
  if (decoration.keywordColor && !context.titleElement?.querySelector(".nsh-follow-keyword-hit")) {
    return false;
  }

  return true;
}

function clearFollowRuleDecoration(root) {
  root.querySelectorAll(".nsh-follow-group-list").forEach((node) => node.remove());
  root.querySelectorAll(".nsh-follow-keyword-hit, .nsh-follow-signature-keyword-hit").forEach((node) => {
    const parent = node.parentNode;
    node.replaceWith(...node.childNodes);
    parent?.normalize();
  });
  root.querySelectorAll(".nsh-follow-title").forEach((node) => {
    node.classList.remove("nsh-follow-title");
    node.style.removeProperty("--nsh-follow-title-color");
  });
  root.querySelectorAll(".nsh-follow-username").forEach((node) => {
    node.classList.remove("nsh-follow-username");
    node.style.removeProperty("--nsh-follow-username-color");
  });
  root.querySelectorAll(".nsh-follow-avatar-effect").forEach((node) => node.remove());
  root.querySelectorAll(".nsh-follow-signature-effect").forEach((node) => node.remove());
  root.querySelectorAll(".nsh-follow-avatar").forEach((node) => {
    node.classList.remove("nsh-follow-avatar", "nsh-avatar-effect-host");
    node.style.removeProperty("--nsh-avatar-image-radius");
    node.style.removeProperty("--nsh-avatar-effect-radius");
    delete node.dataset.nshAvatarEffect;
  });
  root.querySelectorAll(".nsh-follow-signature").forEach((node) => {
    node.replaceWith(...node.childNodes);
  });
  root.classList.remove("nsh-follow-border", "nsh-follow-background");
  root.style.removeProperty("--nsh-follow-border-color");
  root.style.removeProperty("--nsh-follow-background-color");
  delete root.dataset.nshFollowRuleSignature;
}

function applyFollowRuleRootStyles(root, decoration) {
  if (decoration.borderColor) {
    root.classList.add("nsh-follow-border");
    root.style.setProperty("--nsh-follow-border-color", decoration.borderColor);
  }
  if (decoration.backgroundColor) {
    root.classList.add("nsh-follow-background");
    root.style.setProperty("--nsh-follow-background-color", decoration.backgroundColor);
  }
}

function applyFollowRuleTextStyles(context, decoration) {
  if (decoration.titleColor) {
    context.titleElement.classList.add("nsh-follow-title");
    context.titleElement.style.setProperty("--nsh-follow-title-color", decoration.titleColor);
  }
  if (decoration.keywordColor) {
    highlightFollowRuleKeywords(
      context.titleElement,
      decoration.keywordTerms,
      decoration.keywordColor
    );
  }
  if (decoration.usernameColor) {
    context.authorElement.classList.add("nsh-follow-username");
    context.authorElement.style.setProperty("--nsh-follow-username-color", decoration.usernameColor);
  }
}

function applyFollowRuleAvatarEffect(context, avatarEffect) {
  const avatar = context.avatarElement;
  if (!avatar || !avatarEffect) {
    return;
  }

  avatar.classList.add("nsh-follow-avatar", "nsh-avatar-effect-host");
  avatar.dataset.nshAvatarEffect = avatarEffect;
  avatar.style.removeProperty("--nsh-avatar-effect-radius");
  avatar.style.setProperty("--nsh-avatar-image-radius", getFollowRuleAvatarImageRadius(avatar));

  const effect = document.createElement("span");
  effect.className = "nsh-follow-avatar-effect nsh-avatar-effect";
  effect.setAttribute("aria-hidden", "true");
  const layerCount = FOLLOW_RULE_AVATAR_EFFECT_LAYER_COUNTS[avatarEffect] || 0;
  Array.from({ length: layerCount }, (_, index) => {
    const layer = document.createElement("span");
    layer.className = "nsh-follow-avatar-effect-layer nsh-avatar-effect-layer";
    if (index === 0) {
      layer.classList.add("is-primary");
    } else if (index === 1) {
      layer.classList.add("is-secondary");
    }
    return layer;
  }).forEach((layer) => effect.appendChild(layer));
  avatar.appendChild(effect);
}

function applyFollowRuleSignatureEffect(context, signatureEffect) {
  const signature = context.signatureElement;
  if (!signature || !signatureEffect) return;

  const host = document.createElement("div");
  host.className = "nsh-follow-signature nsh-signature-effect-host nsh-avatar-effect-host";
  host.dataset.nshAvatarEffect = signatureEffect;
  host.append(...signature.childNodes);

  const effect = document.createElement("span");
  effect.className = "nsh-follow-signature-effect nsh-avatar-effect";
  effect.setAttribute("aria-hidden", "true");
  const layerCount = FOLLOW_RULE_AVATAR_EFFECT_LAYER_COUNTS[signatureEffect] || 0;
  Array.from({ length: layerCount }, (_, index) => {
    const layer = document.createElement("span");
    layer.className = "nsh-avatar-effect-layer";
    if (index === 0) layer.classList.add("is-primary");
    else if (index === 1) layer.classList.add("is-secondary");
    return layer;
  }).forEach((layer) => effect.appendChild(layer));
  host.appendChild(effect);
  signature.appendChild(host);
}

function getFollowRuleAvatarImageRadius(avatar) {
  const candidates = [
    avatar.querySelector("img"),
    avatar,
    avatar.closest(".avatar-wrapper")
  ].filter(Boolean);
  for (const candidate of candidates) {
    const radius = getComputedStyle(candidate).borderTopLeftRadius.split(/\s+/, 1)[0];
    const radiusValue = parseFloat(radius);
    if (!radius || !(radiusValue > 0)) {
      continue;
    }
    if (radius.endsWith("%")) {
      const bounds = candidate.getBoundingClientRect();
      const referenceSize = Math.min(bounds.width, bounds.height);
      if (referenceSize > 0) {
        return `${Number(((referenceSize * radiusValue) / 100).toFixed(3))}px`;
      }
    }
    return radius;
  }
  return "8px";
}

function renderFollowRuleGroupBadges(context, badges) {
  if (badges.length === 0) {
    return;
  }

  const host = context.type === "list"
    ? context.titleElement.closest(".post-title") || context.titleElement.parentElement
    : context.authorElement?.parentElement;
  if (!host) {
    return;
  }

  const list = document.createElement("span");
  list.className = "nsh-follow-group-list";
  badges.forEach((badge) => {
    const node = document.createElement("span");
    node.className = "nsh-follow-group-badge";
    node.dataset.nshFollowRuleType = badge.type;
    node.textContent = badge.name;
    node.title = `${badge.type === "user" ? "标记用户组" : "标记关键词组"}：${badge.name}`;
    if (badge.color) {
      node.style.setProperty("--nsh-follow-group-color", badge.color);
    }
    list.appendChild(node);
  });
  const profileStats = context.type === "detail"
    ? Array.from(host.children).find((node) => node.classList.contains("nsh-user-stats"))
    : null;
  host.insertBefore(list, profileStats || null);
}

function highlightFollowRuleKeywords(root, keywords, color, className = "nsh-follow-keyword-hit") {
  const normalizedKeywords = [...new Set(
    keywords.map((keyword) => keyword.toLocaleLowerCase()).filter(Boolean)
  )].sort((left, right) => right.length - left.length);
  if (normalizedKeywords.length === 0) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (normalizeFollowRuleText(node.nodeValue)) {
      textNodes.push(node);
    }
  }

  textNodes.forEach((node) => {
    const parts = splitFollowRuleText(node.nodeValue, normalizedKeywords);
    if (!parts.some((part) => part.match)) {
      return;
    }

    const fragment = document.createDocumentFragment();
    parts.forEach((part) => {
      if (!part.match) {
        fragment.appendChild(document.createTextNode(part.text));
        return;
      }

      const mark = document.createElement("span");
      mark.className = className;
      if (color) mark.style.setProperty("--nsh-follow-keyword-color", color);
      mark.textContent = part.text;
      fragment.appendChild(mark);
    });
    node.replaceWith(fragment);
  });
}

function splitFollowRuleText(text, normalizedKeywords) {
  const normalizedText = text.toLocaleLowerCase();
  const parts = [];
  let offset = 0;

  while (offset < text.length) {
    let matchIndex = -1;
    let matchLength = 0;
    normalizedKeywords.forEach((keyword) => {
      const index = normalizedText.indexOf(keyword, offset);
      if (
        index >= 0
        && (matchIndex < 0 || index < matchIndex || (index === matchIndex && keyword.length > matchLength))
      ) {
        matchIndex = index;
        matchLength = keyword.length;
      }
    });

    if (matchIndex < 0) {
      parts.push({ text: text.slice(offset), match: false });
      break;
    }
    if (matchIndex > offset) {
      parts.push({ text: text.slice(offset, matchIndex), match: false });
    }
    parts.push({ text: text.slice(matchIndex, matchIndex + matchLength), match: true });
    offset = matchIndex + matchLength;
  }

  return parts;
}
