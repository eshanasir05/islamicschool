'use server';

import { env } from '@/env';
import { logActivity } from '@/lib/activity-log';
import { requireAdminForOrg } from '@/lib/admin-auth';
import { db, schema } from '@/lib/db';
import { getHifzRetentionFlags } from '@/lib/hifz-retention';
import { createNotification, notifyAllGuardiansInOrg, notifyAllTeachersIfEnabled, notifyTeacherIfEnabled } from '@/lib/notifications';
import { stripe } from '@/lib/stripe';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { and, count, desc, eq, gte, inArray, isNull, max, ne, sql, sum } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Resend } from 'resend';

export async function getAdminStats(orgId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekStart = sevenDaysAgo.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [attendanceRows, hifzCount, classes, tuitionPlans] = await Promise.all([
    // Attendance this week
    db
      .select({ status: schema.attendanceRecords.status, cnt: count() })
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.organizationId, orgId),
          gte(schema.attendanceRecords.sessionDate, weekStart),
        ),
      )
      .groupBy(schema.attendanceRecords.status),

    // Hifz wins this week
    db
      .select({ cnt: count() })
      .from(schema.hifzRecords)
      .where(
        and(
          eq(schema.hifzRecords.organizationId, orgId),
          gte(schema.hifzRecords.sessionDate, weekStart),
        ),
      ),

    // Classes with today's wrap status
    db.query.classes.findMany({
      where: eq(schema.classes.organizationId, orgId),
      with: { primaryTeacher: true },
    }),

    // Tuition plans
    db
      .select({ status: schema.tuitionPlans.status, cnt: count() })
      .from(schema.tuitionPlans)
      .where(eq(schema.tuitionPlans.organizationId, orgId))
      .groupBy(schema.tuitionPlans.status),
  ]);

  // Check which classes are wrapped today
  const todayAttendanceClassIds = await db
    .selectDistinct({ classId: schema.attendanceRecords.classId })
    .from(schema.attendanceRecords)
    .where(
      and(
        eq(schema.attendanceRecords.organizationId, orgId),
        eq(schema.attendanceRecords.sessionDate, today),
      ),
    );
  const wrappedSet = new Set(todayAttendanceClassIds.map(r => r.classId));

  const presentCount = attendanceRows.find(r => r.status === 'present')?.cnt ?? 0;
  const totalCount = attendanceRows.reduce((s, r) => s + Number(r.cnt), 0);
  const attendancePct = totalCount > 0 ? Math.round((Number(presentCount) / totalCount) * 100) : 0;
  const hifzWins = Number(hifzCount[0]?.cnt ?? 0);
  const classesWrapped = classes.filter(c => wrappedSet.has(c.id)).length;
  const activeTuition = Number(tuitionPlans.find(t => t.status === 'active')?.cnt ?? 0);

  return {
    attendancePct,
    hifzWins,
    classesWrapped,
    activeTuition,
    classes: classes.map(c => ({
      id: c.id,
      name: c.name,
      teacherName: c.primaryTeacher?.fullName ?? 'Unassigned',
      wrappedToday: wrappedSet.has(c.id),
    })),
  };
}

export async function getAdminStudents(orgId: string) {
  return db.query.students.findMany({
    where: eq(schema.students.organizationId, orgId),
    with: {
      enrollments: { with: { class: true } },
      guardians: true,
    },
    orderBy: (s, { asc }) => asc(s.fullName),
  });
}

export async function getAdminStudent(studentId: string, orgId: string) {
  const [student, attendance, hifz, milestones, noteCount] = await Promise.all([
    db.query.students.findFirst({
      where: and(eq(schema.students.id, studentId), eq(schema.students.organizationId, orgId)),
      with: {
        enrollments: { with: { class: true } },
        guardians: { with: { guardian: true } },
      },
    }),
    db.query.attendanceRecords.findMany({
      where: and(eq(schema.attendanceRecords.studentId, studentId), eq(schema.attendanceRecords.organizationId, orgId)),
      orderBy: (a, { desc }) => desc(a.sessionDate),
    }),
    db.query.hifzRecords.findMany({
      where: and(eq(schema.hifzRecords.studentId, studentId), eq(schema.hifzRecords.organizationId, orgId)),
      orderBy: (h, { desc }) => desc(h.sessionDate),
    }),
    db.query.hifzMilestones.findMany({
      where: and(eq(schema.hifzMilestones.studentId, studentId), eq(schema.hifzMilestones.organizationId, orgId)),
      orderBy: (m, { desc }) => desc(m.achievedDate),
    }),
    db.select({ cnt: count() }).from(schema.studentNotes)
      .where(and(eq(schema.studentNotes.studentId, studentId), eq(schema.studentNotes.organizationId, orgId), isNull(schema.studentNotes.deletedAt))),
  ]);
  const retentionFlags = getHifzRetentionFlags(hifz);
  return { student, attendance, hifz, milestones, noteCount: Number(noteCount[0]?.cnt ?? 0), retentionFlags };
}

export async function getAdminClasses(orgId: string) {
  const classes = await db.query.classes.findMany({
    where: eq(schema.classes.organizationId, orgId),
    with: { primaryTeacher: true, enrollments: true },
  });
  const today = new Date().toISOString().slice(0, 10);
  const todayWrapped = await db
    .selectDistinct({ classId: schema.attendanceRecords.classId })
    .from(schema.attendanceRecords)
    .where(and(eq(schema.attendanceRecords.organizationId, orgId), eq(schema.attendanceRecords.sessionDate, today)));
  const wrappedSet = new Set(todayWrapped.map(r => r.classId));
  return classes.map(c => ({
    id: c.id,
    name: c.name,
    teacherName: c.primaryTeacher?.fullName ?? 'Unassigned',
    studentCount: c.enrollments.length,
    wrappedToday: wrappedSet.has(c.id),
    academicYear: c.academicYear,
    deletedAt: c.deletedAt,
  }));
}

