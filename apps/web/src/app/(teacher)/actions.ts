'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db, schema } from '@/lib/db';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { env } from '@/env';

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

  await db.insert(schema.attendanceRecords).values(rows).onConflictDoNothing();
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

export async function submitHifz(classId: string, entries: HifzInput[]) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const today = new Date().toISOString().slice(0, 10);
  const serviceClient = await createSupabaseServiceClient();

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
