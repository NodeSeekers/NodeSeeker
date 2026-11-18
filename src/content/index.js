function init() {
  initImagePreview();
  handleNotificationJumpTarget();
  document.addEventListener("keydown", handleNewPostShortcut, true);
  document.addEventListener("focusin", handleAutoPageEditorFocusIn, true);
  document.addEventListener("focusout", handleAutoPageEditorFocusOut, true);
  document.addEventListener("paste", handlePaste, true);
  document.addEventListener("dragover", handleDragOver, true);
  document.addEventListener("drop", handleDrop, true);
  document.addEventListener("click", handleLuckyAutoAddClick, true);
  document.addEventListener("mouseup", handleBlockFilterSelectionMouseUp, true);
  document.addEventListener("mousedown", handleBlockFilterSelectionMouseDown, true);
  document.addEventListener("keydown", handleBlockFilterSelectionKeyDown, true);
  document.addEventListener("mouseup", handleQuickPhraseSelectionMouseUp, true);
  document.addEventListener("mousedown", handleQuickPhraseDocumentMouseDown, true);
  document.addEventListener("keydown", handleQuickPhraseKeyDown, true);
  document.addEventListener("keydown", handleReadingNavigationShortcut, true);
  window.addEventListener("wheel", handleAutoPageWheel, { passive: true });
  window.addEventListener("touchstart", handleAutoPageTouchStart, { passive: true });
  window.addEventListener("touchmove", handleAutoPageTouchMove, { passive: true });
  window.addEventListener("pageshow", handleAutoPageShow);
  window.addEventListener("pageshow", scanVisitHistory);
  window.addEventListener("scroll", handleAutoPageScroll, { passive: true });
  window.addEventListener("resize", scheduleLuckyButtonPosition, { passive: true });
  window.addEventListener("resize", scheduleProfileStatsResize, { passive: true });
  window.addEventListener("scroll", scheduleLuckyButtonPosition, { passive: true });
  window.addEventListener("scroll", hideBlockFilterSelectionBubble, { passive: true });
  window.addEventListener("resize", hideBlockFilterSelectionBubble, { passive: true });
  window.addEventListener("scroll", closeQuickPhrasePopup, { passive: true });
  window.addEventListener("resize", closeQuickPhrasePopup, { passive: true });
  window.addEventListener("scroll", hideQuickPhraseSelectionBubble, { passive: true });
  window.addEventListener("resize", hideQuickPhraseSelectionBubble, { passive: true });
  chrome.storage.onChanged.addListener(handleStorageChanged);
  loadFeatureOptions()
    .catch(() => featureOptions)
    .finally(() => {
      scanPageFeatures();
    });
  initializeAutoPageHistoryGuard();
  observePageChanges();
}

const CONTENT_SCAN_ITEM_SELECTOR = ".post-list-item, .content-item";
let pageMutationObserver = null;

function scanPageFeatures() {
  scanBlockFilters();
  scanFollowRules();
  scanUserStats();
  scanProfileTrendAvatars();
  scanProfileProgressTriggers();
  scanProfileSpaceActions();
  scanQuickReplyButton();
  scanLuckyLinksSafely();
  scanAttendanceReminder();
  scanMessageEntry();
  scanEditorFormattingTools();
  scanPostSwitcher();
  scanVisitHistory();
  scanQuickPhraseButtons();
  pageMutationObserver?.takeRecords();
}

function scanChangedContentItems(items, records) {
  if (items.length > 0) {
    scanBlockFilters(items);
    scanFollowRules(items);
    if (featureOptions.userStatsEnabled) {
      scanUserStats(items);
    }
    scanProfileTrendAvatars(items);
    scanVisitHistory(items);
  }

  if (!getPostSwitcherCurrentPostId() && hasContentItemsAddedOrRemoved(records)) {
    scanPostSwitcher();
  }
}

