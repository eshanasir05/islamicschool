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

  const data = rows.map((r) => [
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
    organizationId: orgId,
    actorUserId: caller.userId,
    actorName: caller.name,
    action: 'csv_export.downloaded',
    targetType: 'hifz_export',
    targetId: null,
    metadata: { targetLabel: 'hifz' },
  });

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(buildCsv(headers, data), `talibly-hifz-${date}.csv`);
}