export async function getAdminTeachers(orgId: string) {
  const memberships = await db.query.memberships.findMany({
    where: and(eq(schema.memberships.organizationId, orgId), eq(schema.memberships.role, 'teacher')),
    with: { user: true },
  });
  const teacherIds = memberships.map(m => m.userId);

  const [classRows, lastSessionRows] = await Promise.all([
    db.query.classes.findMany({
      where: eq(schema.classes.organizationId, orgId),
      with: { primaryTeacher: true },
    }),
    teacherIds.length > 0
      ? db.select({ teacherId: schema.attendanceRecords.recordedBy, lastDate: max(schema.attendanceRecords.sessionDate) })
          .from(schema.attendanceRecords)
          .where(eq(schema.attendanceRecords.organizationId, orgId))
          .groupBy(schema.attendanceRecords.recordedBy)
      : Promise.resolve([]),
  ]);

  const lastSessionMap = new Map(lastSessionRows.map(r => [r.teacherId, r.lastDate]));
  const classesByTeacher = new Map<string, string[]>();
  for (const cls of classRows) {
    if (cls.primaryTeacherId) {
      const arr = classesByTeacher.get(cls.primaryTeacherId) ?? [];
      arr.push(cls.name);
      classesByTeacher.set(cls.primaryTeacherId, arr);
    }
  }

  return memberships.map(m => ({
    id: m.userId,
    name: m.user?.fullName ?? '—',
    email: m.user?.email ?? '—',
    classes: classesByTeacher.get(m.userId) ?? [],
    lastSession: lastSessionMap.get(m.userId) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------
export async function getAnnouncements(orgId: string) {
  const rows = await db
    .select({
      threadId: schema.messageThreads.id,
      createdAt: schema.messages.createdAt,
      content: schema.messages.content,
      senderUserId: schema.messages.senderUserId,
    })
    .from(schema.messageThreads)
    .innerJoin(schema.messages, eq(schema.messages.threadId, schema.messageThreads.id))
    .where(
      and(
        eq(schema.messageThreads.organizationId, orgId),
        eq(schema.messageThreads.scope, 'school_wide'),
      ),
    )
    .orderBy(desc(schema.messages.createdAt))
    .limit(20);

  const senderIds = [...new Set(rows.map(r => r.senderUserId))];
  const senders = senderIds.length > 0
    ? await db.query.users.findMany({ where: (u, { inArray }) => inArray(u.id, senderIds) })
    : [];
  const senderMap = new Map(senders.map(s => [s.id, s.fullName ?? s.email ?? '—']));

  return rows.map(r => ({
    id: r.threadId,
    content: r.content,
    createdAt: r.createdAt,
    senderName: senderMap.get(r.senderUserId) ?? '—',
  }));
}

export async function createAnnouncement(orgId: string, _userId: string, content: string) {
  const actor = await requireAdminForOrg(orgId);

  const [thread] = await db.insert(schema.messageThreads).values({
    organizationId: orgId,
    scope: 'school_wide',
    createdBy: actor.userId,
  }).returning({ id: schema.messageThreads.id });

  if (!thread) throw new Error('Failed to create thread');

  await db.insert(schema.messages).values({
    threadId: thread.id,
    senderUserId: actor.userId,
    content,
  });

  await notifyAllGuardiansInOrg(orgId, {
    type: 'announcement',
    title: 'New school announcement',
    body: content.length > 100 ? `${content.slice(0, 100)}…` : content,
    link: '/parent',
  });

  await notifyAllTeachersIfEnabled(orgId, 'adminAnnouncement', {
    type: 'announcement',
    title: 'New school announcement',
    body: content.length > 100 ? `${content.slice(0, 100)}…` : content,
    link: '/teacher',
  });

  await logActivity({
    organizationId: orgId, actorUserId: actor.userId, actorName: actor.name,
    action: 'announcement.posted', targetType: 'announcement', targetId: thread.id,
    metadata: { targetLabel: content.length > 60 ? `${content.slice(0, 60)}…` : content },
  });

  revalidatePath('/admin/announcements');
  revalidatePath('/parent');
}

export async function deleteAnnouncement(threadId: string) {
  const thread = await db.query.messageThreads.findFirst({
    where: eq(schema.messageThreads.id, threadId),
    columns: { organizationId: true },
  });
  if (!thread) return;
  await requireAdminForOrg(thread.organizationId);

  await db.delete(schema.messages).where(eq(schema.messages.threadId, threadId));
  await db.delete(schema.messageThreads)
    .where(and(eq(schema.messageThreads.id, threadId), eq(schema.messageThreads.organizationId, thread.organizationId)));
  revalidatePath('/admin/announcements');
  revalidatePath('/parent');
}

// ---------------------------------------------------------------------------
// Student CRUD
// ---------------------------------------------------------------------------
export async function createStudent(
  orgId: string,
  data: { fullName: string; dateOfBirth: string; gender?: string },
) {
  const actor = await requireAdminForOrg(orgId);

  const [row] = await db
    .insert(schema.students)
    .values({
      organizationId: orgId,
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender ?? null,
      status: 'active',
    })
    .returning({ id: schema.students.id });
  if (!row) throw new Error('Insert failed');

  await logActivity({
    organizationId: orgId, actorUserId: actor.userId, actorName: actor.name,
    action: 'student.created', targetType: 'student', targetId: row.id,
    metadata: { targetLabel: data.fullName },
  });

  revalidatePath('/admin/students');
  redirect(`/admin/students/${row.id}?notice=student_created`);
}

export async function updateStudent(
  studentId: string,
  orgId: string,
  data: { fullName: string; dateOfBirth: string; gender?: string; medicalNotes?: string },
) {
  const actor = await requireAdminForOrg(orgId);

  await db
    .update(schema.students)
    .set({
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender ?? null,
      medicalNotes: data.medicalNotes ?? null,
    })
    .where(and(eq(schema.students.id, studentId), eq(schema.students.organizationId, orgId)));

  await logActivity({
    organizationId: orgId, actorUserId: actor.userId, actorName: actor.name,
    action: 'student.updated', targetType: 'student', targetId: studentId,
    metadata: { targetLabel: data.fullName },
  });

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath('/admin/students');
  redirect(`/admin/students/${studentId}?notice=student_updated`);
}

export async function setStudentStatus(
  studentId: string,
  orgId: string,
  status: 'active' | 'inactive',
) {
  const actor = await requireAdminForOrg(orgId);

  await db
    .update(schema.students)
    .set({ status })
    .where(and(eq(schema.students.id, studentId), eq(schema.students.organizationId, orgId)));

  const student = await db.query.students.findFirst({ where: eq(schema.students.id, studentId), columns: { fullName: true } });
  await logActivity({
    organizationId: orgId, actorUserId: actor.userId, actorName: actor.name,
    action: status === 'active' ? 'student.restored' : 'student.archived', targetType: 'student', targetId: studentId,
    metadata: { targetLabel: student?.fullName ?? studentId },
  });

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath('/admin/students');
  redirect(`/admin/students/${studentId}?notice=${status === 'active' ? 'student_restored' : 'student_archived'}`);
}

// ---------------------------------------------------------------------------
// Class CRUD
// ---------------------------------------------------------------------------
export async function createClass(
  orgId: string,
  data: { name: string; gradeLevel?: string; academicYear?: string; capacity?: number; primaryTeacherId?: string },
) {
  const actor = await requireAdminForOrg(orgId);

  const [row] = await db
    .insert(schema.classes)
    .values({
      organizationId: orgId,
      name: data.name,
      gradeLevel: data.gradeLevel ?? null,
      academicYear: data.academicYear ?? null,
      capacity: data.capacity ?? null,
      primaryTeacherId: data.primaryTeacherId || null,
    })
    .returning({ id: schema.classes.id });
  if (!row) throw new Error('Insert failed');

  await logActivity({
    organizationId: orgId, actorUserId: actor.userId, actorName: actor.name,
    action: 'class.created', targetType: 'class', targetId: row.id,
    metadata: { targetLabel: data.name },
  });

  revalidatePath('/admin/classes');
  revalidatePath('/admin');
  redirect(`/admin/classes/${row.id}?notice=class_created`);
}

export async function updateClass(
  classId: string,
  orgId: string,
  data: { name: string; gradeLevel?: string; academicYear?: string; capacity?: string; primaryTeacherId?: string },
) {
  const actor = await requireAdminForOrg(orgId);

  await db
    .update(schema.classes)
    .set({
      name: data.name,
      gradeLevel: data.gradeLevel || null,
      academicYear: data.academicYear || null,
      capacity: data.capacity ? Number(data.capacity) : null,
      primaryTeacherId: data.primaryTeacherId || null,
    })
    .where(and(eq(schema.classes.id, classId), eq(schema.classes.organizationId, orgId)));

  await logActivity({
    organizationId: orgId, actorUserId: actor.userId, actorName: actor.name,
    action: 'class.updated', targetType: 'class', targetId: classId,
    metadata: { targetLabel: data.name },
  });

  revalidatePath('/admin/classes');
  revalidatePath('/admin');
  redirect(`/admin/classes/${classId}?notice=class_updated`);
}

export async function archiveClass(classId: string, orgId: string) {
  await requireAdminForOrg(orgId);

  await db
    .update(schema.classes)
    .set({ deletedAt: new Date() })
    .where(and(eq(schema.classes.id, classId), eq(schema.classes.organizationId, orgId)));
  revalidatePath('/admin/classes');
  revalidatePath('/admin');
  redirect(`/admin/classes/${classId}?notice=class_archived`);
}

export async function restoreClass(classId: string, orgId: string) {
  await requireAdminForOrg(orgId);

  await db
    .update(schema.classes)
    .set({ deletedAt: null })
    .where(and(eq(schema.classes.id, classId), eq(schema.classes.organizationId, orgId)));
  revalidatePath('/admin/classes');
  revalidatePath('/admin');
  redirect(`/admin/classes/${classId}?notice=class_restored`);
}

// ---------------------------------------------------------------------------
// Class detail + enrollment
// ---------------------------------------------------------------------------
export async function getAdminClassDetail(classId: string, orgId: string) {
  const cls = await db.query.classes.findFirst({
    where: and(eq(schema.classes.id, classId), eq(schema.classes.organizationId, orgId)),
    with: {
      primaryTeacher: true,
      enrollments: { with: { student: true } },
    },
  });

  const enrolledStudentIds = cls?.enrollments.map(e => e.studentId) ?? [];

  const [sessionRows, homework, milestones, classHifzRecords] = await Promise.all([
    db
      .select({
        sessionDate: schema.attendanceRecords.sessionDate,
        status: schema.attendanceRecords.status,
        cnt: count(),
      })
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.classId, classId),
          eq(schema.attendanceRecords.organizationId, orgId),
        ),
      )
      .groupBy(schema.attendanceRecords.sessionDate, schema.attendanceRecords.status)
      .orderBy(desc(schema.attendanceRecords.sessionDate)),
    db.query.homeworkAssignments.findMany({
      where: and(
        eq(schema.homeworkAssignments.classId, classId),
        eq(schema.homeworkAssignments.organizationId, orgId),
        eq(schema.homeworkAssignments.archived, false),
      ),
      orderBy: (h, { desc }) => desc(h.dueDate),
      limit: 10,
    }),
    enrolledStudentIds.length === 0
      ? Promise.resolve([])
      : db.query.hifzMilestones.findMany({
          where: and(
            inArray(schema.hifzMilestones.studentId, enrolledStudentIds),
            eq(schema.hifzMilestones.organizationId, orgId),
          ),
          with: { student: { columns: { fullName: true } } },
          orderBy: (m, { desc }) => desc(m.achievedDate),
          limit: 10,
        }),
    enrolledStudentIds.length === 0
      ? Promise.resolve([])
      : db.query.hifzRecords.findMany({
          where: and(
            inArray(schema.hifzRecords.studentId, enrolledStudentIds),
            eq(schema.hifzRecords.organizationId, orgId),
          ),
          with: { student: { columns: { fullName: true } } },
          orderBy: (h, { desc }) => desc(h.sessionDate),
        }),
  ]);

  // Pivot attendance counts by session date
  const sessionMap = new Map<string, { present: number; absent: number; late: number; excused: number }>();
  for (const row of sessionRows) {
    const entry = sessionMap.get(row.sessionDate) ?? { present: 0, absent: 0, late: 0, excused: 0 };
    const key = row.status as keyof typeof entry;
    if (key in entry) entry[key] = Number(row.cnt);
    sessionMap.set(row.sessionDate, entry);
  }
  const sessions = [...sessionMap.entries()]
    .map(([date, c]) => ({ date, ...c, total: c.present + c.absent + c.late + c.excused }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Latest hifz record + retention flags per enrolled student (records already sorted desc by sessionDate)
  const hifzByStudent = new Map<string, typeof classHifzRecords>();
  for (const rec of classHifzRecords) {
    const list = hifzByStudent.get(rec.studentId) ?? [];
    list.push(rec);
    hifzByStudent.set(rec.studentId, list);
  }
  const hifzProgress = (cls?.enrollments ?? []).map(e => {
    const records = hifzByStudent.get(e.studentId) ?? [];
    return {
      studentId: e.studentId,
      studentName: e.student?.fullName ?? 'Student',
      latest: records[0] ?? null,
      retentionFlags: getHifzRetentionFlags(records),
    };
  });

  return { cls, sessions, homework, milestones, hifzProgress };
}

async function requireAdminForClassStudent(classId: string, studentId: string) {
  const [cls, student] = await Promise.all([
    db.query.classes.findFirst({
      where: eq(schema.classes.id, classId),
      columns: { organizationId: true },
    }),
    db.query.students.findFirst({
      where: eq(schema.students.id, studentId),
      columns: { organizationId: true },
    }),
  ]);

  if (!cls || !student || cls.organizationId !== student.organizationId) {
    throw new Error('Forbidden');
  }

  await requireAdminForOrg(cls.organizationId);
  return { orgId: cls.organizationId };
}

export async function enrollStudent(classId: string, studentId: string) {
  await requireAdminForClassStudent(classId, studentId);

  await db.insert(schema.classEnrollments).values({ classId, studentId }).onConflictDoNothing();
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath(`/admin/students/${studentId}`);
  redirect(`/admin/classes/${classId}?notice=student_enrolled`);
}

export async function unenrollStudent(classId: string, studentId: string) {
  await requireAdminForClassStudent(classId, studentId);

  await db
    .delete(schema.classEnrollments)
    .where(
      and(
        eq(schema.classEnrollments.classId, classId),
        eq(schema.classEnrollments.studentId, studentId),
      ),
    );
  revalidatePath(`/admin/classes/${classId}`);
  redirect(`/admin/classes/${classId}?notice=student_unenrolled`);
}

// ---------------------------------------------------------------------------
// Guardian linking
// ---------------------------------------------------------------------------
export async function linkGuardian(
  studentId: string,
  orgId: string,
  email: string,
  relationship: string,
  isPrimary: boolean,
  receivesNotifications: boolean,
) {
  const actor = await requireAdminForOrg(orgId);
  const studentForOrg = await db.query.students.findFirst({
    where: and(eq(schema.students.id, studentId), eq(schema.students.organizationId, orgId)),
    columns: { fullName: true },
  });
  if (!studentForOrg) throw new Error('Forbidden');

  let guardianUserId: string;

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (existing) {
    guardianUserId = existing.id;
    await db
      .insert(schema.memberships)
      .values({ userId: guardianUserId, organizationId: orgId, role: 'parent', status: 'active' })
      .onConflictDoNothing();
  } else {
    const serviceClient = await createSupabaseServiceClient();
    const result = await serviceClient.auth.admin.createUser({ email, email_confirm: true });
    if (result.error || !result.data.user) {
      redirect(`/admin/students/${studentId}?notice=guardian_error`);
    }
    guardianUserId = result.data.user.id;
    await db
      .insert(schema.users)
      .values({ id: guardianUserId, email, fullName: email.split('@')[0] ?? email })
      .onConflictDoNothing();
    await db
      .insert(schema.memberships)
      .values({ userId: guardianUserId, organizationId: orgId, role: 'parent', status: 'active' })
      .onConflictDoNothing();
  }

  // Skip if already linked
  const existingLink = await db.query.studentGuardians.findFirst({
    where: and(
      eq(schema.studentGuardians.studentId, studentId),
      eq(schema.studentGuardians.guardianUserId, guardianUserId),
    ),
  });
  if (!existingLink) {
    await db.insert(schema.studentGuardians).values({
      studentId,
      guardianUserId,
      relationship: relationship || null,
      isPrimary,
      receivesNotifications,
    });

    await createNotification({
      organizationId: orgId,
      userId: guardianUserId,
      type: 'guardian_linked',
      title: `You've been linked to ${studentForOrg.fullName}'s account`,
      body: 'You can now see attendance, hifz progress, and tuition in your parent portal.',
      link: `/parent/${studentId}`,
    });

    await logActivity({
      organizationId: orgId, actorUserId: actor.userId, actorName: actor.name,
      action: 'guardian.linked', targetType: 'guardian', targetId: guardianUserId,
      metadata: { targetLabel: `${email} → ${studentForOrg.fullName}` },
    });
  }

  revalidatePath(`/admin/students/${studentId}`);
  redirect(`/admin/students/${studentId}?notice=guardian_linked`);
}

export async function unlinkGuardian(linkId: string, studentId: string) {
  const link = await db.query.studentGuardians.findFirst({
    where: and(eq(schema.studentGuardians.id, linkId), eq(schema.studentGuardians.studentId, studentId)),
    with: {
      guardian: { columns: { fullName: true } },
      student: { columns: { organizationId: true } },
    },
  });
  if (!link?.student) throw new Error('Forbidden');

  const actor = await requireAdminForOrg(link.student.organizationId);
  await db.delete(schema.studentGuardians)
    .where(and(eq(schema.studentGuardians.id, linkId), eq(schema.studentGuardians.studentId, studentId)));

  await logActivity({
    organizationId: link.student.organizationId, actorUserId: actor.userId, actorName: actor.name,
    action: 'guardian.unlinked', targetType: 'guardian', targetId: link?.guardianUserId ?? null,
    metadata: { targetLabel: link?.guardian?.fullName ?? 'a guardian' },
  });

  revalidatePath(`/admin/students/${studentId}`);
  redirect(`/admin/students/${studentId}?notice=guardian_unlinked`);
}

export async function getAdminParents(orgId: string) {
  const rows = await db
    .select({
      userId: schema.memberships.userId,
      parentName: schema.users.fullName,
      parentEmail: schema.users.email,
      studentId: schema.studentGuardians.studentId,
      studentName: schema.students.fullName,
      relationship: schema.studentGuardians.relationship,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .leftJoin(schema.studentGuardians, eq(schema.studentGuardians.guardianUserId, schema.memberships.userId))
    .leftJoin(schema.students, eq(schema.students.id, schema.studentGuardians.studentId))
    .where(
      and(
        eq(schema.memberships.organizationId, orgId),
        eq(schema.memberships.role, 'parent'),
        eq(schema.memberships.status, 'active'),
      ),
    )
    .orderBy(schema.users.fullName);

  // Group rows by parent
  const map = new Map<string, { userId: string; name: string; email: string | null; students: { id: string; name: string; relationship: string | null }[] }>();
  for (const row of rows) {
    if (!map.has(row.userId)) {
      map.set(row.userId, { userId: row.userId, name: row.parentName, email: row.parentEmail, students: [] });
    }
    if (row.studentId && row.studentName) {
      map.get(row.userId)!.students.push({ id: row.studentId, name: row.studentName, relationship: row.relationship });
    }
  }
  return [...map.values()];
}

// ---------------------------------------------------------------------------
// Adab Growth Journal — school-wide highlights
// ---------------------------------------------------------------------------
export async function getAdminAdabHighlights(orgId: string) {
  return db.query.studentNotes.findMany({
    where: and(
      eq(schema.studentNotes.organizationId, orgId),
      eq(schema.studentNotes.noteType, 'praise'),
      isNull(schema.studentNotes.deletedAt),
    ),
    with: {
      student: { columns: { fullName: true } },
      class: { columns: { name: true } },
    },
    orderBy: (n, { desc }) => desc(n.createdAt),
    limit: 30,
  });
}

// ---------------------------------------------------------------------------
// Attendance Follow-Up — absence risk flags
// ---------------------------------------------------------------------------
export async function getAttendanceFollowUp(orgId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceStr = since.toISOString().slice(0, 10);
  const thirtyDaysAgoStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  const yesterdayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const records = await db.query.attendanceRecords.findMany({
    where: and(
      eq(schema.attendanceRecords.organizationId, orgId),
      gte(schema.attendanceRecords.sessionDate, sinceStr),
    ),
    with: { student: { columns: { fullName: true, status: true } } },
    orderBy: (a, { desc }) => desc(a.sessionDate),
  });

  const byStudent = new Map<string, typeof records>();
  for (const r of records) {
    if (!r.student || r.student.status !== 'active') continue;
    const list = byStudent.get(r.studentId) ?? [];
    list.push(r);
    byStudent.set(r.studentId, list);
  }

  const followUps = [];
  for (const [studentId, studentRecords] of byStudent) {
    const absences = studentRecords.filter(r => r.status === 'absent');
    if (absences.length === 0) continue;

    const twoInARow = studentRecords.length >= 2
      && studentRecords[0]!.status === 'absent'
      && studentRecords[1]!.status === 'absent';
    const threeIn30Days = absences.filter(a => a.sessionDate >= thirtyDaysAgoStr).length >= 3;
    const noResponse = absences.some(a => !a.guardianReason && a.sessionDate <= yesterdayStr);

    if (!twoInARow && !threeIn30Days && !noResponse) continue;

    followUps.push({
      studentId,
      studentName: studentRecords[0]!.student!.fullName,
      twoInARow,
      threeIn30Days,
      noResponse,
      recentAbsences: absences.slice(0, 5).map(a => ({
        id: a.id,
        sessionDate: a.sessionDate,
        guardianReason: a.guardianReason,
        guardianReasonNote: a.guardianReasonNote,
      })),
    });
  }

  return followUps.sort((a, b) => a.studentName.localeCompare(b.studentName));
}

// ---------------------------------------------------------------------------
// Family Household View — derived from guardian links, no dedicated table
// ---------------------------------------------------------------------------
export async function getFamilyProfile(guardianUserId: string, orgId: string) {
  const guardian = await db.query.users.findFirst({
    where: eq(schema.users.id, guardianUserId),
  });
  if (!guardian) return null;

  const guardianLinks = await db.query.studentGuardians.findMany({
    where: eq(schema.studentGuardians.guardianUserId, guardianUserId),
    with: {
      student: {
        with: {
          enrollments: { with: { class: true } },
          guardians: { with: { guardian: true } },
        },
      },
    },
  });

  const students = guardianLinks
    .map(l => l.student)
    .filter((s): s is NonNullable<typeof s> => !!s && s.organizationId === orgId);

  // Co-guardians — everyone else linked to any of this family's students.
  const coGuardianMap = new Map<string, { id: string; fullName: string; email: string | null }>();
  for (const student of students) {
    for (const link of student.guardians) {
      if (link.guardian && link.guardianUserId !== guardianUserId) {
        coGuardianMap.set(link.guardianUserId, {
          id: link.guardianUserId,
          fullName: link.guardian.fullName,
          email: link.guardian.email,
        });
      }
    }
  }

  const studentIds = students.map(s => s.id);

  const [tuitionPlans, recentNotes, recentHomework, recentHifz, attendanceFollowUp] = await Promise.all([
    studentIds.length === 0 ? Promise.resolve([]) : db.query.tuitionPlans.findMany({
      where: and(inArray(schema.tuitionPlans.studentId, studentIds), ne(schema.tuitionPlans.status, 'cancelled')),
      with: { student: { columns: { fullName: true } } },
      orderBy: (t, { desc }) => desc(t.createdAt),
    }),
    studentIds.length === 0 ? Promise.resolve([]) : db.query.studentNotes.findMany({
      where: and(inArray(schema.studentNotes.studentId, studentIds), isNull(schema.studentNotes.deletedAt)),
      with: { student: { columns: { fullName: true } } },
      orderBy: (n, { desc }) => desc(n.createdAt),
      limit: 5,
    }),
    studentIds.length === 0 ? Promise.resolve([]) : (async () => {
      const classIds = [...new Set(students.flatMap(s => s.enrollments.map(e => e.classId)))];
      if (classIds.length === 0) return [];
      return db.query.homeworkAssignments.findMany({
        where: and(inArray(schema.homeworkAssignments.classId, classIds), eq(schema.homeworkAssignments.archived, false)),
        orderBy: (h, { desc }) => desc(h.dueDate),
        limit: 5,
      });
    })(),
    studentIds.length === 0 ? Promise.resolve([]) : db.query.hifzRecords.findMany({
      where: inArray(schema.hifzRecords.studentId, studentIds),
      with: { student: { columns: { fullName: true } } },
      orderBy: (h, { desc }) => desc(h.sessionDate),
      limit: 5,
    }),
    getAttendanceFollowUp(orgId),
  ]);

  const familyAttendanceConcerns = attendanceFollowUp.filter(f => studentIds.includes(f.studentId));

  return {
    guardian,
    coGuardians: [...coGuardianMap.values()],
    students: students.map(s => ({
      id: s.id,
      fullName: s.fullName,
      status: s.status,
      className: s.enrollments[0]?.class?.name ?? 'Not enrolled',
    })),
    tuitionPlans,
    recentNotes,
    recentHomework,
    recentHifz,
    attendanceConcerns: familyAttendanceConcerns,
  };
}

// ---------------------------------------------------------------------------
// Tuition management
// ---------------------------------------------------------------------------

export async function getAdminTuition(orgId: string) {
  const students = await db.query.students.findMany({
    where: and(eq(schema.students.organizationId, orgId), eq(schema.students.status, 'active')),
    with: {
      tuitionPlans: {
        with: {
          guardian: { columns: { fullName: true, email: true } },
          payments: { orderBy: (p, { desc }) => desc(p.paidAt), limit: 1 },
        },
        orderBy: (t, { desc }) => desc(t.createdAt),
      },
    },
    orderBy: (s, { asc }) => asc(s.fullName),
  });
  // Prefer the most recent non-cancelled plan for the ledger summary row.
  return students.map(s => ({
    ...s,
    tuitionPlans: [
      ...s.tuitionPlans.filter(p => p.status !== 'cancelled'),
      ...s.tuitionPlans.filter(p => p.status === 'cancelled'),
    ],
  }));
}

// Core reminder logic shared by the admin "Send reminders" button and the
// daily cron job. `throttleDays` (cron only) skips plans reminded recently so
// the same family isn't emailed every day; the admin-triggered path passes no
// throttle since a human is deciding to send right now.
async function runTuitionReminders(orgId: string, opts: { planId?: string; throttleDays?: number } = {}) {
  const cutoff = opts.throttleDays ? new Date(Date.now() - opts.throttleDays * 24 * 60 * 60 * 1000) : null;

  const plans = await db.query.tuitionPlans.findMany({
    where: opts.planId
      ? and(eq(schema.tuitionPlans.id, opts.planId), eq(schema.tuitionPlans.organizationId, orgId), eq(schema.tuitionPlans.status, 'past_due'))
      : and(eq(schema.tuitionPlans.organizationId, orgId), eq(schema.tuitionPlans.status, 'past_due')),
    with: {
      student: { columns: { fullName: true } },
      guardian: { columns: { fullName: true, email: true } },
    },
  });

  const eligible = cutoff
    ? plans.filter(p => !p.lastReminderSentAt || new Date(p.lastReminderSentAt) < cutoff)
    : plans;
  if (eligible.length === 0) return { sent: 0 };

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const resend = apiKey ? new Resend(apiKey) : null;
  const appUrl = env.NEXT_PUBLIC_APP_URL;

  let sent = 0;
  for (const plan of eligible) {
    if (!plan.guardianUserId) continue;
    const studentName = plan.student?.fullName ?? 'your child';
    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: plan.currency }).format(plan.amountCents / 100);

    await createNotification({
      organizationId: orgId,
      userId: plan.guardianUserId,
      type: 'payment_failed',
      title: 'Tuition payment reminder',
      body: `${studentName}'s tuition payment of ${amount} is past due. Please update your payment method to avoid interruption.`,
      link: `/parent/${plan.studentId}`,
    });

    if (resend && plan.guardian?.email) {
      await resend.emails.send({
        from: fromEmail,
        to: plan.guardian.email,
        subject: `Tuition payment reminder — ${studentName}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
            <p style="font-size:16px">Assalamu alaykum, ${plan.guardian.fullName ?? 'dear parent'},</p>
            <p>This is a friendly reminder that <strong>${studentName}</strong>'s tuition payment of <strong>${amount}</strong> is past due.</p>
            <p>Please update your payment method to keep billing active:</p>
            <p><a href="${appUrl}/parent/${plan.studentId}" style="color:#7c5cbf">Update billing →</a></p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="font-size:13px;color:#888">JazakAllah khair — Talibly</p>
          </div>
        `,
      });
    }

    await db.update(schema.tuitionPlans).set({ lastReminderSentAt: new Date() }).where(eq(schema.tuitionPlans.id, plan.id));
    sent++;
  }

  return { sent };
}

// Admin-triggered: remind every family currently past due, right now.
export async function sendTuitionReminders(orgId: string) {
  await requireAdminForOrg(orgId);

  const { sent } = await runTuitionReminders(orgId);
  revalidatePath('/admin/tuition');
  redirect(`/admin/tuition?notice=${sent > 0 ? 'reminders_sent' : 'no_reminders_due'}`);
}

// Admin-triggered: remind a single family.
export async function sendSingleTuitionReminder(planId: string, orgId: string) {
  await requireAdminForOrg(orgId);

  const { sent } = await runTuitionReminders(orgId, { planId });
  revalidatePath('/admin/tuition');
  redirect(`/admin/tuition?notice=${sent > 0 ? 'reminders_sent' : 'no_reminders_due'}`);
}

// Cron-triggered (see /api/cron/tuition-reminders): throttled so the same
// family is reminded at most once per week.
export async function sendTuitionRemindersThrottled(orgId: string, throttleDays = 7) {
  return runTuitionReminders(orgId, { throttleDays });
}

export async function getAdminStudentTuition(studentId: string, orgId: string) {
  const [student, plans] = await Promise.all([
    db.query.students.findFirst({
      where: and(eq(schema.students.id, studentId), eq(schema.students.organizationId, orgId)),
    }),
    db.query.tuitionPlans.findMany({
      where: and(eq(schema.tuitionPlans.studentId, studentId), eq(schema.tuitionPlans.organizationId, orgId)),
      with: { payments: { orderBy: (p, { desc }) => desc(p.paidAt) }, guardian: true },
      orderBy: (t, { desc }) => desc(t.createdAt),
    }),
  ]);
  return { student, plans };
}

// Other active students sharing at least one guardian with this student —
// used to offer a sibling discount when creating a tuition plan.
export async function getSiblingStudents(studentId: string, orgId: string) {
  const guardianLinks = await db.query.studentGuardians.findMany({
    where: eq(schema.studentGuardians.studentId, studentId),
    columns: { guardianUserId: true },
  });
  const guardianIds = guardianLinks.map(g => g.guardianUserId);
  if (guardianIds.length === 0) return [];

  const siblingLinks = await db.query.studentGuardians.findMany({
    where: inArray(schema.studentGuardians.guardianUserId, guardianIds),
    with: { student: { columns: { id: true, fullName: true, status: true, organizationId: true } } },
  });

  const seen = new Set<string>([studentId]);
  const siblings: { id: string; fullName: string }[] = [];
  for (const link of siblingLinks) {
    const s = link.student;
    if (!s || seen.has(s.id) || s.status !== 'active' || s.organizationId !== orgId) continue;
    seen.add(s.id);
    siblings.push({ id: s.id, fullName: s.fullName });
  }
  return siblings;
}

export async function createTuitionPlan(
  orgId: string,
  studentId: string,
  data: {
    amountCents: number;
    frequency: 'monthly' | 'annual' | 'one_time';
    startDate?: string;
    slidingScaleNotes?: string;
    guardianUserId: string;
    guardianEmail: string;
    studentName: string;
    discountType?: 'percent' | 'fixed';
    discountValue?: number;
    discountReason?: string;
  },
) {
  const actor = await requireAdminForOrg(orgId);
  const [studentForOrg, guardianMembership, guardianLink] = await Promise.all([
    db.query.students.findFirst({
      where: and(eq(schema.students.id, studentId), eq(schema.students.organizationId, orgId)),
      columns: { id: true },
    }),
    db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, data.guardianUserId),
        eq(schema.memberships.organizationId, orgId),
        eq(schema.memberships.role, 'parent'),
        eq(schema.memberships.status, 'active'),
      ),
      columns: { id: true },
    }),
    db.query.studentGuardians.findFirst({
      where: and(
        eq(schema.studentGuardians.studentId, studentId),
        eq(schema.studentGuardians.guardianUserId, data.guardianUserId),
      ),
      columns: { id: true },
    }),
  ]);

  if (!studentForOrg || !guardianMembership || !guardianLink) {
    throw new Error('Forbidden');
  }

  const hasDiscount = !!data.discountType && !!data.discountValue && data.discountValue > 0;
  const discountCents = !hasDiscount
    ? 0
    : data.discountType === 'percent'
      ? Math.round(data.amountCents * (data.discountValue! / 100))
      : Math.round(data.discountValue! * 100);
  const finalAmountCents = Math.max(0, data.amountCents - discountCents);

  const customer = await stripe.customers.create({
    email: data.guardianEmail,
    metadata: { orgId, studentId, guardianUserId: data.guardianUserId },
  });

  const interval = data.frequency === 'annual' ? 'year' : 'month';
  const isRecurring = data.frequency !== 'one_time';

  const price = await stripe.prices.create({
    unit_amount: finalAmountCents,
    currency: 'usd',
    ...(isRecurring
      ? { recurring: { interval } }
      : {}),
    product_data: { name: `Tuition — ${data.studentName}` },
  });

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [{ price: price.id, quantity: 1 }],
    mode: isRecurring ? 'subscription' : 'payment',
    success_url: `${appUrl}/admin/tuition/${studentId}?payment=success`,
    cancel_url: `${appUrl}/admin/tuition/${studentId}`,
    metadata: { planId: '' },
  });

  const [plan] = await db
    .insert(schema.tuitionPlans)
    .values({
      organizationId: orgId,
      studentId,
      guardianUserId: data.guardianUserId,
      amountCents: finalAmountCents,
      baseAmountCents: hasDiscount ? data.amountCents : null,
      discountType: hasDiscount ? data.discountType : null,
      discountValue: hasDiscount ? data.discountValue : null,
      discountReason: hasDiscount ? (data.discountReason?.trim() || 'Sibling discount') : null,
      currency: 'USD',
      frequency: data.frequency,
      startDate: data.startDate ?? null,
      slidingScaleNotes: data.slidingScaleNotes ?? null,
      status: 'pending_payment',
      stripeCustomerId: customer.id,
      stripeCheckoutSessionId: session.id,
    })
    .returning({ id: schema.tuitionPlans.id });

  if (!plan) throw new Error('Failed to create tuition plan');

  await stripe.checkout.sessions.update(session.id, {
    metadata: { planId: plan.id },
  });

  const isSiblingDiscount = hasDiscount && /sibling/i.test(data.discountReason ?? 'Sibling discount');
  await logActivity({
    organizationId: orgId, actorUserId: actor.userId, actorName: actor.name,
    action: hasDiscount ? (isSiblingDiscount ? 'sibling_discount.applied' : 'tuition_assistance.applied') : 'tuition_plan.created',
    targetType: 'tuition_plan', targetId: plan.id,
    metadata: { targetLabel: data.studentName },
  });

  revalidatePath(`/admin/tuition/${studentId}`);
  revalidatePath('/admin/tuition');
  redirect(`/admin/tuition/${studentId}?checkout_url=${encodeURIComponent(session.url ?? '')}`);
}