function getContentItemElement(node) {
  const element = node?.nodeType === 1 ? node : node?.parentElement;
  if (!element) {
    return null;
  }

  return element.matches?.(CONTENT_SCAN_ITEM_SELECTOR)
    ? element
    : element.closest?.(CONTENT_SCAN_ITEM_SELECTOR) || null;
}

function collectContentMutationItems(records) {
  const items = new Set();
  const addAddedNodeItems = (node) => {
    const element = node?.nodeType === 1 ? node : null;
    if (!element) {
      return;
    }

    const item = getContentItemElement(element);
    if (item) {
      items.add(item);
    }
    element.querySelectorAll?.(CONTENT_SCAN_ITEM_SELECTOR).forEach((nestedItem) => items.add(nestedItem));
  };

  records.forEach((record) => {
    const targetItem = getContentItemElement(record.target);
    if (targetItem) {
      items.add(targetItem);
    }
    record.addedNodes.forEach(addAddedNodeItems);
  });

  return Array.from(items);
}

function isContentOnlyMutationBatch(records) {
  return records.length > 0 && records.every((record) => {
    if (getContentItemElement(record.target)) {
      return true;
    }

    const changedNodes = [...record.addedNodes, ...record.removedNodes];
    return changedNodes.length > 0 && changedNodes.every((node) => {
      if (node.nodeType === 3) {
        return !String(node.textContent || "").trim();
      }
      return isExtensionOwnedElement(node) || nodeContainsContentItem(node);
    });
  });
}

function nodeContainsContentItem(node) {
  return node?.nodeType === 1 && (
    node.matches?.(CONTENT_SCAN_ITEM_SELECTOR)
    || Boolean(node.querySelector?.(CONTENT_SCAN_ITEM_SELECTOR))
  );
}

function isExtensionOwnedElement(node) {
  return node?.nodeType === 1
    && Array.from(node.classList || []).some((className) => className.startsWith("nsh-"));
}

function isInsideExtensionElement(node) {
  const element = node?.nodeType === 1 ? node : node?.parentElement;
  return Boolean(element?.closest?.('[class*="nsh-"]'));
}

function isExtensionOwnedMutation(record) {
  const changedNodes = [...record.addedNodes, ...record.removedNodes];
  return changedNodes.length > 0 && changedNodes.every((node) => {
    if (node.nodeType === 3) {
      return isInsideExtensionElement(record.target);
    }
    return isExtensionOwnedElement(node);
  });
}

function hasContentItemsAddedOrRemoved(records) {
  return records.some((record) => {
    const changedNodes = [...record.addedNodes, ...record.removedNodes];
    return changedNodes.some(nodeContainsContentItem);
  });
}

function handleAutoPageEditorFocusIn(event) {
  const editor = toElement(event.target)?.closest?.(".CodeMirror");
  if (!editor) {
    return;
  }

  autoPageReplyEditor = editor;
  autoPageWaitForReplyScroll = true;
  autoPageReplyScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  resetAutoPageEdgeArming();
}

function handleAutoPageEditorFocusOut(event) {
  const editor = toElement(event.target)?.closest?.(".CodeMirror");
  if (!editor || editor !== autoPageReplyEditor) {
    return;
  }

  window.setTimeout(() => {
    if (editor.contains(document.activeElement) || document.activeElement?.closest?.(".CodeMirror")) {
      return;
    }

    autoPageReplyEditor = null;
    autoPageReplyScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    autoPageWaitForReplyScroll = true;
    resetAutoPageEdgeArming();
  }, 0);
}

async function loadFeatureOptions() {
  const options = await chrome.storage.local.get(DEFAULT_OPTIONS);
  featureOptions = normalizeStoredOptions(options);
  return featureOptions;
}

