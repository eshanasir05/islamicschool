'use server';

import { and, count, desc, eq, gte, max } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

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
  const [student, attendance, hifz, noteCount] = await Promise.all([
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
      limit: 5,
    }),
    db.query.hifzRecords.findMany({
      where: and(eq(schema.hifzRecords.studentId, studentId), eq(schema.hifzRecords.organizationId, orgId)),
      orderBy: (h, { desc }) => desc(h.sessionDate),
      limit: 5,
    }),
    db.select({ cnt: count() }).from(schema.studentNotes)
      .where(and(eq(schema.studentNotes.studentId, studentId), eq(schema.studentNotes.organizationId, orgId))),
  ]);
  return { student, attendance, hifz, noteCount: Number(noteCount[0]?.cnt ?? 0) };
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
