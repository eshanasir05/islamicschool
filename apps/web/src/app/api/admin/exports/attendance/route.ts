import { env } from '@/env';
import { logActivity } from '@/lib/activity-log';
import { getAdminActorForOrg } from '@/lib/admin-auth';
import { buildCsv, csvResponse } from '@/lib/csv';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const recorderUsers = schema.users;

export async function GET() {
  const orgId = env.NEXT_PUBLIC_ORG_ID;
  const caller = await getAdminActorForOrg(orgId);
  if (!caller) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await db
    .select({
      attendanceId: schema.attendanceRecords.id,
      sessionDate: schema.attendanceRecords.sessionDate,
      status: schema.attendanceRecords.status,
      notes: schema.attendanceRecords.notes,
      createdAt: schema.attendanceRecords.createdAt,
      studentName: schema.students.fullName,
      className: schema.classes.name,
      recordedBy: recorderUsers.fullName,
    })
    .from(schema.attendanceRecords)
    .innerJoin(schema.students, eq(schema.students.id, schema.attendanceRecords.studentId))
    .innerJoin(schema.classes, eq(schema.classes.id, schema.attendanceRecords.classId))
    .innerJoin(recorderUsers, eq(recorderUsers.id, schema.attendanceRecords.recordedBy))
    .where(eq(schema.attendanceRecords.organizationId, orgId))
    .orderBy(schema.attendanceRecords.sessionDate, schema.students.fullName);

  const headers = [
    'attendance_id',
    'date',
    'student_name',
    'class_name',
    'status',
    'notes',
    'recorded_by',
    'created_at',
  ];

  const data = rows.map((r) => [
    r.attendanceId,
    r.sessionDate,
    r.studentName,
    r.className,
    r.status,
    r.notes,
    r.recordedBy,
    r.createdAt ? new Date(r.createdAt).toISOString() : null,
  ]);

  await logActivity({
    organizationId: orgId,
    actorUserId: caller.userId,
    actorName: caller.name,
    action: 'csv_export.downloaded',
    targetType: 'attendance_export',
    targetId: null,
    metadata: { targetLabel: 'attendance' },
  });

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(buildCsv(headers, data), `talibly-attendance-${date}.csv`);
}