// ---------------------------------------------------------------------------
// Admin Insights Dashboard
// ---------------------------------------------------------------------------
export async function getAdminInsights(orgId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    studentCount,
    teacherCount,
    parentCount,
    monthAttendance,
    collectedThisMonth,
    collectedAllTime,
    planStatusBreakdown,
    recentPayments,
    attendanceByClass,
    milestonesThisMonth,
  ] = await Promise.all([
    db.select({ cnt: count() }).from(schema.students)
      .where(and(eq(schema.students.organizationId, orgId), eq(schema.students.status, 'active'))),

    db.select({ cnt: count() }).from(schema.memberships)
      .where(and(
        eq(schema.memberships.organizationId, orgId),
        eq(schema.memberships.role, 'teacher'),
        eq(schema.memberships.status, 'active'),
      )),

    db.select({ cnt: count() }).from(schema.memberships)
      .where(and(
        eq(schema.memberships.organizationId, orgId),
        eq(schema.memberships.role, 'parent'),
        eq(schema.memberships.status, 'active'),
      )),

    db.select({ status: schema.attendanceRecords.status, cnt: count() })
      .from(schema.attendanceRecords)
      .where(and(
        eq(schema.attendanceRecords.organizationId, orgId),
        gte(schema.attendanceRecords.sessionDate, monthStart),
      ))
      .groupBy(schema.attendanceRecords.status),

    db.select({ total: sum(schema.payments.amountCents) })
      .from(schema.payments)
      .where(and(
        eq(schema.payments.organizationId, orgId),
        eq(schema.payments.status, 'succeeded'),
        gte(schema.payments.paidAt, monthStartDate),
      )),

    db.select({ total: sum(schema.payments.amountCents) })
      .from(schema.payments)
      .where(and(
        eq(schema.payments.organizationId, orgId),
        eq(schema.payments.status, 'succeeded'),
      )),

    db.select({
      status: schema.tuitionPlans.status,
      cnt: count(),
      totalCents: sum(schema.tuitionPlans.amountCents),
    })
      .from(schema.tuitionPlans)
      .where(eq(schema.tuitionPlans.organizationId, orgId))
      .groupBy(schema.tuitionPlans.status),

    db.select({
      paymentId: schema.payments.id,
      amountCents: schema.payments.amountCents,
      currency: schema.payments.currency,
      paidAt: schema.payments.paidAt,
      receiptUrl: schema.payments.receiptUrl,
      studentName: schema.students.fullName,
      payerName: schema.users.fullName,
    })
      .from(schema.payments)
      .innerJoin(schema.tuitionPlans, eq(schema.tuitionPlans.id, schema.payments.tuitionPlanId))
      .innerJoin(schema.students, eq(schema.students.id, schema.tuitionPlans.studentId))
      .innerJoin(schema.users, eq(schema.users.id, schema.payments.payerUserId))
      .where(and(
        eq(schema.payments.organizationId, orgId),
        eq(schema.payments.status, 'succeeded'),
      ))
      .orderBy(desc(schema.payments.paidAt))
      .limit(5),

    db.select({
      classId: schema.attendanceRecords.classId,
      className: schema.classes.name,
      status: schema.attendanceRecords.status,
      cnt: count(),
    })
      .from(schema.attendanceRecords)
      .innerJoin(schema.classes, eq(schema.classes.id, schema.attendanceRecords.classId))
      .where(and(
        eq(schema.attendanceRecords.organizationId, orgId),
        gte(schema.attendanceRecords.sessionDate, monthStart),
      ))
      .groupBy(schema.attendanceRecords.classId, schema.classes.name, schema.attendanceRecords.status),

    db.select({ cnt: count() })
      .from(schema.hifzMilestones)
      .where(and(
        eq(schema.hifzMilestones.organizationId, orgId),
        gte(schema.hifzMilestones.achievedDate, monthStart),
      )),
  ]);

  const presentCnt = Number(monthAttendance.find(r => r.status === 'present')?.cnt ?? 0);
  const totalAtt = monthAttendance.reduce((s, r) => s + Number(r.cnt), 0);
  const attendanceRatePct = totalAtt > 0 ? Math.round((presentCnt / totalAtt) * 100) : 0;

  const pendingCount = Number(planStatusBreakdown.find(p => p.status === 'pending_payment')?.cnt ?? 0);
  const outstandingCents = planStatusBreakdown
    .filter(p => p.status === 'pending_payment' || p.status === 'past_due')
    .reduce((s, p) => s + Number(p.totalCents ?? 0), 0);

  const classSummaryMap = new Map<string, { className: string; present: number; late: number; absent: number; excused: number }>();
  for (const row of attendanceByClass) {
    if (!classSummaryMap.has(row.classId)) {
      classSummaryMap.set(row.classId, { className: row.className, present: 0, late: 0, absent: 0, excused: 0 });
    }
    const entry = classSummaryMap.get(row.classId)!;
    if (row.status === 'present') entry.present += Number(row.cnt);
    else if (row.status === 'late') entry.late += Number(row.cnt);
    else if (row.status === 'absent') entry.absent += Number(row.cnt);
    else if (row.status === 'excused') entry.excused += Number(row.cnt);
  }

  return {
    totalStudents: Number(studentCount[0]?.cnt ?? 0),
    activeTeachers: Number(teacherCount[0]?.cnt ?? 0),
    activeParents: Number(parentCount[0]?.cnt ?? 0),
    attendanceRatePct,
    totalAttendanceRecords: totalAtt,
    collectedThisMonthCents: Number(collectedThisMonth[0]?.total ?? 0),
    collectedAllTimeCents: Number(collectedAllTime[0]?.total ?? 0),
    outstandingCents,
    pendingCount,
    planStatusBreakdown: planStatusBreakdown.map(p => ({
      status: p.status,
      count: Number(p.cnt),
      totalCents: Number(p.totalCents ?? 0),
    })),
    recentPayments,
    classSummary: [...classSummaryMap.values()],
    milestonesThisMonth: Number(milestonesThisMonth[0]?.cnt ?? 0),
    monthLabel: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  };
}