function normalizeStoredOptions(options) {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    imageUploadEnabled: options.imageUploadEnabled !== false,
    userStatsEnabled: options.userStatsEnabled !== false,
    profileTrend7DaysEnabled: options.profileTrend7DaysEnabled !== false,
    profileTrend30DaysEnabled: options.profileTrend30DaysEnabled !== false,
    profileHoverTrendEnabled: options.profileHoverTrendEnabled === true,
    userCacheHours: normalizeUserCacheHours(options.userCacheHours),
    blockFilterEnabled: options.blockFilterEnabled !== false,
    blockFilterQuickKeywordEnabled: options.blockFilterQuickKeywordEnabled !== false,
    blockFilterQuickUserEnabled: options.blockFilterQuickUserEnabled !== false,
    blockedKeywords: normalizeBlockFilterList(options.blockedKeywords),
    blockedUsers: normalizeBlockFilterList(options.blockedUsers),
    followRules: normalizeFollowRules(options.followRules),
    readingNavigationEnabled: options.readingNavigationEnabled === true,
    messageEntryEnabled: options.messageEntryEnabled !== false,
    editorToolsEnabled: options.editorToolsEnabled !== false,
    attendanceReminderEnabled: options.attendanceReminderEnabled !== false,
    postSwitcherEnabled: options.postSwitcherEnabled === true,
    autoPageEnabled: options.autoPageEnabled !== false,
    autoPageAppendEnabled: options.autoPageAppendEnabled === true,
    autoPageDelayMs: normalizeAutoPageDelayMs(options.autoPageDelayMs),
    postPagePreviousShortcut: normalizeShortcut(
      options.postPagePreviousShortcut,
      DEFAULT_OPTIONS.postPagePreviousShortcut
    ),
    postPageNextShortcut: normalizeShortcut(
      options.postPageNextShortcut,
      DEFAULT_OPTIONS.postPageNextShortcut
    ),
    postSwitcherPreviousShortcut: normalizeShortcut(
      options.postSwitcherPreviousShortcut,
      DEFAULT_OPTIONS.postSwitcherPreviousShortcut
    ),
    postSwitcherNextShortcut: normalizeShortcut(
      options.postSwitcherNextShortcut,
      DEFAULT_OPTIONS.postSwitcherNextShortcut
    ),
    quickReplyShortcut: normalizeShortcut(
      options.quickReplyShortcut,
      DEFAULT_OPTIONS.quickReplyShortcut
    ),
    replySubmitShortcut: normalizeShortcut(
      options.replySubmitShortcut,
      DEFAULT_OPTIONS.replySubmitShortcut
    ),
    quickPhrasesEnabled: options.quickPhrasesEnabled !== false,
    quickPhraseShortcut: normalizeShortcut(
      options.quickPhraseShortcut,
      DEFAULT_OPTIONS.quickPhraseShortcut
    ),
    quickPhrases: normalizeQuickPhrases(options.quickPhrases),
    luckyNotificationsEnabled: options.luckyNotificationsEnabled !== false,
    luckyAutoAddEnabled: options.luckyAutoAddEnabled === true,
    profileLabelKeys: normalizeProfileLabelKeys(options.profileLabelKeys),
    profileLabelSize: normalizeProfileLabelSize(options.profileLabelSize),
    levelColors: normalizeLevelColors(options.levelColors)
  };
}

async function sendExtensionMessage(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, payload });
  if (!response?.ok) {
    throw new Error(response?.error || "扩展后台响应异常");
  }

  return response.result;
}

