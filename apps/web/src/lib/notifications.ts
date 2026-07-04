import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export type NotificationType =
  | 'hifz_recorded'
  | 'note_added'
  | 'announcement'
  | 'guardian_linked'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'lead_submitted'
  | 'homework_assigned'
  | 'hifz_milestone';

type NotificationInput = {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
};

/** Insert a single notification. Failures are logged, never thrown — a
 * notification is a side effect and must not break the action that triggered it. */
export async function createNotification(input: NotificationInput) {
  try {
    await db.insert(schema.notifications).values({
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    });
  } catch (err) {
    console.error('createNotification failed:', err);
  }
}

/** Notify every guardian linked to a student who has notifications enabled. */
export async function notifyGuardians(
  studentId: string,
  organizationId: string,
  input: Omit<NotificationInput, 'organizationId' | 'userId'>,
) {
  const links = await db.query.studentGuardians.findMany({
    where: and(
      eq(schema.studentGuardians.studentId, studentId),
      eq(schema.studentGuardians.receivesNotifications, true),
    ),
  });
  await Promise.all(
    links.map(link =>
      createNotification({ ...input, organizationId, userId: link.guardianUserId }),
    ),
  );
}

/** Notify every guardian of every student enrolled in a class (used for homework). */
export async function notifyClassGuardians(
  classId: string,
  organizationId: string,
  input: Omit<NotificationInput, 'organizationId' | 'userId'>,
) {
  const enrollments = await db.query.classEnrollments.findMany({
    where: eq(schema.classEnrollments.classId, classId),
    columns: { studentId: true },
  });
  if (enrollments.length === 0) return;
  const studentIds = enrollments.map(e => e.studentId);

  const links = await db.query.studentGuardians.findMany({
    where: and(
      inArray(schema.studentGuardians.studentId, studentIds),
      eq(schema.studentGuardians.receivesNotifications, true),
    ),
  });
  const uniqueGuardianIds = [...new Set(links.map(l => l.guardianUserId))];
  await Promise.all(
    uniqueGuardianIds.map(userId =>
      createNotification({ ...input, organizationId, userId }),
    ),
  );
}

/** Notify every guardian in an organization (used for school-wide announcements). */
export async function notifyAllGuardiansInOrg(
  organizationId: string,
  input: Omit<NotificationInput, 'organizationId' | 'userId'>,
) {
  const students = await db.query.students.findMany({
    where: eq(schema.students.organizationId, organizationId),
    columns: { id: true },
  });
  if (students.length === 0) return;
  const studentIds = students.map(s => s.id);

  const links = await db.query.studentGuardians.findMany({
    where: and(
      inArray(schema.studentGuardians.studentId, studentIds),
      eq(schema.studentGuardians.receivesNotifications, true),
    ),
  });
  const uniqueGuardianIds = [...new Set(links.map(l => l.guardianUserId))];
  await Promise.all(
    uniqueGuardianIds.map(userId =>
      createNotification({ ...input, organizationId, userId }),
    ),
  );
}

/** Notify every active admin/principal in an organization (used for leads, etc.). */
export async function notifyOrgAdmins(
  organizationId: string,
  input: Omit<NotificationInput, 'organizationId' | 'userId'>,
) {
  const admins = await db.query.memberships.findMany({
    where: and(
      eq(schema.memberships.organizationId, organizationId),
      eq(schema.memberships.status, 'active'),
      inArray(schema.memberships.role, ['admin', 'principal']),
    ),
  });
  await Promise.all(
    admins.map(m => createNotification({ ...input, organizationId, userId: m.userId })),
  );
}
