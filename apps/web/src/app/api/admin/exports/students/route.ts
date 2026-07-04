import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { buildCsv, csvResponse } from '@/lib/csv';
import { logActivity } from '@/lib/activity-log';

export const runtime = 'nodejs';

async function getCaller(): Promise<{ userId: string; role: string; name: string } | null> {
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
  if (!membership) return null;
  const userRow = await db.query.users.findFirst({ where: eq(schema.users.id, user.id), columns: { fullName: true } });
  return { userId: user.id, role: membership.role, name: userRow?.fullName ?? 'Unknown' };
}

export async function GET() {
  const caller = await getCaller();
  if (!caller || !['admin', 'principal'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orgId = env.NEXT_PUBLIC_ORG_ID;

  // Fetch students with their primary class and primary guardian
  const rows = await db
    .select({
      studentId: schema.students.id,
      studentName: schema.students.fullName,
      gradeLevel: schema.classes.gradeLevel,
      status: schema.students.status,
      enrolledAt: schema.students.enrolledAt,
      createdAt: schema.students.createdAt,
      className: schema.classes.name,
      parentName: schema.users.fullName,
      parentEmail: schema.users.email,
    })
    .from(schema.students)
    .leftJoin(schema.classEnrollments, eq(schema.classEnrollments.studentId, schema.students.id))
    .leftJoin(schema.classes, eq(schema.classes.id, schema.classEnrollments.classId))
    .leftJoin(
      schema.studentGuardians,
      and(
        eq(schema.studentGuardians.studentId, schema.students.id),
        eq(schema.studentGuardians.isPrimary, true),
      ),
    )
    .leftJoin(schema.users, eq(schema.users.id, schema.studentGuardians.guardianUserId))
    .where(eq(schema.students.organizationId, orgId))
    .orderBy(schema.students.fullName);

  const headers = [
    'student_id',
    'student_name',
    'grade_level',
    'class_name',
    'parent_name',
    'parent_email',
    'enrollment_status',
    'enrolled_at',
    'created_at',
  ];

  const data = rows.map(r => [
    r.studentId,
    r.studentName,
    r.gradeLevel,
    r.className,
    r.parentName,
    r.parentEmail,
    r.status,
    r.enrolledAt,
    r.createdAt ? new Date(r.createdAt).toISOString() : null,
  ]);

  await logActivity({
    organizationId: orgId, actorUserId: caller.userId, actorName: caller.name,
    action: 'csv_export.downloaded', targetType: 'roster_export', targetId: null,
    metadata: { targetLabel: 'roster' },
  });

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(buildCsv(headers, data), `talibly-roster-${date}.csv`);
}
