'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db, schema } from '@/lib/db';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { Resend } from 'resend';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
export async function getTeacherClasses(teacherId: string) {
  return db.query.classes.findMany({
    where: and(
      eq(schema.classes.primaryTeacherId, teacherId),
      eq(schema.classes.organizationId, env.NEXT_PUBLIC_ORG_ID),
    ),
  });
}

export async function getClassStudents(classId: string) {
  const enrollments = await db.query.classEnrollments.findMany({
    where: eq(schema.classEnrollments.classId, classId),
    with: { student: true },
  });
  return enrollments.map(e => e.student);
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------
export type AttendanceInput = {
  studentId: string;
  status: 'present' | 'late' | 'absent' | 'excused';
};

export async function submitAttendance(
  classId: string,
  records: AttendanceInput[],
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const today = new Date().toISOString().slice(0, 10);

  const rows = records.map(r => ({
    organizationId: env.NEXT_PUBLIC_ORG_ID,
    classId,
    studentId: r.studentId,
    sessionDate: today,
    status: r.status,
    arrivalTime: r.status !== 'absent' ? new Date() : null,
    recordedBy: user.id,
  }));

  await db.insert(schema.attendanceRecords).values(rows).onConflictDoUpdate({
    target: [schema.attendanceRecords.classId, schema.attendanceRecords.studentId, schema.attendanceRecords.sessionDate],
    set: {
      status: sql`excluded.status`,
      arrivalTime: sql`excluded.arrival_time`,
      recordedBy: sql`excluded.recorded_by`,
    },
  });
  revalidatePath('/admin');
}

// ---------------------------------------------------------------------------
// Hifz
// ---------------------------------------------------------------------------
export type HifzInput = {
  studentId: string;
  stream: 'sabak' | 'sabqi' | 'manzil';
  surahNumber: number;
  ayahStart: number;
  ayahEnd: number;
  audioDataUrl?: string | null;
};

export async function submitHifz(classId: string, entries: HifzInput[]): Promise<{ uploadWarning: boolean }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const today = new Date().toISOString().slice(0, 10);
  const serviceClient = await createSupabaseServiceClient();
  let uploadWarning = false;

  for (const entry of entries) {
    let audioUrl: string | null = null;

    // Upload base64 audio to Supabase Storage if provided
    if (entry.audioDataUrl) {
      const base64 = entry.audioDataUrl.split(',')[1];
      if (!base64) continue;
      const buffer = Buffer.from(base64, 'base64');
      const filename = `${env.NEXT_PUBLIC_ORG_ID}/${entry.studentId}/${today}.webm`;
      const { error } = await serviceClient.storage
        .from('hifz-audio')
        .upload(filename, buffer, { contentType: 'audio/webm', upsert: true });
      if (!error) {
        const { data } = serviceClient.storage.from('hifz-audio').getPublicUrl(filename);
        audioUrl = data.publicUrl;
      } else {
        uploadWarning = true;
      }
    }

    const [hifzRow] = await db.insert(schema.hifzRecords).values({
      organizationId: env.NEXT_PUBLIC_ORG_ID,
      studentId: entry.studentId,
      classId,
      stream: entry.stream,
      surahNumber: entry.surahNumber,
      ayahStart: entry.ayahStart,
      ayahEnd: entry.ayahEnd,
      sessionDate: today,
      audioUrl,
      recordedBy: user.id,
    }).returning();

    if (audioUrl && hifzRow) {
      await db.insert(schema.mediaUploads).values({
        organizationId: env.NEXT_PUBLIC_ORG_ID,
        uploadedBy: user.id,
        relatedEntityType: 'hifz_record',
        relatedEntityId: hifzRow.id,
        storageUrl: audioUrl,
        mimeType: 'audio/webm',
        consentVerified: true,
      }).onConflictDoNothing();
    }
  }

  revalidatePath('/admin');
  return { uploadWarning };
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
export type NoteInput = {
  studentId: string;
  noteType: 'praise' | 'concern' | 'general' | 'homework';
  category?: string;
  content: string;
};

export async function submitNotes(classId: string, notes: NoteInput[]) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (notes.length === 0) return;

  const rows = notes.map(n => ({
    organizationId: env.NEXT_PUBLIC_ORG_ID,
    studentId: n.studentId,
    classId,
    noteType: n.noteType,
    category: n.category ?? null,
    content: n.content,
    visibleToParent: true,
    createdBy: user.id,
  }));

  await db.insert(schema.studentNotes).values(rows);
  revalidatePath('/parent');
}

// ---------------------------------------------------------------------------
// Notify parents
// ---------------------------------------------------------------------------
const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Al-Imran', 4: 'An-Nisa',
  5: 'Al-Maidah', 36: 'Ya-Sin', 67: 'Al-Mulk', 112: 'Al-Ikhlas',
};
function surahName(n: number) { return SURAH_NAMES[n] ?? `Surah ${n}`; }

export async function notifyParents(classId: string, sessionDate: string) {
  if (!process.env.RESEND_API_KEY) {
    redirect(`/teacher/${classId}/confirm?sent=1`);
  }

  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const [students, attendanceRows, hifzRows] = await Promise.all([
    db.query.classEnrollments.findMany({
      where: eq(schema.classEnrollments.classId, classId),
      with: { student: { with: { guardians: { with: { guardian: true } } } } },
    }),
    db.query.attendanceRecords.findMany({
      where: and(eq(schema.attendanceRecords.classId, classId), eq(schema.attendanceRecords.sessionDate, sessionDate), eq(schema.attendanceRecords.organizationId, orgId)),
    }),
    db.query.hifzRecords.findMany({
      where: and(eq(schema.hifzRecords.classId, classId), eq(schema.hifzRecords.sessionDate, sessionDate), eq(schema.hifzRecords.organizationId, orgId)),
    }),
  ]);

  const attendanceMap = new Map(attendanceRows.map(a => [a.studentId, a.status]));
  const hifzMap = new Map(hifzRows.map(h => [h.studentId, h]));

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const appUrl = env.NEXT_PUBLIC_APP_URL;

  for (const enrollment of students) {
    const student = enrollment.student;
    if (!student) continue;

    const status = attendanceMap.get(student.id) ?? 'no record';
    const hifz = hifzMap.get(student.id);
    const hifzLine = hifz
      ? `<p>📖 <strong>Hifz:</strong> ${surahName(hifz.surahNumber)} ${hifz.ayahStart}–${hifz.ayahEnd} (${hifz.stream})</p>`
      : '';

    const statusEmoji = status === 'present' ? '✅' : status === 'late' ? '🕐' : status === 'absent' ? '❌' : '📋';

    for (const link of student.guardians) {
      if (!link.receivesNotifications || !link.guardian?.email) continue;

      await resend.emails.send({
        from: fromEmail,
        to: link.guardian.email,
        subject: `${student.fullName}'s class summary — ${sessionDate}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
            <p style="font-size:16px">Assalamu alaykum, ${link.guardian.fullName ?? 'dear parent'},</p>
            <p>Here is a summary of today's session for <strong>${student.fullName}</strong>:</p>
            <p>${statusEmoji} <strong>Attendance:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)}</p>
            ${hifzLine}
            <p>You can view the full details — including teacher notes and hifz audio — in the parent portal:</p>
            <p><a href="${appUrl}/parent/${student.id}" style="color:#7c5cbf">View ${student.fullName}'s day →</a></p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="font-size:13px;color:#888">JazakAllah khair for entrusting us with your child's education. — Talibly</p>
          </div>
        `,
      }).catch(() => null);
    }
  }

  redirect(`/teacher/${classId}/confirm?sent=1`);
}
