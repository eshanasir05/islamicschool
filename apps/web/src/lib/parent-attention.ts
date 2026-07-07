import type { IconName } from '@/components/marketing/icon';

export type AttentionItem = { icon: IconName; label: string; href: string; tone: 'danger' | 'warn' };

export function daysUntil(dateStr: string, today: string) {
  const a = new Date(`${dateStr}T00:00:00`).getTime();
  const b = new Date(`${today}T00:00:00`).getTime();
  return Math.round((a - b) / 86_400_000);
}

/** Real, actionable "needs your attention" rows for one child — no fabricated items.
 * `basePath` is prepended to anchors so the same builder works both on the child's own
 * page (basePath: '') and from the family dashboard (basePath: `/parent/{studentId}`). */
export function buildAttentionItems({
  basePath,
  attendance,
  nextHomework,
  tuition,
  today,
}: {
  basePath: string;
  attendance?: { status: string; guardianReason: string | null } | null;
  nextHomework?: { dueDate: string; title: string } | null;
  tuition?: { status: string } | null;
  today: string;
}): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (attendance?.status === 'absent' && !attendance.guardianReason) {
    items.push({ icon: 'shield', label: 'Absence reason needed for today', href: `${basePath}#absence-reason`, tone: 'danger' });
  }

  if (nextHomework && daysUntil(nextHomework.dueDate, today) <= 3) {
    const due = daysUntil(nextHomework.dueDate, today);
    items.push({
      icon: 'book',
      label: `Homework due ${due < 0 ? 'was' : new Date(`${nextHomework.dueDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${nextHomework.title}`,
      href: `${basePath}#homework`,
      tone: 'warn',
    });
  }

  if (tuition?.status === 'past_due') {
    items.push({ icon: 'money', label: 'Tuition payment failed — please update billing', href: `${basePath}#billing`, tone: 'danger' });
  } else if (tuition?.status === 'pending_payment') {
    items.push({ icon: 'money', label: 'Tuition payment needed to activate your plan', href: `${basePath}#billing`, tone: 'warn' });
  }

  return items;
}
