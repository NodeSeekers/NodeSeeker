async function getOptions() {
  const saved = await chrome.storage.local.get(DEFAULT_OPTIONS);
  return {
    ...DEFAULT_OPTIONS,
    ...saved,
    profileRetentionDays: normalizeProfileRetentionDays(saved.profileRetentionDays)
  };
}
