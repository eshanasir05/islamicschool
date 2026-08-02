const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function tuitionReminderCutoff(now: Date, throttleDays: number): Date {
  return new Date(now.getTime() - throttleDays * DAY_IN_MS);
}

export function isTuitionReminderDue(
  lastReminderSentAt: Date | string | null,
  now: Date,
  throttleDays: number,
): boolean {
  if (!lastReminderSentAt) return true;
  return new Date(lastReminderSentAt) < tuitionReminderCutoff(now, throttleDays);
}
