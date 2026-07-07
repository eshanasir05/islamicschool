'use server';

import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db, schema } from '@/lib/db';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { Resend } from 'resend';
import { notifyGuardians, notifyClassGuardians } from '@/lib/notifications';
import { logActivity } from '@/lib/activity-log';
import { getHifzRetentionFlags } from '@/lib/hifz-retention';
import { parseClassPrefs } from '@/lib/teacher-prefs';

async function actorName(userId: string): Promise<string> {
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { fullName: true } });
  return row?.fullName ?? 'Unknown';
}

// ---------------------------------------------------------------------------
// Authorization helpers — every mutation below must verify the calling
// teacher actually owns the class/student/trial in question, not just that
// they're authenticated. These were previously missing, which meant any
// teacher could act on any other teacher's class by knowing its id.
// ---------------------------------------------------------------------------
async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  return user;
}

async function assertTeacherOwnsClass(classId: string, userId: string) {
  const cls = await db.query.classes.findFirst({
    where: and(
      eq(schema.classes.id, classId),
      eq(schema.classes.primaryTeacherId, userId),
      eq(schema.classes.organizationId, env.NEXT_PUBLIC_ORG_ID),
    ),
    columns: { id: true },
  });
  if (!cls) redirect('/teacher');
}

async function assertTeacherOwnsStudent(studentId: string, userId: string) {
  const enrollments = await db.query.classEnrollments.findMany({
    where: eq(schema.classEnrollments.studentId, studentId),
    with: { class: { columns: { primaryTeacherId: true, organizationId: true } } },
  });
  const owns = enrollments.some(e => e.class?.primaryTeacherId === userId && e.class.organizationId === env.NEXT_PUBLIC_ORG_ID);
  if (!owns) redirect('/teacher');
}

