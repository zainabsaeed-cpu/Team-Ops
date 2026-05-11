const DEFAULT_AUTOMATION_SETTINGS = {
  desktopNotifications: true,
  autoArchive: false,
  weeklyDigest: true,
  mentionOnlyAfterHours: true,
  reviewNudges: true,
  quietStart: '18:00',
  quietEnd: '09:00',
  escalationDays: '3',
};

const booleanKeys = ['desktopNotifications', 'autoArchive', 'weeklyDigest', 'mentionOnlyAfterHours', 'reviewNudges'];
const timeKeys = ['quietStart', 'quietEnd'];

function normalizeTime(value, fallback) {
  const text = String(value || '').trim();
  return /^\d{2}:\d{2}$/.test(text) ? text : fallback;
}

function normalizeAutomationSettings(input = {}) {
  const settings = { ...DEFAULT_AUTOMATION_SETTINGS };

  booleanKeys.forEach((key) => {
    if (input[key] !== undefined) settings[key] = Boolean(input[key]);
  });

  timeKeys.forEach((key) => {
    if (input[key] !== undefined) settings[key] = normalizeTime(input[key], settings[key]);
  });

  if (input.escalationDays !== undefined) {
    const days = Math.min(14, Math.max(1, Number(input.escalationDays) || Number(settings.escalationDays)));
    settings.escalationDays = String(days);
  }

  return settings;
}

function formatAutomationSettings(workspace = {}) {
  return normalizeAutomationSettings(workspace.automationSettings || {});
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value || '00:00').split(':').map(Number);
  return (hours * 60) + minutes;
}

function isWithinQuietHours(settings, date = new Date()) {
  const normalized = normalizeAutomationSettings(settings);
  const start = minutesFromTime(normalized.quietStart);
  const end = minutesFromTime(normalized.quietEnd);
  const current = (date.getHours() * 60) + date.getMinutes();

  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

function shouldDigestNotification(settings, { isImportant = false, message = '' } = {}) {
  const normalized = normalizeAutomationSettings(settings);
  if (isImportant || !normalized.weeklyDigest) return false;
  if (!normalized.mentionOnlyAfterHours) return true;
  if (/mention|assigned|review|urgent|high priority|overdue/i.test(message)) return false;
  return isWithinQuietHours(normalized);
}

module.exports = {
  DEFAULT_AUTOMATION_SETTINGS,
  normalizeAutomationSettings,
  formatAutomationSettings,
  isWithinQuietHours,
  shouldDigestNotification,
};
