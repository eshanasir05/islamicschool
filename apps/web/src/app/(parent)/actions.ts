'use server';

import { and, desc, eq, gte, inArray, isNull, lte, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db, schema } from '@/lib/db';
import { env } from '@/env';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { logActivity } from '@/lib/activity-log';
import { notifyTeacherIfEnabled, createNotification } from '@/lib/notifications';

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

// Defense-in-depth: every function below that takes a raw studentId is
// currently only ever called from Server Components that already verify
// the caller is a linked guardian — but 'use server' exports are callable
// directly, so we re-verify here too in case a future change (e.g. a
// client component importing one of these for a refresh button) skips
// that page-level check.
async function assertGuardianOf(studentId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const link = await db.query.studentGuardians.findFirst({
    where: and(
      eq(schema.studentGuardians.studentId, studentId),
      eq(schema.studentGuardians.guardianUserId, user.id),
    ),
  });
  if (!link) redirect('/parent');
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
  await assertGuardianOf(studentId);
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
      orderBy: (h, { desc }) => desc(h.createdAt),
    }),
    db.query.studentNotes.findMany({
      where: and(
        eq(schema.studentNotes.studentId, studentId),
        eq(schema.studentNotes.visibleToParent, true),
        eq(schema.studentNotes.organizationId, orgId),
        isNull(schema.studentNotes.deletedAt),
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

// General/concern notes from the teacher — content that isn't praise or
// homework, shown on the "Message the teacher" page alongside the direct
// message thread.
export async function getGeneralNotesForStudent(studentId: string) {
  await assertGuardianOf(studentId);
  return db.query.studentNotes.findMany({
    where: and(
      eq(schema.studentNotes.studentId, studentId),
      eq(schema.studentNotes.visibleToParent, true),
      inArray(schema.studentNotes.noteType, ['general', 'concern']),
      isNull(schema.studentNotes.deletedAt),
    ),
    orderBy: (n, { desc }) => desc(n.createdAt),
    limit: 20,
  });
}

// Informal "homework" notes a teacher jots down during class (distinct from
// the formal homeworkAssignments table) — shown alongside real assignments
// on the Homework page.
export async function getHomeworkNotesForStudent(studentId: string) {
  await assertGuardianOf(studentId);
  return db.query.studentNotes.findMany({
    where: and(
      eq(schema.studentNotes.studentId, studentId),
      eq(schema.studentNotes.visibleToParent, true),
      eq(schema.studentNotes.noteType, 'homework'),
      isNull(schema.studentNotes.deletedAt),
    ),
    orderBy: (n, { desc }) => desc(n.createdAt),
    limit: 10,
  });
}

export async function getStudentHomework(studentId: string) {
  await assertGuardianOf(studentId);
  const enrollments = await db.query.classEnrollments.findMany({
    where: eq(schema.classEnrollments.studentId, studentId),
    columns: { classId: true },
  });
  if (enrollments.length === 0) return [];
  const classIds = enrollments.map(e => e.classId);

  const [assignments, completions] = await Promise.all([
    db.query.homeworkAssignments.findMany({
      where: and(
        eq(schema.homeworkAssignments.archived, false),
        inArray(schema.homeworkAssignments.classId, classIds),
      ),
      with: { class: { columns: { name: true } } },
      orderBy: (h, { asc }) => asc(h.dueDate),
      limit: 30,
    }),
    db.query.homeworkCompletions.findMany({
      where: eq(schema.homeworkCompletions.studentId, studentId),
      columns: { homeworkAssignmentId: true },
    }),
  ]);
  const doneIds = new Set(completions.map(c => c.homeworkAssignmentId));
  return assignments.map(hw => ({ ...hw, done: doneIds.has(hw.id) }));
}

// Parent marks (or unmarks) homework as done for their child. Completion is
// per-child, not per-assignment, since siblings in the same class finish
// at different times.
export async function setHomeworkDone(homeworkAssignmentId: string, studentId: string, done: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  await assertGuardianOf(studentId);

  if (done) {
    await db.insert(schema.homeworkCompletions)
      .values({
        organizationId: env.NEXT_PUBLIC_ORG_ID,
        homeworkAssignmentId,
        studentId,
        completedBy: user.id,
      })
      .onConflictDoNothing();
  } else {
    await db.delete(schema.homeworkCompletions)
      .where(and(
        eq(schema.homeworkCompletions.homeworkAssignmentId, homeworkAssignmentId),
        eq(schema.homeworkCompletions.studentId, studentId),
      ));
  }
  revalidatePath(`/parent/${studentId}`);
}

export async function getStudentMilestones(studentId: string) {
  await assertGuardianOf(studentId);
  return db.query.hifzMilestones.findMany({
    where: eq(schema.hifzMilestones.studentId, studentId),
    orderBy: (m, { desc }) => desc(m.achievedDate),
    limit: 30,
  });
}

// Full adab/praise timeline for a child — the "Adab Growth Journal".
export async function getAdabJournal(studentId: string) {
  await assertGuardianOf(studentId);
  const notes = await db.query.studentNotes.findMany({
    where: and(
      eq(schema.studentNotes.studentId, studentId),
      eq(schema.studentNotes.noteType, 'praise'),
      eq(schema.studentNotes.visibleToParent, true),
      isNull(schema.studentNotes.deletedAt),
    ),
    with: { class: { columns: { name: true } } },
    orderBy: (n, { desc }) => desc(n.createdAt),
  });
  const seen = new Set<string>();
  return notes.filter(n => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });
}

// Monthly report card: attendance summary, hifz progress, milestones, and
// praise/general notes for a student over a given calendar month. Powers the
// printable "here's what your child learned this month" export.
export async function getStudentReportCard(studentId: string, month: string) {
  await assertGuardianOf(studentId);
  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const [year, mon] = month.split('-').map(Number);
  const monthStart = `${month}-01`;
  const lastDay = new Date(year!, mon!, 0).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;
  const rangeStart = new Date(`${monthStart}T00:00:00Z`);
  const rangeEnd = new Date(`${monthEnd}T23:59:59Z`);

  const [student, enrollments, attendance, hifz, milestones, notes] = await Promise.all([
    db.query.students.findFirst({ where: eq(schema.students.id, studentId) }),
    db.query.classEnrollments.findMany({
      where: eq(schema.classEnrollments.studentId, studentId),
      with: { class: { columns: { name: true } } },
    }),
    db.query.attendanceRecords.findMany({
      where: and(
        eq(schema.attendanceRecords.studentId, studentId),
        eq(schema.attendanceRecords.organizationId, orgId),
        gte(schema.attendanceRecords.sessionDate, monthStart),
        lte(schema.attendanceRecords.sessionDate, monthEnd),
      ),
      orderBy: (a, { asc }) => asc(a.sessionDate),
    }),
    db.query.hifzRecords.findMany({
      where: and(
        eq(schema.hifzRecords.studentId, studentId),
        eq(schema.hifzRecords.organizationId, orgId),
        gte(schema.hifzRecords.sessionDate, monthStart),
        lte(schema.hifzRecords.sessionDate, monthEnd),
      ),
      orderBy: (h, { asc }) => asc(h.sessionDate),
    }),
    db.query.hifzMilestones.findMany({
      where: and(
        eq(schema.hifzMilestones.studentId, studentId),
        eq(schema.hifzMilestones.organizationId, orgId),
        gte(schema.hifzMilestones.achievedDate, monthStart),
        lte(schema.hifzMilestones.achievedDate, monthEnd),
      ),
      orderBy: (m, { asc }) => asc(m.achievedDate),
    }),
    db.query.studentNotes.findMany({
      where: and(
        eq(schema.studentNotes.studentId, studentId),
        eq(schema.studentNotes.organizationId, orgId),
        eq(schema.studentNotes.visibleToParent, true),
        gte(schema.studentNotes.createdAt, rangeStart),
        lte(schema.studentNotes.createdAt, rangeEnd),
        isNull(schema.studentNotes.deletedAt),
      ),
      orderBy: (n, { asc }) => asc(n.createdAt),
    }),
  ]);

  const attendanceSummary = {
    present: attendance.filter(a => a.status === 'present').length,
    late: attendance.filter(a => a.status === 'late').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    excused: attendance.filter(a => a.status === 'excused').length,
    total: attendance.length,
  };

  return {
    student,
    className: enrollments.map(e => e.class?.name).filter(Boolean).join(', ') || null,
    monthStart,
    monthEnd,
    attendanceSummary,
    hifz,
    milestones,
    notes,
  };
}

export async function submitAbsenceReason(
  attendanceId: string,
  studentId: string,
  reason: 'sick' | 'travel' | 'family_emergency' | 'forgot' | 'other',
  note?: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const guardianLink = await db.query.studentGuardians.findFirst({
    where: and(
      eq(schema.studentGuardians.studentId, studentId),
      eq(schema.studentGuardians.guardianUserId, user.id),
    ),
  });
  if (!guardianLink) redirect(`/parent/${studentId}`);

  const [record] = await db.update(schema.attendanceRecords)
    .set({
      guardianReason: reason,
      guardianReasonNote: note?.trim() || null,
      guardianReasonSubmittedAt: new Date(),
    })
    .where(and(
      eq(schema.attendanceRecords.id, attendanceId),
      eq(schema.attendanceRecords.studentId, studentId),
    ))
    .returning({ classId: schema.attendanceRecords.classId });

  const [student, actorRow] = await Promise.all([
    db.query.students.findFirst({ where: eq(schema.students.id, studentId), columns: { fullName: true } }),
    db.query.users.findFirst({ where: eq(schema.users.id, user.id), columns: { fullName: true } }),
  ]);
  await logActivity({
    organizationId: env.NEXT_PUBLIC_ORG_ID, actorUserId: user.id, actorName: actorRow?.fullName ?? 'Unknown',
    action: 'absence_reason.submitted', targetType: 'student', targetId: studentId,
    metadata: { targetLabel: student?.fullName ?? 'a student' },
  });

  if (record) {
    const cls = await db.query.classes.findFirst({
      where: eq(schema.classes.id, record.classId),
      columns: { primaryTeacherId: true },
    });
    if (cls?.primaryTeacherId) {
      await notifyTeacherIfEnabled(cls.primaryTeacherId, env.NEXT_PUBLIC_ORG_ID, 'absenceResponses', {
        type: 'absence_reason',
        title: `${student?.fullName ?? 'A parent'} responded about an absence`,
        body: `Reason: ${reason.replace('_', ' ')}${note ? ` — ${note}` : ''}`,
        link: `/teacher`,
      });
    }
  }

  revalidatePath(`/parent/${studentId}`);
  redirect(`/parent/${studentId}?notice=absence_reason_submitted`);
}

// Recent direct messages between this parent and the child's teacher —
// reuses the existing message_threads/messages tables (scope: 'direct'),
// which already supported this but had no UI writing to it yet.
export async function getNotesToTeacher(studentId: string) {
  await assertGuardianOf(studentId);
  const threads = await db.query.messageThreads.findMany({
    where: and(
      eq(schema.messageThreads.studentId, studentId),
      eq(schema.messageThreads.scope, 'direct'),
    ),
    with: {
      messages: {
        orderBy: (m, { asc }) => asc(m.createdAt),
        with: { sender: { columns: { fullName: true } } },
      },
    },
    orderBy: (t, { desc }) => desc(t.createdAt),
    limit: 30,
  });
  return threads.flatMap(t => t.messages).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function sendNoteToTeacher(studentId: string, content: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  await assertGuardianOf(studentId);

  const trimmed = content.trim();
  if (!trimmed) redirect(`/parent/${studentId}`);

  const enrollment = await db.query.classEnrollments.findFirst({
    where: eq(schema.classEnrollments.studentId, studentId),
    with: { class: { columns: { id: true, primaryTeacherId: true } } },
  });
  const classId = enrollment?.class?.id;
  const teacherId = enrollment?.class?.primaryTeacherId;

  const [thread] = await db.insert(schema.messageThreads).values({
    organizationId: env.NEXT_PUBLIC_ORG_ID,
    scope: 'direct',
    studentId,
    classId: classId ?? null,
    createdBy: user.id,
  }).returning({ id: schema.messageThreads.id });
  if (!thread) redirect(`/parent/${studentId}`);

  await db.insert(schema.messages).values({
    threadId: thread.id,
    senderUserId: user.id,
    content: trimmed,
  });

  if (teacherId) {
    const [student, parentRow] = await Promise.all([
      db.query.students.findFirst({ where: eq(schema.students.id, studentId), columns: { fullName: true } }),
      db.query.users.findFirst({ where: eq(schema.users.id, user.id), columns: { fullName: true } }),
    ]);
    await createNotification({
      organizationId: env.NEXT_PUBLIC_ORG_ID,
      userId: teacherId,
      type: 'note_added',
      title: `Note from ${parentRow?.fullName ?? 'a parent'} about ${student?.fullName ?? 'a student'}`,
      body: trimmed.length > 100 ? `${trimmed.slice(0, 100)}…` : trimmed,
      link: `/teacher/${classId}/students/${studentId}`,
    });
  }

  revalidatePath(`/parent/${studentId}`);
  redirect(`/parent/${studentId}?notice=note_sent_to_teacher`);
}

export async function createParentPaymentSession(planId: string, studentId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const plan = await db.query.tuitionPlans.findFirst({
    where: eq(schema.tuitionPlans.id, planId),
    with: { student: true },
  });
  if (!plan) redirect(`/parent/${studentId}`);

  // Verify caller is a guardian of this student
  const guardianLink = await db.query.studentGuardians.findFirst({
    where: and(
      eq(schema.studentGuardians.studentId, plan.studentId),
      eq(schema.studentGuardians.guardianUserId, user.id),
    ),
  });
  if (!guardianLink) redirect(`/parent/${studentId}`);

  const appUrl = env.NEXT_PUBLIC_APP_URL;

  if (plan.status === 'past_due' || plan.status === 'active') {
    if (!plan.stripeCustomerId) redirect(`/parent/${studentId}?notice=billing_no_customer`);
    const portal = await stripe.billingPortal.sessions.create({
      customer: plan.stripeCustomerId,
      return_url: `${appUrl}/parent/${plan.studentId}`,
    });
    redirect(portal.url);
  }

  // pending_payment — create a fresh Checkout session
  const isRecurring = plan.frequency !== 'one_time';
  const price = await stripe.prices.create({
    unit_amount: plan.amountCents,
    currency: plan.currency.toLowerCase(),
    ...(isRecurring ? { recurring: { interval: plan.frequency === 'annual' ? 'year' : 'month' } } : {}),
    product_data: { name: `Tuition — ${plan.student?.fullName ?? 'Student'}` },
  });

  const session = await stripe.checkout.sessions.create({
    customer: plan.stripeCustomerId ?? undefined,
    payment_method_types: ['card'],
    line_items: [{ price: price.id, quantity: 1 }],
    mode: isRecurring ? 'subscription' : 'payment',
    success_url: `${appUrl}/parent/${plan.studentId}?payment=success`,
    cancel_url: `${appUrl}/parent/${plan.studentId}`,
    metadata: { planId: plan.id },
  });

  redirect(session.url!);
}

export async function getParentTuition(studentId: string) {
  await assertGuardianOf(studentId);
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

// Full billing page: every linked child's tuition plan with complete payment
// history (no limit), for the dedicated /parent/billing page.
export async function getAllParentTuition(guardianUserId: string) {
  const students = await getGuardianStudents(guardianUserId);
  const rows = await Promise.all(students.map(async student => {
    const plan = await db.query.tuitionPlans.findFirst({
      where: and(
        eq(schema.tuitionPlans.studentId, student.id),
        ne(schema.tuitionPlans.status, 'cancelled'),
      ),
      with: {
        payments: { orderBy: (p, { desc }) => desc(p.paidAt) },
      },
      orderBy: (t, { desc }) => desc(t.createdAt),
    });
    return { student, plan: plan ?? null };
  }));
  return rows;
}