// ---------------------------------------------------------------------------
// Board Meeting Pack — consolidated report for principals/board members
// ---------------------------------------------------------------------------
export async function getBoardPack(orgId: string) {
  const [insights, activeClassesRow, attendanceFollowUp, adabHighlights, recentLeads, notificationStats, failedPastDuePayments] = await Promise.all([
    getAdminInsights(orgId),
    db.select({ cnt: count() }).from(schema.classes)
      .where(and(eq(schema.classes.organizationId, orgId), sql`${schema.classes.deletedAt} IS NULL`)),
    getAttendanceFollowUp(orgId),
    getAdminAdabHighlights(orgId),
    db.select().from(schema.contactSubmissions)
      .orderBy(desc(schema.contactSubmissions.createdAt))
      .limit(5),
    db.select({
      total: count(),
      read: sum(sql`case when ${schema.notifications.readAt} is not null then 1 else 0 end`),
    }).from(schema.notifications).where(eq(schema.notifications.organizationId, orgId)),
    db.select({ cnt: count() }).from(schema.payments)
      .where(and(eq(schema.payments.organizationId, orgId), eq(schema.payments.status, 'failed'))),
  ]);

  const repeatedAbsenceStudents = attendanceFollowUp.filter(f => f.twoInARow || f.threeIn30Days);

  const totalNotifications = Number(notificationStats[0]?.total ?? 0);
  const readNotifications = Number(notificationStats[0]?.read ?? 0);
  const notificationReadRatePct = totalNotifications > 0 ? Math.round((readNotifications / totalNotifications) * 100) : null;

  return {
    ...insights,
    activeClasses: Number(activeClassesRow[0]?.cnt ?? 0),
    repeatedAbsenceStudents,
    adabHighlights: adabHighlights.slice(0, 5),
    recentLeads,
    notificationReadRatePct,
    failedPastDuePaymentsCount: Number(failedPastDuePayments[0]?.cnt ?? 0)
      + (insights.planStatusBreakdown.find(p => p.status === 'past_due')?.count ?? 0),
  };
}