function handleStorageChanged(changes, areaName) {
  if (areaName !== "local") {
    return;
  }

  loadFeatureOptions()
    .then(() => {
      if (changes.levelColors || changes.userStatsEnabled) {
        levelColorsPromise = null;
        refreshRenderedProfileColors();
      }

      if (changes.profileLabelKeys) {
        removeRenderedProfiles();
        resetUserStatsScan();
        if (featureOptions.userStatsEnabled) {
          scanUserStats();
        }
      }

      if (changes.profileLabelSize) {
        refreshRenderedProfileLabelSizes();
      }

      if (changes.userStatsEnabled) {
        if (featureOptions.userStatsEnabled) {
          resetUserStatsScan();
          scanUserStats();
        } else {
          removeRenderedProfiles();
        }
      }

      if (changes.profileHoverSignatureEnabled || changes.profileHoverTrendEnabled) {
        hideProfileTrendPopup();
        scanProfileTrendAvatars();
      }

      if (changes.luckyNotificationsEnabled) {
        scanLuckyLinksSafely();
      }

      if (changes.readingNavigationEnabled || changes.attendanceReminderEnabled) {
        scanAttendanceReminder();
      }

      if (changes.readingNavigationEnabled || changes.messageEntryEnabled) {
        scanMessageEntry();
      }

      if (changes.editorToolsEnabled) scanEditorFormattingTools();

      if (changes.blockFilterEnabled || changes.blockedKeywords || changes.blockedUsers) {
        scanBlockFilters();
        if (featureOptions.userStatsEnabled) {
          scanUserStats();
          scanProfileTrendAvatars();
        }
      }

      if (changes.blockFilterQuickKeywordEnabled || changes.blockFilterQuickUserEnabled) {
        hideBlockFilterSelectionBubble();
      }

      if (changes.followRules) {
        scanFollowRules();
      }

      if (changes.blockedUsers || changes.followRules) {
        refreshProfileUserActionButtons();
        scanProfileSpaceActions();
      }

      if (changes.quickPhrasesEnabled || changes.quickPhrases) {
        closeQuickPhrasePopup();
        hideQuickPhraseSelectionBubble();
        scanQuickPhraseButtons();
      }

      if (changes.readingNavigationEnabled || changes.postSwitcherEnabled) {
        scanPostSwitcher();
      }

      if (
        changes.readingNavigationEnabled
        || changes.autoPageEnabled
        || changes.autoPageAppendEnabled
        || changes.autoPageDelayMs
      ) {
        resetAutoPageEdgeArming();
        resetAutoPageAppendState();
        autoPageTouchStartY = 0;
      }
    })
    .catch(() => {});
}

function handleReadingNavigationShortcut(event) {
  if (
    event.defaultPrevented
    || event.repeat
    || !featureOptions.readingNavigationEnabled
    || isEditableScrollTarget(event.target)
    || isReadingNavigationDialogTarget(event.target)
  ) {
    return;
  }

  const shortcut = normalizeShortcutFromEvent(event);
  if (!shortcut) {
    return;
  }

  if (shortcut === featureOptions.postPagePreviousShortcut) {
    event.preventDefault();
    navigateToPreviousPostPage();
    return;
  }

  if (shortcut === featureOptions.postPageNextShortcut) {
    event.preventDefault();
    navigateToNextPostPage();
    return;
  }

  if (shortcut === featureOptions.postSwitcherPreviousShortcut) {
    event.preventDefault();
    navigatePostSwitcher("previous");
    return;
  }

  if (shortcut === featureOptions.postSwitcherNextShortcut) {
    event.preventDefault();
    navigatePostSwitcher("next");
    return;
  }

  if (shortcut === featureOptions.quickReplyShortcut && triggerQuickReplyShortcut()) {
    event.preventDefault();
  }
}

function isReadingNavigationDialogTarget(target) {
  return Boolean(toElement(target)?.closest?.(".nsh-dialog-backdrop"));
}

function observePageChanges() {
  let timer = 0;
  let pendingRecords = [];
  const observer = new MutationObserver((records) => {
    const relevantRecords = records.filter((record) => !isExtensionOwnedMutation(record));
    if (relevantRecords.length === 0) {
      return;
    }

    pendingRecords.push(...relevantRecords);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const batch = pendingRecords;
      pendingRecords = [];
      try {
        const items = collectContentMutationItems(batch);
        if (items.length > 0 && isContentOnlyMutationBatch(batch)) {
          scanChangedContentItems(items, batch);
        } else {
          scanPageFeatures();
        }
      } finally {
        observer.takeRecords();
      }
    }, 250);
  });
  pageMutationObserver = observer;

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

init();
