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

const recorderUsers = schema.users;

export async function GET() {
  const caller = await getCaller();
  if (!caller || !['admin', 'principal'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const rows = await db
    .select({
      hifzId: schema.hifzRecords.id,
      sessionDate: schema.hifzRecords.sessionDate,
      studentName: schema.students.fullName,
      className: schema.classes.name,
      stream: schema.hifzRecords.stream,
      surahNumber: schema.hifzRecords.surahNumber,
      ayahStart: schema.hifzRecords.ayahStart,
      ayahEnd: schema.hifzRecords.ayahEnd,
      accuracyScore: schema.hifzRecords.accuracyScore,
      hasAudio: schema.hifzRecords.audioUrl,
      recordedBy: recorderUsers.fullName,
      createdAt: schema.hifzRecords.createdAt,
    })
    .from(schema.hifzRecords)
    .innerJoin(schema.students, eq(schema.students.id, schema.hifzRecords.studentId))
    .leftJoin(schema.classes, eq(schema.classes.id, schema.hifzRecords.classId))
    .innerJoin(recorderUsers, eq(recorderUsers.id, schema.hifzRecords.recordedBy))
    .where(eq(schema.hifzRecords.organizationId, orgId))
    .orderBy(schema.hifzRecords.sessionDate, schema.students.fullName);

  const headers = [
    'hifz_id',
    'date',
    'student_name',
    'class_name',
    'stream',
    'surah_number',
    'ayah_start',
    'ayah_end',
    'accuracy_score',
    'has_audio',
    'recorded_by',
    'created_at',
  ];

  const data = rows.map(r => [
    r.hifzId,
    r.sessionDate,
    r.studentName,
    r.className,
    r.stream,
    r.surahNumber,
    r.ayahStart,
    r.ayahEnd,
    r.accuracyScore,
    r.hasAudio ? 'yes' : 'no',
    r.recordedBy,
    r.createdAt ? new Date(r.createdAt).toISOString() : null,
  ]);

  await logActivity({
    organizationId: orgId, actorUserId: caller.userId, actorName: caller.name,
    action: 'csv_export.downloaded', targetType: 'hifz_export', targetId: null,
    metadata: { targetLabel: 'hifz' },
  });

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(buildCsv(headers, data), `talibly-hifz-${date}.csv`);
}
