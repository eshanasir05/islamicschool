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

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  const stored = raw && typeof raw === 'object' ? (raw as Partial<NotificationPrefs>) : {};
  return { ...DEFAULT_NOTIFICATION_PREFS, ...stored };
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

export function parseClassPrefs(raw: unknown): ClassPrefs {
  const stored = raw && typeof raw === 'object' ? (raw as Partial<ClassPrefs>) : {};
  return { ...DEFAULT_CLASS_PREFS, ...stored };
}