export async function cancelTuitionPlan(planId: string, orgId: string, studentId: string) {
  await requireAdminForOrg(orgId);

  const plan = await db.query.tuitionPlans.findFirst({
    where: and(eq(schema.tuitionPlans.id, planId), eq(schema.tuitionPlans.organizationId, orgId)),
  });
  if (!plan) return;

  if (plan.stripeSubscriptionId) {
    await stripe.subscriptions.cancel(plan.stripeSubscriptionId);
  }

  await db
    .update(schema.tuitionPlans)
    .set({ status: 'cancelled' })
    .where(eq(schema.tuitionPlans.id, planId));

  revalidatePath(`/admin/tuition/${studentId}`);
  revalidatePath('/admin/tuition');
  redirect(`/admin/tuition/${studentId}?notice=plan_cancelled`);
}

// ---------------------------------------------------------------------------
// Trial Class / Placement Assessment
// ---------------------------------------------------------------------------
export async function getAdminTrials(orgId: string) {
  return db.query.trialPlacements.findMany({
    where: eq(schema.trialPlacements.organizationId, orgId),
    with: {
      assignedTeacher: { columns: { fullName: true } },
      recommendedClass: { columns: { name: true } },
    },
    orderBy: (t, { desc }) => desc(t.createdAt),
  });
}

