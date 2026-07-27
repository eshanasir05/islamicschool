// Shared shapes + defaults for the two teacher-only JSON preference blobs
// (users.notificationPrefs, users.classPrefs). Pure functions only, so this
// is safe to import from both server and client code.

export type NotificationPrefs = {
  absenceResponses: boolean;
  trialAssigned: boolean;
  adminAnnouncement: boolean;
  classReminder: boolean;
  homeworkDueSoon: boolean;
  hifzReviewAlerts: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  absenceResponses: true,
  trialAssigned: true,
  adminAnnouncement: true,
  classReminder: true,
  homeworkDueSoon: true,
  hifzReviewAlerts: true,
};

function booleanPref(value: unknown, defaultValue: boolean) {
  return typeof value === 'boolean' ? value : defaultValue;
}

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  const stored =
    raw && typeof raw === 'object'
      ? (raw as Partial<Record<keyof NotificationPrefs, unknown>>)
      : {};
  return {
    absenceResponses: booleanPref(
      stored.absenceResponses,
      DEFAULT_NOTIFICATION_PREFS.absenceResponses,
    ),
    trialAssigned: booleanPref(stored.trialAssigned, DEFAULT_NOTIFICATION_PREFS.trialAssigned),
    adminAnnouncement: booleanPref(
      stored.adminAnnouncement,
      DEFAULT_NOTIFICATION_PREFS.adminAnnouncement,
    ),
    classReminder: booleanPref(stored.classReminder, DEFAULT_NOTIFICATION_PREFS.classReminder),
    homeworkDueSoon: booleanPref(
      stored.homeworkDueSoon,
      DEFAULT_NOTIFICATION_PREFS.homeworkDueSoon,
    ),
    hifzReviewAlerts: booleanPref(
      stored.hifzReviewAlerts,
      DEFAULT_NOTIFICATION_PREFS.hifzReviewAlerts,
    ),
  };
}

export type ClassPrefs = {
  defaultHifzStream: 'sabak' | 'sabqi' | 'manzil';
  defaultNoteType: 'praise' | 'homework';
  showAyahRanges: boolean;
  showRetentionWarnings: boolean;
  sortStudents: 'alphabetical' | 'attention';
  reminderTime: string;
};

export const DEFAULT_CLASS_PREFS: ClassPrefs = {
  defaultHifzStream: 'sabak',
  defaultNoteType: 'praise',
  showAyahRanges: true,
  showRetentionWarnings: true,
  sortStudents: 'alphabetical',
  reminderTime: '09:00',
};

function isDefaultHifzStream(value: unknown): value is ClassPrefs['defaultHifzStream'] {
  return value === 'sabak' || value === 'sabqi' || value === 'manzil';
}

function isDefaultNoteType(value: unknown): value is ClassPrefs['defaultNoteType'] {
  return value === 'praise' || value === 'homework';
}

function isSortStudents(value: unknown): value is ClassPrefs['sortStudents'] {
  return value === 'alphabetical' || value === 'attention';
}

function isReminderTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function parseClassPrefs(raw: unknown): ClassPrefs {
  const stored =
    raw && typeof raw === 'object' ? (raw as Partial<Record<keyof ClassPrefs, unknown>>) : {};
  return {
    defaultHifzStream: isDefaultHifzStream(stored.defaultHifzStream)
      ? stored.defaultHifzStream
      : DEFAULT_CLASS_PREFS.defaultHifzStream,
    defaultNoteType: isDefaultNoteType(stored.defaultNoteType)
      ? stored.defaultNoteType
      : DEFAULT_CLASS_PREFS.defaultNoteType,
    showAyahRanges: booleanPref(stored.showAyahRanges, DEFAULT_CLASS_PREFS.showAyahRanges),
    showRetentionWarnings: booleanPref(
      stored.showRetentionWarnings,
      DEFAULT_CLASS_PREFS.showRetentionWarnings,
    ),
    sortStudents: isSortStudents(stored.sortStudents)
      ? stored.sortStudents
      : DEFAULT_CLASS_PREFS.sortStudents,
    reminderTime: isReminderTime(stored.reminderTime)
      ? stored.reminderTime
      : DEFAULT_CLASS_PREFS.reminderTime,
  };
}
