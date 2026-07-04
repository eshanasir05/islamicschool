import type { IconName } from '@/components/marketing/icon';

export function shortDate(dateStr: string) {
  // dateStr is "YYYY-MM-DD"; pin to local midnight so the day doesn't shift.
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function relativeTime(at: Date | null) {
  if (!at) return '';
  const diffMs = Date.now() - at.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const ACTIVITY_ICON: Record<'attendance' | 'hifz' | 'note', IconName> = {
  attendance: 'users',
  hifz: 'mic',
  note: 'msg',
};
