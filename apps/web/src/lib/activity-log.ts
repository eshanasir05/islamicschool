import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export type ActivityAction =
  | 'student.created'
  | 'student.updated'
  | 'student.archived'
  | 'student.restored'
  | 'class.created'
  | 'class.updated'
  | 'teacher.invited'
  | 'teacher.linked'
  | 'guardian.linked'
  | 'guardian.unlinked'
  | 'roster_import.completed'
  | 'attendance.submitted'
  | 'attendance.updated'
  | 'absence_reason.submitted'
  | 'homework.assigned'
  | 'hifz_record.created'
  | 'hifz_milestone.created'
  | 'hifz_milestone.updated'
  | 'adab_note.added'
  | 'announcement.posted'
  | 'tuition_plan.created'
  | 'sibling_discount.applied'
  | 'tuition_assistance.applied'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'trial_assessment.completed'
  | 'inquiry.converted'
  | 'csv_export.downloaded';

// Human-readable, past-tense descriptions shown in the admin Activity Log.
// {target} is replaced with the target's display name/label where available.
export const ACTIVITY_LABELS: Record<ActivityAction, string> = {
  'student.created': 'added student {target}',
  'student.updated': 'edited student {target}',
  'student.archived': 'archived student {target}',
  'student.restored': 'restored student {target}',
  'class.created': 'created class {target}',
  'class.updated': 'edited class {target}',
  'teacher.invited': 'invited teacher {target}',
  'teacher.linked': 'linked teacher {target} to a class',
  'guardian.linked': 'linked guardian {target}',
  'guardian.unlinked': 'unlinked guardian {target}',
  'roster_import.completed': 'imported a student roster ({target})',
  'attendance.submitted': 'submitted attendance for {target}',
  'attendance.updated': 'updated attendance for {target}',
  'absence_reason.submitted': 'submitted an absence reason for {target}',
  'homework.assigned': 'assigned homework for {target}',
  'hifz_record.created': 'recorded a hifz session for {target}',
  'hifz_milestone.created': 'added a hifz milestone for {target}',
  'hifz_milestone.updated': 'updated a hifz milestone for {target}',
  'adab_note.added': 'added an adab note for {target}',
  'announcement.posted': 'posted an announcement',
  'tuition_plan.created': 'created a tuition plan for {target}',
  'sibling_discount.applied': 'applied a sibling discount for {target}',
  'tuition_assistance.applied': 'applied tuition assistance for {target}',
  'payment.succeeded': 'payment succeeded for {target}',
  'payment.failed': 'payment failed for {target}',
  'trial_assessment.completed': 'completed a trial assessment for {target}',
  'inquiry.converted': 'converted an inquiry to student {target}',
  'csv_export.downloaded': 'downloaded a {target} CSV export',
};

type LogActivityInput = {
  organizationId: string;
  actorUserId: string | null;
  actorName: string;
  action: ActivityAction;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

/** Records one activity log entry. Never throws — logging must not break the action that triggered it. */
export async function logActivity(input: LogActivityInput) {
  try {
    await db.insert(schema.activityLog).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    console.error('logActivity failed:', err);
  }
}

export type ActivityFilters = {
  actorUserId?: string;
  action?: ActivityAction;
  fromDate?: string;
  toDate?: string;
};

export async function getActivityLog(organizationId: string, filters: ActivityFilters = {}) {
  const conditions = [eq(schema.activityLog.organizationId, organizationId)];
  if (filters.actorUserId) conditions.push(eq(schema.activityLog.actorUserId, filters.actorUserId));
  if (filters.action) conditions.push(eq(schema.activityLog.action, filters.action));
  if (filters.fromDate) conditions.push(gte(schema.activityLog.createdAt, new Date(filters.fromDate)));
  if (filters.toDate) conditions.push(lte(schema.activityLog.createdAt, new Date(`${filters.toDate}T23:59:59.999Z`)));

  return db.query.activityLog.findMany({
    where: and(...conditions),
    orderBy: desc(schema.activityLog.createdAt),
    limit: 200,
  });
}

export function describeActivity(entry: { action: string; targetType: string; metadata: unknown }) {
  const template = ACTIVITY_LABELS[entry.action as ActivityAction] ?? entry.action;
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;
  const targetLabel = typeof meta.targetLabel === 'string' ? meta.targetLabel : entry.targetType;
  return template.replace('{target}', targetLabel);
}