export async function getTrialDetail(trialId: string, orgId: string) {
  return db.query.trialPlacements.findFirst({
    where: and(eq(schema.trialPlacements.id, trialId), eq(schema.trialPlacements.organizationId, orgId)),
    with: {
      assignedTeacher: { columns: { fullName: true } },
      recommendedClass: { columns: { name: true } },
      convertedStudent: { columns: { fullName: true } },
    },
  });
}

export async function getRecentLeadsForTrial() {
  return db.select().from(schema.contactSubmissions)
    .orderBy(desc(schema.contactSubmissions.createdAt))
    .limit(20);
}

export async function createTrialPlacement(
  orgId: string,
  _createdBy: string,
  data: {
    studentFirstName: string;
    studentLastName: string;
    guardianName: string;
    guardianEmail: string;
    guardianPhone?: string;
    scheduledDate?: string;
    assignedTeacherId?: string;
    contactSubmissionId?: string;
  },
) {
  const actor = await requireAdminForOrg(orgId);

  const [row] = await db
    .insert(schema.trialPlacements)
    .values({
      organizationId: orgId,
      studentFirstName: data.studentFirstName,
      studentLastName: data.studentLastName,
      guardianName: data.guardianName,
      guardianEmail: data.guardianEmail,
      guardianPhone: data.guardianPhone || null,
      scheduledDate: data.scheduledDate || null,
      assignedTeacherId: data.assignedTeacherId || null,
      contactSubmissionId: data.contactSubmissionId || null,
      createdBy: actor.userId,
    })
    .returning({ id: schema.trialPlacements.id });
  if (!row) throw new Error('Insert failed');

  if (data.assignedTeacherId) {
    await notifyTeacherIfEnabled(data.assignedTeacherId, orgId, 'trialAssigned', {
      type: 'trial_assigned',
      title: `New trial assigned: ${data.studentFirstName} ${data.studentLastName}`,
      body: 'Assess this trial student and recommend a class.',
      link: '/teacher/trials',
    });
  }

  revalidatePath('/admin/trials');
  redirect(`/admin/trials/${row.id}?notice=trial_created`);
}