async function assertTeacherOwnsTrial(trialId: string, userId: string) {
  const trial = await db.query.trialPlacements.findFirst({
    where: and(eq(schema.trialPlacements.id, trialId), eq(schema.trialPlacements.assignedTeacherId, userId)),
    columns: { id: true },
  });
  if (!trial) redirect('/teacher/trials');
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
export async function getTeacherClasses(teacherId: string) {
  const classes = await db.query.classes.findMany({
    where: and(
      eq(schema.classes.primaryTeacherId, teacherId),
      eq(schema.classes.organizationId, env.NEXT_PUBLIC_ORG_ID),
    ),
    orderBy: (c, { asc }) => asc(c.name),
  });
  if (classes.length === 0) return [];

  const classIds = classes.map(c => c.id);

  // Student count + most recent session date per class — both derived from
  // existing rows, no schema changes.
  const [counts, lastSessions] = await Promise.all([
    db
      .select({ classId: schema.classEnrollments.classId, count: sql<number>`count(*)::int` })
      .from(schema.classEnrollments)
      .where(inArray(schema.classEnrollments.classId, classIds))
      .groupBy(schema.classEnrollments.classId),
    db
      .select({ classId: schema.attendanceRecords.classId, last: sql<string>`max(${schema.attendanceRecords.sessionDate})` })
      .from(schema.attendanceRecords)
      .where(inArray(schema.attendanceRecords.classId, classIds))
      .groupBy(schema.attendanceRecords.classId),
  ]);

  const countMap = new Map(counts.map(c => [c.classId, c.count]));
  const lastMap = new Map(lastSessions.map(s => [s.classId, s.last]));
  const relevantDates = [...new Set([...lastMap.values()].filter((d): d is string => !!d))];

  // Breakdown of each class's most recent session: present / hifz / notes.
  const presentMap = new Map<string, number>();
  const hifzMap = new Map<string, number>();
  const notesMap = new Map<string, number>();

  if (relevantDates.length > 0) {
    const [attRows, hifzRows, noteRows] = await Promise.all([
      db.select({
        classId: schema.attendanceRecords.classId,
        sessionDate: schema.attendanceRecords.sessionDate,
        status: schema.attendanceRecords.status,
      }).from(schema.attendanceRecords)
        .where(and(inArray(schema.attendanceRecords.classId, classIds), inArray(schema.attendanceRecords.sessionDate, relevantDates))),
      db.select({
        classId: schema.hifzRecords.classId,
        sessionDate: schema.hifzRecords.sessionDate,
      }).from(schema.hifzRecords)
        .where(and(inArray(schema.hifzRecords.classId, classIds), inArray(schema.hifzRecords.sessionDate, relevantDates))),
      db.select({
        classId: schema.studentNotes.classId,
        d: sql<string>`to_char(${schema.studentNotes.createdAt}, 'YYYY-MM-DD')`,
      }).from(schema.studentNotes)
        .where(and(inArray(schema.studentNotes.classId, classIds), isNull(schema.studentNotes.deletedAt))),
    ]);

    for (const r of attRows) {
      if (r.classId && r.status === 'present' && lastMap.get(r.classId) === r.sessionDate) {
        presentMap.set(r.classId, (presentMap.get(r.classId) ?? 0) + 1);
      }
    }
    for (const r of hifzRows) {
      if (r.classId && lastMap.get(r.classId) === r.sessionDate) {
        hifzMap.set(r.classId, (hifzMap.get(r.classId) ?? 0) + 1);
      }
    }
    for (const r of noteRows) {
      if (r.classId && lastMap.get(r.classId) === r.d) {
        notesMap.set(r.classId, (notesMap.get(r.classId) ?? 0) + 1);
      }
    }
  }

  return classes.map((c, i) => {
    const lastDate = lastMap.get(c.id) ?? null;
    return {
      ...c,
      accent: (i % 2 === 0 ? 'green' : 'sky') as 'green' | 'sky',
      studentCount: countMap.get(c.id) ?? 0,
      lastSession: lastDate
        ? {
            date: lastDate,
            present: presentMap.get(c.id) ?? 0,
            hifz: hifzMap.get(c.id) ?? 0,
            notes: notesMap.get(c.id) ?? 0,
          }
        : null,
    };
  });
}

export type TeacherActivity = {
  id: string;
  kind: 'attendance' | 'hifz' | 'note';
  title: string;
  detail: string;
  at: Date | null;
  classId: string;
  studentId: string | null;
};

// Recent attendance sessions + hifz + notes across the teacher's classes,
// newest first. Used for the dashboard "Recent activity" panel and the full
// /teacher/activity page.
export async function getTeacherRecentActivity(teacherId: string, limit = 5): Promise<TeacherActivity[]> {
  const teacherClasses = await db.query.classes.findMany({
    where: and(
      eq(schema.classes.primaryTeacherId, teacherId),
      eq(schema.classes.organizationId, env.NEXT_PUBLIC_ORG_ID),
    ),
    columns: { id: true, name: true },
  });
  const classIds = teacherClasses.map(c => c.id);
  if (classIds.length === 0) return [];
  const classNameById = new Map(teacherClasses.map(c => [c.id, c.name]));

  const [attRows, hifz, notes] = await Promise.all([
    db.select({
      classId: schema.attendanceRecords.classId,
      sessionDate: schema.attendanceRecords.sessionDate,
      createdAt: schema.attendanceRecords.createdAt,
    }).from(schema.attendanceRecords).where(inArray(schema.attendanceRecords.classId, classIds)),
    db.query.hifzRecords.findMany({
      where: inArray(schema.hifzRecords.classId, classIds),
      with: { student: { columns: { fullName: true } } },
      orderBy: (h, { desc }) => desc(h.createdAt),
      limit: 20,
    }),
    db.query.studentNotes.findMany({
      where: and(inArray(schema.studentNotes.classId, classIds), isNull(schema.studentNotes.deletedAt)),
      with: { student: { columns: { fullName: true } } },
      orderBy: (n, { desc }) => desc(n.createdAt),
      limit: 20,
    }),
  ]);

  const items: TeacherActivity[] = [];

  // One "attendance completed" event per (class, session date), timestamped at
  // the latest record in that session.
  const sessionAt = new Map<string, Date>();
  for (const r of attRows) {
    if (!r.classId || !r.createdAt) continue;
    const key = `${r.classId}|${r.sessionDate}`;
    const t = new Date(r.createdAt);
    const prev = sessionAt.get(key);
    if (!prev || t > prev) sessionAt.set(key, t);
  }
  for (const [key, at] of sessionAt) {
    const classId = key.split('|')[0]!;
    items.push({
      id: `att-${key}`,
      kind: 'attendance',
      title: `Attendance completed for ${classNameById.get(classId) ?? 'class'}`,
      detail: 'Attendance',
      at,
      classId,
      studentId: null,
    });
  }

  for (const h of hifz) {
    items.push({
      id: `hifz-${h.id}`,
      kind: 'hifz',
      title: `Hifz recorded for ${h.student?.fullName ?? 'a student'}`,
      detail: `${surahName(h.surahNumber)} ${h.ayahStart}–${h.ayahEnd}`,
      at: h.createdAt,
      classId: h.classId!,
      studentId: h.studentId,
    });
  }
  for (const n of notes) {
    items.push({
      id: `note-${n.id}`,
      kind: 'note',
      title: `Note sent to parents for ${n.student?.fullName ?? 'a student'}`,
      detail: n.noteType === 'homework' ? 'Homework' : n.category ? n.category : 'Note',
      at: n.createdAt,
      classId: n.classId!,
      studentId: n.studentId,
    });
  }

  items.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
  return items.slice(0, limit);
}

export async function getClassStudents(classId: string) {
  const user = await requireUser();
  await assertTeacherOwnsClass(classId, user.id);

  const enrollments = await db.query.classEnrollments.findMany({
    where: eq(schema.classEnrollments.classId, classId),
    with: { student: true },
  });
  const students = enrollments.map(e => e.student);

  const teacherRow = await db.query.users.findFirst({
    where: eq(schema.users.id, user.id),
    columns: { classPrefs: true },
  });
  const prefs = parseClassPrefs(teacherRow?.classPrefs);

  if (prefs.sortStudents === 'attention') {
    const studentIds = students.map(s => s.id);
    const hifzRecords = studentIds.length
      ? await db.query.hifzRecords.findMany({
          where: inArray(schema.hifzRecords.studentId, studentIds),
          orderBy: (h, { desc }) => desc(h.sessionDate),
        })
      : [];
    const hifzByStudent = new Map<string, typeof hifzRecords>();
    for (const rec of hifzRecords) {
      const list = hifzByStudent.get(rec.studentId) ?? [];
      list.push(rec);
      hifzByStudent.set(rec.studentId, list);
    }
    const flagCount = (studentId: string) => {
      const flags = getHifzRetentionFlags(hifzByStudent.get(studentId) ?? []);
      return Number(flags.noReviewInWeeks) + Number(flags.repeatedWeak) + Number(flags.noUpdateInWeeks);
    };
    return [...students].sort((a, b) => flagCount(b.id) - flagCount(a.id) || a.fullName.localeCompare(b.fullName));
  }

  return [...students].sort((a, b) => a.fullName.localeCompare(b.fullName));
}

function ageFromDob(dateOfBirth: string): number {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

// Class roster for a teacher: enrolled students (with a quick brief) plus the
// pool of active org students not yet in this class, for the "add student"
// picker.
export async function getTeacherClassRoster(classId: string, teacherId: string) {
  await assertTeacherOwnsClass(classId, teacherId);

  const [cls, enrollments, allStudents] = await Promise.all([
    db.query.classes.findFirst({ where: eq(schema.classes.id, classId) }),
    db.query.classEnrollments.findMany({
      where: eq(schema.classEnrollments.classId, classId),
      with: { student: true },
      orderBy: (e, { asc }) => asc(e.enrolledAt),
    }),
    db.query.students.findMany({
      where: and(
        eq(schema.students.organizationId, env.NEXT_PUBLIC_ORG_ID),
        eq(schema.students.status, 'active'),
      ),
      orderBy: (s, { asc }) => asc(s.fullName),
    }),
  ]);

  const enrolledIds = new Set(enrollments.map(e => e.studentId));
  const students = enrollments
    .filter(e => e.student)
    .map(e => ({
      id: e.student!.id,
      fullName: e.student!.fullName,
      gender: e.student!.gender,
      age: ageFromDob(e.student!.dateOfBirth),
      enrolledAt: e.enrolledAt,
    }));
  const availableStudents = allStudents.filter(s => !enrolledIds.has(s.id));

  return { cls, students, availableStudents };
}

export async function getTeacherStudentDetail(classId: string, studentId: string, teacherId: string) {
  await assertTeacherOwnsClass(classId, teacherId);
  await assertTeacherOwnsStudent(studentId, teacherId);

  const [student, cls, hifz, notes, deletedNotes, parentThreads] = await Promise.all([
    db.query.students.findFirst({ where: eq(schema.students.id, studentId) }),
    db.query.classes.findFirst({ where: eq(schema.classes.id, classId), columns: { name: true } }),
    db.query.hifzRecords.findMany({
      where: and(eq(schema.hifzRecords.studentId, studentId), eq(schema.hifzRecords.classId, classId)),
      orderBy: (h, { desc }) => desc(h.sessionDate),
      limit: 5,
    }),
    db.query.studentNotes.findMany({
      where: and(eq(schema.studentNotes.studentId, studentId), eq(schema.studentNotes.classId, classId), isNull(schema.studentNotes.deletedAt)),
      orderBy: (n, { desc }) => desc(n.createdAt),
      limit: 5,
    }),
    db.query.studentNotes.findMany({
      where: and(eq(schema.studentNotes.studentId, studentId), eq(schema.studentNotes.classId, classId), sql`${schema.studentNotes.deletedAt} IS NOT NULL`),
      orderBy: (n, { desc }) => desc(n.deletedAt),
      limit: 5,
    }),
    db.query.messageThreads.findMany({
      where: and(eq(schema.messageThreads.studentId, studentId), eq(schema.messageThreads.scope, 'direct')),
      with: {
        messages: {
          orderBy: (m, { asc }) => asc(m.createdAt),
          with: { sender: { columns: { fullName: true } } },
        },
      },
      orderBy: (t, { desc }) => desc(t.createdAt),
      limit: 5,
    }),
  ]);
  const notesFromParent = parentThreads.flatMap(t => t.messages).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const hifzWithAudio = await Promise.all(hifz.map(async h => {
    if (!h.audioUrl) return { ...h, audioSignedUrl: null };
    try {
      const serviceClient = await createSupabaseServiceClient();
      const path = new URL(h.audioUrl).pathname.split('/hifz-audio/')[1];
      if (!path) return { ...h, audioSignedUrl: null };
      const { data } = await serviceClient.storage.from('hifz-audio').createSignedUrl(path, 3600);
      return { ...h, audioSignedUrl: data?.signedUrl ?? null };
    } catch {
      return { ...h, audioSignedUrl: null };
    }
  }));

  const teacherRow = await db.query.users.findFirst({
    where: eq(schema.users.id, teacherId),
    columns: { classPrefs: true },
  });
  const classPrefs = parseClassPrefs(teacherRow?.classPrefs);

  return {
    student,
    className: cls?.name ?? null,
    age: student ? ageFromDob(student.dateOfBirth) : null,
    hifz: hifzWithAudio,
    notes,
    deletedNotes,
    notesFromParent,
    retentionFlags: getHifzRetentionFlags(hifz),
    classPrefs,
  };
}

export async function deleteNote(noteId: string, classId: string, studentId: string) {
  const user = await requireUser();
  const note = await db.query.studentNotes.findFirst({
    where: eq(schema.studentNotes.id, noteId),
    columns: { classId: true },
  });
  if (!note?.classId) redirect('/teacher');
  await assertTeacherOwnsClass(note.classId, user.id);
  await db.update(schema.studentNotes).set({ deletedAt: new Date() }).where(eq(schema.studentNotes.id, noteId));
  revalidatePath(`/teacher/${classId}/students/${studentId}`);
  redirect(`/teacher/${classId}/students/${studentId}?notice=note_deleted`);
}

export async function restoreNote(noteId: string, classId: string, studentId: string) {
  const user = await requireUser();
  const note = await db.query.studentNotes.findFirst({
    where: eq(schema.studentNotes.id, noteId),
    columns: { classId: true },
  });
  if (!note?.classId) redirect('/teacher');
  await assertTeacherOwnsClass(note.classId, user.id);
  await db.update(schema.studentNotes).set({ deletedAt: null }).where(eq(schema.studentNotes.id, noteId));
  revalidatePath(`/teacher/${classId}/students/${studentId}`);
  redirect(`/teacher/${classId}/students/${studentId}?notice=note_restored`);
}

export async function restoreHomework(id: string) {
  const user = await requireUser();
  const homework = await db.query.homeworkAssignments.findFirst({
    where: eq(schema.homeworkAssignments.id, id),
    columns: { classId: true },
  });
  if (!homework) redirect('/teacher/homework');
  await assertTeacherOwnsClass(homework.classId, user.id);
  await db.update(schema.homeworkAssignments).set({ archived: false }).where(eq(schema.homeworkAssignments.id, id));
  revalidatePath('/teacher/homework');
  revalidatePath('/parent');
  redirect('/teacher/homework?notice=homework_restored');
}

export async function teacherEnrollStudent(classId: string, studentId: string, teacherId: string) {
  await assertTeacherOwnsClass(classId, teacherId);
  await db.insert(schema.classEnrollments).values({ classId, studentId }).onConflictDoNothing();
  revalidatePath(`/teacher/${classId}`);
  redirect(`/teacher/${classId}?notice=student_enrolled`);
}

export async function teacherUnenrollStudent(classId: string, studentId: string, teacherId: string) {
  await assertTeacherOwnsClass(classId, teacherId);
  await db
    .delete(schema.classEnrollments)
    .where(and(eq(schema.classEnrollments.classId, classId), eq(schema.classEnrollments.studentId, studentId)));
  revalidatePath(`/teacher/${classId}`);
  redirect(`/teacher/${classId}?notice=student_unenrolled`);
}

// ---------------------------------------------------------------------------
// Homework
// ---------------------------------------------------------------------------
export async function getTeacherHomeworkOverview(teacherId: string) {
  const classes = await db.query.classes.findMany({
    where: and(
      eq(schema.classes.primaryTeacherId, teacherId),
      eq(schema.classes.organizationId, env.NEXT_PUBLIC_ORG_ID),
    ),
    orderBy: (c, { asc }) => asc(c.name),
  });
  if (classes.length === 0) return [];

  const classIds = classes.map(c => c.id);
  const [assignments, archivedAssignments] = await Promise.all([
    db.query.homeworkAssignments.findMany({
      where: and(
        inArray(schema.homeworkAssignments.classId, classIds),
        eq(schema.homeworkAssignments.archived, false),
      ),
      orderBy: (h, { desc }) => desc(h.dueDate),
    }),
    db.query.homeworkAssignments.findMany({
      where: and(
        inArray(schema.homeworkAssignments.classId, classIds),
        eq(schema.homeworkAssignments.archived, true),
      ),
      orderBy: (h, { desc }) => desc(h.dueDate),
      limit: 10,
    }),
  ]);

  return classes.map(cls => ({
    ...cls,
    homework: assignments.filter(a => a.classId === cls.id),
    archivedHomework: archivedAssignments.filter(a => a.classId === cls.id),
  }));
}

export async function createHomework(
  classId: string,
  orgId: string,
  teacherId: string,
  data: { title: string; description?: string; dueDate: string },
) {
  const user = await requireUser();
  await assertTeacherOwnsClass(classId, user.id);

  const [row] = await db.insert(schema.homeworkAssignments).values({
    organizationId: orgId,
    classId,
    title: data.title,
    description: data.description ?? null,
    dueDate: data.dueDate,
    createdBy: user.id,
  }).returning({ id: schema.homeworkAssignments.id });
  if (!row) throw new Error('Failed to create homework');

  const cls = await db.query.classes.findFirst({
    where: eq(schema.classes.id, classId),
    columns: { name: true },
  });

  await notifyClassGuardians(classId, orgId, {
    type: 'homework_assigned',
    title: `New homework: ${data.title}`,
    body: `${cls?.name ?? 'Class'} — due ${new Date(`${data.dueDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    link: '/parent',
  });

  await logActivity({
    organizationId: orgId, actorUserId: user.id, actorName: await actorName(user.id),
    action: 'homework.assigned', targetType: 'class', targetId: classId,
    metadata: { targetLabel: `${data.title} — ${cls?.name ?? 'a class'}` },
  });

  revalidatePath('/teacher/homework');
  revalidatePath('/parent');
  redirect('/teacher/homework?notice=homework_assigned');
}

export async function archiveHomework(id: string) {
  const user = await requireUser();
  const homework = await db.query.homeworkAssignments.findFirst({
    where: eq(schema.homeworkAssignments.id, id),
    columns: { classId: true },
  });
  if (!homework) redirect('/teacher/homework');
  await assertTeacherOwnsClass(homework.classId, user.id);

  await db.update(schema.homeworkAssignments).set({ archived: true }).where(eq(schema.homeworkAssignments.id, id));
  revalidatePath('/teacher/homework');
  revalidatePath('/parent');
  redirect('/teacher/homework?notice=homework_archived');
}

// ---------------------------------------------------------------------------
// Hifz milestones
// ---------------------------------------------------------------------------
const MILESTONE_LABEL: Record<'surah_completed' | 'juz_completed' | 'revision_completed', string> = {
  surah_completed: 'Surah completed',
  juz_completed: 'Juz completed',
  revision_completed: 'Revision completed',
};

export async function getTeacherMilestonesOverview(teacherId: string) {
  const classes = await db.query.classes.findMany({
    where: and(
      eq(schema.classes.primaryTeacherId, teacherId),
      eq(schema.classes.organizationId, env.NEXT_PUBLIC_ORG_ID),
    ),
    orderBy: (c, { asc }) => asc(c.name),
    with: {
      enrollments: { with: { student: true } },
    },
  });
  if (classes.length === 0) return [];

  const studentIds = classes.flatMap(c => c.enrollments.map(e => e.studentId));

  const allMilestones = studentIds.length === 0
    ? []
    : await db.query.hifzMilestones.findMany({
        where: inArray(schema.hifzMilestones.studentId, studentIds),
        with: { student: { columns: { fullName: true } } },
        orderBy: (m, { desc }) => desc(m.achievedDate),
      });

  return classes.map(cls => {
    const classStudentIds = new Set(cls.enrollments.map(e => e.studentId));
    return {
      ...cls,
      milestones: allMilestones.filter(m => classStudentIds.has(m.studentId)),
    };
  });
}

export async function createMilestone(
  studentId: string,
  orgId: string,
  teacherId: string,
  data: { type: 'surah_completed' | 'juz_completed' | 'revision_completed'; label: string; achievedDate: string; teacherNotes?: string },
) {
  const user = await requireUser();
  await assertTeacherOwnsStudent(studentId, user.id);

  await db.insert(schema.hifzMilestones).values({
    organizationId: orgId,
    studentId,
    type: data.type,
    label: data.label,
    achievedDate: data.achievedDate,
    teacherNotes: data.teacherNotes ?? null,
    recordedBy: user.id,
  });

  const student = await db.query.students.findFirst({
    where: eq(schema.students.id, studentId),
    columns: { fullName: true },
  });

  await notifyGuardians(studentId, orgId, {
    type: 'hifz_milestone',
    title: `Hifz milestone: ${data.label}`,
    body: `${MILESTONE_LABEL[data.type]} for ${student?.fullName ?? 'your child'}`,
    link: `/parent/${studentId}`,
  });

  await logActivity({
    organizationId: orgId, actorUserId: user.id, actorName: await actorName(user.id),
    action: 'hifz_milestone.created', targetType: 'student', targetId: studentId,
    metadata: { targetLabel: `${data.label} — ${student?.fullName ?? 'a student'}` },
  });

  revalidatePath('/teacher/milestones');
  revalidatePath('/parent');
  redirect('/teacher/milestones?notice=milestone_recorded');
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------
export type AttendanceInput = {
  studentId: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  notes?: string;
};

export async function submitAttendance(
  classId: string,
  records: AttendanceInput[],
) {
  const user = await requireUser();
  await assertTeacherOwnsClass(classId, user.id);

  const today = new Date().toISOString().slice(0, 10);

  const existing = await db.query.attendanceRecords.findFirst({
    where: and(eq(schema.attendanceRecords.classId, classId), eq(schema.attendanceRecords.sessionDate, today)),
    columns: { id: true },
  });

  const rows = records.map(r => ({
    organizationId: env.NEXT_PUBLIC_ORG_ID,
    classId,
    studentId: r.studentId,
    sessionDate: today,
    status: r.status,
    arrivalTime: (r.status === 'present' || r.status === 'late') ? new Date() : null,
    notes: r.notes?.trim() || null,
    recordedBy: user.id,
  }));

  await db.insert(schema.attendanceRecords).values(rows).onConflictDoUpdate({
    target: [schema.attendanceRecords.classId, schema.attendanceRecords.studentId, schema.attendanceRecords.sessionDate],
    set: {
      status: sql`excluded.status`,
      arrivalTime: sql`excluded.arrival_time`,
      notes: sql`excluded.notes`,
      recordedBy: sql`excluded.recorded_by`,
    },
  });

  const absentStudents = records.filter(r => r.status === 'absent');
  if (absentStudents.length > 0) {
    const studentRows = await db.query.students.findMany({
      where: inArray(schema.students.id, absentStudents.map(r => r.studentId)),
      columns: { id: true, fullName: true },
    });
    const nameById = new Map(studentRows.map(s => [s.id, s.fullName]));
    await Promise.all(absentStudents.map(r =>
      notifyGuardians(r.studentId, env.NEXT_PUBLIC_ORG_ID, {
        type: 'attendance_absent',
        title: `${nameById.get(r.studentId) ?? 'Your child'} was marked absent today`,
        body: 'Let the school know why — tap to respond.',
        link: `/parent/${r.studentId}`,
      }),
    ));
  }

  const cls = await db.query.classes.findFirst({ where: eq(schema.classes.id, classId), columns: { name: true } });
  await logActivity({
    organizationId: env.NEXT_PUBLIC_ORG_ID, actorUserId: user.id, actorName: await actorName(user.id),
    action: existing ? 'attendance.updated' : 'attendance.submitted', targetType: 'class', targetId: classId,
    metadata: { targetLabel: cls?.name ?? 'a class' },
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
  status: 'passed' | 'needs_review' | 'weak' | 'mastered';
  mistakeType?: 'hesitation' | 'tajweed' | 'forgot_ayah' | 'repeated_correction' | null;
};

export async function submitHifz(classId: string, entries: HifzInput[]): Promise<{ uploadWarning: boolean }> {
  const user = await requireUser();
  await assertTeacherOwnsClass(classId, user.id);

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
      status: entry.status,
      mistakeType: entry.mistakeType ?? null,
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

    const student = await db.query.students.findFirst({
      where: eq(schema.students.id, entry.studentId),
      columns: { fullName: true },
    });
    await notifyGuardians(entry.studentId, env.NEXT_PUBLIC_ORG_ID, {
      type: 'hifz_recorded',
      title: `Hifz recorded for ${student?.fullName ?? 'your child'}`,
      body: `${surahName(entry.surahNumber)} ${entry.ayahStart}–${entry.ayahEnd}`,
      link: `/parent/${entry.studentId}`,
    });
  }

  if (entries.length > 0) {
    const cls = await db.query.classes.findFirst({ where: eq(schema.classes.id, classId), columns: { name: true } });
    await logActivity({
      organizationId: env.NEXT_PUBLIC_ORG_ID, actorUserId: user.id, actorName: await actorName(user.id),
      action: 'hifz_record.created', targetType: 'class', targetId: classId,
      metadata: { targetLabel: `${entries.length} record${entries.length === 1 ? '' : 's'} — ${cls?.name ?? 'a class'}` },
    });
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
  const user = await requireUser();
  await assertTeacherOwnsClass(classId, user.id);

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

  const NOTE_TITLE: Record<NoteInput['noteType'], string> = {
    praise: 'New praise',
    homework: 'Homework assigned',
    concern: 'A note from your teacher',
    general: 'New note',
  };
  for (const n of notes) {
    if (!n.content.trim()) continue;
    const student = await db.query.students.findFirst({
      where: eq(schema.students.id, n.studentId),
      columns: { fullName: true },
    });
    await notifyGuardians(n.studentId, env.NEXT_PUBLIC_ORG_ID, {
      type: 'note_added',
      title: `${NOTE_TITLE[n.noteType]} for ${student?.fullName ?? 'your child'}`,
      body: n.content.length > 100 ? `${n.content.slice(0, 100)}…` : n.content,
      link: `/parent/${n.studentId}`,
    });

    if (n.noteType === 'praise') {
      await logActivity({
        organizationId: env.NEXT_PUBLIC_ORG_ID, actorUserId: user.id, actorName: await actorName(user.id),
        action: 'adab_note.added', targetType: 'student', targetId: n.studentId,
        metadata: { targetLabel: student?.fullName ?? 'a student' },
      });
    }
  }

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
  const user = await requireUser();
  await assertTeacherOwnsClass(classId, user.id);

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

// Permanently deletes today's attendance, hifz, and notes for a class —
// the "Erase class session" escape hatch on the confirm screen, for a
// teacher who wants to redo the whole session rather than send it.
// Deliberately destructive (unlike the old inert "Skip & finish" link),
// so the UI gates it behind a confirm dialog and keeps the button tiny.
export async function eraseClassSession(classId: string, sessionDate: string) {
  const user = await requireUser();
  await assertTeacherOwnsClass(classId, user.id);
  const orgId = env.NEXT_PUBLIC_ORG_ID;

  await db.delete(schema.attendanceRecords).where(and(
    eq(schema.attendanceRecords.classId, classId),
    eq(schema.attendanceRecords.sessionDate, sessionDate),
    eq(schema.attendanceRecords.organizationId, orgId),
  ));
  await db.delete(schema.hifzRecords).where(and(
    eq(schema.hifzRecords.classId, classId),
    eq(schema.hifzRecords.sessionDate, sessionDate),
    eq(schema.hifzRecords.organizationId, orgId),
  ));

  // studentNotes has no sessionDate column — match the same day's notes by
  // createdAt, the same filter the confirm screen itself uses to show them.
  const classNotes = await db.query.studentNotes.findMany({
    where: and(eq(schema.studentNotes.classId, classId), eq(schema.studentNotes.organizationId, orgId)),
    columns: { id: true, createdAt: true },
  });
  const todayNoteIds = classNotes
    .filter(n => n.createdAt && new Date(n.createdAt).toISOString().slice(0, 10) === sessionDate)
    .map(n => n.id);
  if (todayNoteIds.length > 0) {
    await db.delete(schema.studentNotes).where(inArray(schema.studentNotes.id, todayNoteIds));
  }

  revalidatePath(`/teacher/${classId}/confirm`);
  redirect('/teacher?notice=session_erased');
}

// ---------------------------------------------------------------------------
// Trial Class / Placement Assessment
// ---------------------------------------------------------------------------
export async function getTeacherTrials(teacherId: string) {
  return db.query.trialPlacements.findMany({
    where: and(eq(schema.trialPlacements.assignedTeacherId, teacherId), eq(schema.trialPlacements.status, 'scheduled')),
    orderBy: (t, { asc }) => asc(t.scheduledDate),
  });
}

export async function submitPlacementAssessment(
  trialId: string,
  data: {
    quranReadingLevel: string;
    hifzLevel: string;
    arabicLevel: string;
    behaviorReadiness: string;
    recommendedClassId?: string;
    assessmentNotes?: string;
  },
) {
  const user = await requireUser();
  await assertTeacherOwnsTrial(trialId, user.id);

  await db.update(schema.trialPlacements)
    .set({
      quranReadingLevel: data.quranReadingLevel,
      hifzLevel: data.hifzLevel,
      arabicLevel: data.arabicLevel,
      behaviorReadiness: data.behaviorReadiness,
      recommendedClassId: data.recommendedClassId || null,
      assessmentNotes: data.assessmentNotes?.trim() || null,
      status: 'assessed',
      assessedAt: new Date(),
    })
    .where(eq(schema.trialPlacements.id, trialId));

  const trial = await db.query.trialPlacements.findFirst({ where: eq(schema.trialPlacements.id, trialId), columns: { studentFirstName: true, studentLastName: true, organizationId: true } });
  await logActivity({
    organizationId: trial?.organizationId ?? env.NEXT_PUBLIC_ORG_ID, actorUserId: user.id, actorName: await actorName(user.id),
    action: 'trial_assessment.completed', targetType: 'trial_placement', targetId: trialId,
    metadata: { targetLabel: trial ? `${trial.studentFirstName} ${trial.studentLastName}` : 'a trial student' },
  });

  revalidatePath('/teacher/trials');
  redirect('/teacher/trials?notice=assessment_submitted');
}
