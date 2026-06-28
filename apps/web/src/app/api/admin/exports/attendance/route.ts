import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { buildCsv, csvResponse } from '@/lib/csv';

export const runtime = 'nodejs';

async function getCallerRole(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(schema.memberships.userId, user.id),
      eq(schema.memberships.organizationId, env.NEXT_PUBLIC_ORG_ID),
      eq(schema.memberships.status, 'active'),
    ),
  });
  return membership?.role ?? null;
}

const recorderUsers = schema.users;

export async function GET() {
  const role = await getCallerRole();
  if (!role || !['admin', 'principal'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orgId = env.NEXT_PUBLIC_ORG_ID;

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

  const data = rows.map(r => [
    r.attendanceId,
    r.sessionDate,
    r.studentName,
    r.className,
    r.status,
    r.notes,
    r.recordedBy,
    r.createdAt ? new Date(r.createdAt).toISOString() : null,
  ]);

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(buildCsv(headers, data), `attendance-${date}.csv`);
}