export async function cancelTrialPlacement(trialId: string, orgId: string) {
  await requireAdminForOrg(orgId);

  await db.update(schema.trialPlacements)
    .set({ status: 'cancelled' })
    .where(and(eq(schema.trialPlacements.id, trialId), eq(schema.trialPlacements.organizationId, orgId)));
  revalidatePath(`/admin/trials/${trialId}`);
  revalidatePath('/admin/trials');
  redirect(`/admin/trials/${trialId}?notice=trial_cancelled`);
}

export async function convertTrialToStudent(
  trialId: string,
  orgId: string,
  data: { dateOfBirth: string; classId: string },
) {
  const actor = await requireAdminForOrg(orgId);

  const trial = await db.query.trialPlacements.findFirst({
    where: and(eq(schema.trialPlacements.id, trialId), eq(schema.trialPlacements.organizationId, orgId)),
  });
  if (!trial) redirect('/admin/trials');

  const targetClass = await db.query.classes.findFirst({
    where: and(eq(schema.classes.id, data.classId), eq(schema.classes.organizationId, orgId)),
    columns: { id: true },
  });
  if (!targetClass) throw new Error('Forbidden');

  // Resolve guardian: link existing by email or create silently (no invite email)
  let guardianUserId: string;
  const existingUser = await db.query.users.findFirst({ where: eq(schema.users.email, trial.guardianEmail) });
  if (existingUser) {
    guardianUserId = existingUser.id;
  } else {
    const serviceClient = await createSupabaseServiceClient();
    const result = await serviceClient.auth.admin.createUser({ email: trial.guardianEmail, email_confirm: true });
    if (result.error || !result.data.user) redirect(`/admin/trials/${trialId}?notice=trial_convert_error`);
    guardianUserId = result.data.user.id;
    await db.insert(schema.users)
      .values({ id: guardianUserId, email: trial.guardianEmail, fullName: trial.guardianName })
      .onConflictDoNothing();
  }
  await db.insert(schema.memberships)
    .values({ userId: guardianUserId, organizationId: orgId, role: 'parent', status: 'active' })
    .onConflictDoNothing();

  const [student] = await db.insert(schema.students)
    .values({
      organizationId: orgId,
      fullName: `${trial.studentFirstName} ${trial.studentLastName}`,
      dateOfBirth: data.dateOfBirth,
      enrolledAt: new Date().toISOString().slice(0, 10),
      status: 'active',
    })
    .returning({ id: schema.students.id });
  if (!student) throw new Error('Failed to create student');

  await db.insert(schema.classEnrollments).values({ classId: data.classId, studentId: student.id }).onConflictDoNothing();
  await db.insert(schema.studentGuardians).values({
    studentId: student.id,
    guardianUserId,
    relationship: null,
    isPrimary: true,
    receivesNotifications: true,
  }).onConflictDoNothing();

  await db.update(schema.trialPlacements)
    .set({ status: 'converted', convertedStudentId: student.id, convertedAt: new Date() })
    .where(eq(schema.trialPlacements.id, trialId));

  await logActivity({
    organizationId: orgId, actorUserId: actor.userId, actorName: actor.name,
    action: 'inquiry.converted', targetType: 'student', targetId: student.id,
    metadata: { targetLabel: `${trial.studentFirstName} ${trial.studentLastName}` },
  });

  revalidatePath('/admin/trials');
  revalidatePath('/admin/students');
  redirect(`/admin/students/${student.id}?notice=trial_converted`);
}

