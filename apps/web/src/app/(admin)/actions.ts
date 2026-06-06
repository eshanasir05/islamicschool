'use server';

import { and, count, eq, gte, sql } from 'drizzle-orm';
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
