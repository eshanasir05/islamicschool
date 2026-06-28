'use server';

import { and, desc, eq, ne } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { env } from '@/env';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export async function getAnnouncements(orgId: string) {
  const rows = await db
    .select({
      threadId: schema.messageThreads.id,
      createdAt: schema.messages.createdAt,
      content: schema.messages.content,
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
    .limit(5);
  return rows;
}

export async function getGuardianStudents(guardianUserId: string) {
  const links = await db.query.studentGuardians.findMany({
    where: eq(schema.studentGuardians.guardianUserId, guardianUserId),
    with: { student: true },
  });
  const seen = new Set<string>();
  return links.map(l => l.student).filter((s): s is NonNullable<typeof s> => {
    if (!s || seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

export async function getStudentFeed(studentId: string, date: string) {
  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const [attendance, hifz, notes] = await Promise.all([
    db.query.attendanceRecords.findFirst({
      where: and(
        eq(schema.attendanceRecords.studentId, studentId),
        eq(schema.attendanceRecords.sessionDate, date),
        eq(schema.attendanceRecords.organizationId, orgId),
      ),
      with: { student: true },
    }),
    db.query.hifzRecords.findFirst({
      where: and(
        eq(schema.hifzRecords.studentId, studentId),
        eq(schema.hifzRecords.sessionDate, date),
        eq(schema.hifzRecords.organizationId, orgId),
      ),
      with: { student: true },
    }),
    db.query.studentNotes.findMany({
      where: and(
        eq(schema.studentNotes.studentId, studentId),
        eq(schema.studentNotes.visibleToParent, true),
        eq(schema.studentNotes.organizationId, orgId),
      ),
      orderBy: (n, { desc }) => desc(n.createdAt),
      limit: 10,
    }),
  ]);

  // Generate signed URL for hifz audio if present
  let audioSignedUrl: string | null = null;
  if (hifz?.audioUrl) {
    try {
      const serviceClient = await createSupabaseServiceClient();
      // Extract path from full URL
      const url = new URL(hifz.audioUrl);
      const path = url.pathname.split('/hifz-audio/')[1];
      if (path) {
        const { data } = await serviceClient.storage
          .from('hifz-audio')
          .createSignedUrl(path, 3600);
        audioSignedUrl = data?.signedUrl ?? null;
      }
    } catch {
      audioSignedUrl = null;
    }
  }

  return { attendance, hifz, audioSignedUrl, notes };
}

export async function getParentTuition(studentId: string) {
  const plan = await db.query.tuitionPlans.findFirst({
    where: and(
      eq(schema.tuitionPlans.studentId, studentId),
      ne(schema.tuitionPlans.status, 'cancelled'),
    ),
    with: {
      payments: {
        orderBy: (p, { desc }) => desc(p.paidAt),
        limit: 5,
      },
    },
    orderBy: (t, { desc }) => desc(t.createdAt),
  });
  return plan ?? null;
}