// ---------------------------------------------------------------------------
// Onboarding checklist — a calm, dismissible setup guide for a new school
// admin. Each item's completion is derived from real org data (or, for the
// two items with no natural completion signal — reviewing the Board Pack —
// a lightweight "visited" cookie set the first time that page renders).
// ---------------------------------------------------------------------------
export type OnboardingItem = {
  key: string;
  label: string;
  sub: string;
  href: string;
  done: boolean;
};

export async function getOnboardingChecklist(orgId: string): Promise<OnboardingItem[]> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const boardPackViewed = cookieStore.get('onboarding_board_pack_viewed')?.value === 'true';

  const [
    org,
    classCount,
    teacherCount,
    studentCount,
    guardianLinkCount,
    tuitionPlanCount,
    announcementCount,
    homeworkCount,
    parentCount,
  ] = await Promise.all([
    db.query.organizations.findFirst({ where: eq(schema.organizations.id, orgId) }),
    db.select({ cnt: count() }).from(schema.classes)
      .where(and(eq(schema.classes.organizationId, orgId), sql`${schema.classes.deletedAt} IS NULL`)),
    db.select({ cnt: count() }).from(schema.memberships)
      .where(and(eq(schema.memberships.organizationId, orgId), eq(schema.memberships.role, 'teacher'), eq(schema.memberships.status, 'active'))),
    db.select({ cnt: count() }).from(schema.students)
      .where(and(eq(schema.students.organizationId, orgId), eq(schema.students.status, 'active'))),
    db.select({ cnt: count() }).from(schema.studentGuardians)
      .innerJoin(schema.students, eq(schema.students.id, schema.studentGuardians.studentId))
      .where(eq(schema.students.organizationId, orgId)),
    db.select({ cnt: count() }).from(schema.tuitionPlans)
      .where(eq(schema.tuitionPlans.organizationId, orgId)),
    db.select({ cnt: count() }).from(schema.messageThreads)
      .where(and(eq(schema.messageThreads.organizationId, orgId), eq(schema.messageThreads.scope, 'school_wide'))),
    db.select({ cnt: count() }).from(schema.homeworkAssignments)
      .innerJoin(schema.classes, eq(schema.classes.id, schema.homeworkAssignments.classId))
      .where(eq(schema.classes.organizationId, orgId)),
    db.select({ cnt: count() }).from(schema.memberships)
      .where(and(eq(schema.memberships.organizationId, orgId), eq(schema.memberships.role, 'parent'), eq(schema.memberships.status, 'active'))),
  ]);

  const hasAddress = !!(org?.address && Object.values(org.address as Record<string, string>).some(v => v?.trim()));

  return [
    {
      key: 'profile', label: 'Add school profile', href: '/admin/settings',
      sub: 'Confirm your school name and address',
      done: !!org && !!org.name && hasAddress,
    },
    {
      key: 'classes', label: 'Add classes', href: '/admin/classes/new',
      sub: 'Create the classes your school runs',
      done: Number(classCount[0]?.cnt ?? 0) > 0,
    },
    {
      key: 'teachers', label: 'Add teachers', href: '/admin/teachers/invite',
      sub: 'Invite teachers so they can log in',
      done: Number(teacherCount[0]?.cnt ?? 0) > 0,
    },
    {
      key: 'students', label: 'Import students', href: '/admin/import',
      sub: 'Bring in your roster via CSV, or add students one by one',
      done: Number(studentCount[0]?.cnt ?? 0) > 0,
    },
    {
      key: 'guardians', label: 'Link guardians', href: '/admin/students',
      sub: 'Connect each student to their parent(s)',
      done: Number(guardianLinkCount[0]?.cnt ?? 0) > 0,
    },
    {
      key: 'tuition', label: 'Create tuition plans', href: '/admin/tuition',
      sub: 'Set up billing for enrolled students',
      done: Number(tuitionPlanCount[0]?.cnt ?? 0) > 0,
    },
    {
      key: 'announcement', label: 'Post first announcement', href: '/admin/announcements',
      sub: 'Send a school-wide message to all parents',
      done: Number(announcementCount[0]?.cnt ?? 0) > 0,
    },
    {
      key: 'homework', label: 'Assign first homework', href: '/admin/classes',
      sub: 'Homework is assigned by teachers — check a class to see it appear here',
      done: Number(homeworkCount[0]?.cnt ?? 0) > 0,
    },
    {
      key: 'board_pack', label: 'Review Board Pack', href: '/admin/board-pack',
      sub: 'See the snapshot your board or principal would see',
      done: boardPackViewed,
    },
    {
      key: 'parents', label: 'Invite parents', href: '/admin/parents/invite',
      sub: 'Give parents access to their child’s daily feed',
      done: Number(parentCount[0]?.cnt ?? 0) > 0,
    },
  ];
}

export async function markBoardPackViewed() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.set('onboarding_board_pack_viewed', 'true', { maxAge: 60 * 60 * 24 * 365, path: '/' });
}

export async function dismissOnboardingChecklist() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.set('onboarding_dismissed', 'true', { maxAge: 60 * 60 * 24 * 365, path: '/' });
  revalidatePath('/admin');
}

export async function restoreOnboardingChecklist() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.delete('onboarding_dismissed');
  revalidatePath('/admin');
}
