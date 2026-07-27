'use server';

import { env } from '@/env';
import { logActivity } from '@/lib/activity-log';
import { db, schema } from '@/lib/db';
import { createNotification, notifyTeacherIfEnabled } from '@/lib/notifications';
import { stripe } from '@/lib/stripe';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { and, desc, eq, gte, inArray, isNull, lte, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type ParentContext = {
  userId: string;
  orgId: string;
  name: string;
};

async function requireParentContext(): Promise<ParentContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const orgId = env.NEXT_PUBLIC_ORG_ID;
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(schema.memberships.userId, user.id),
      eq(schema.memberships.organizationId, orgId),
      eq(schema.memberships.role, 'parent'),
      eq(schema.memberships.status, 'active'),
    ),
    with: { user: { columns: { fullName: true, email: true } } },
  });

  if (!membership) throw new Error('Forbidden');

  return {
    userId: user.id,
    orgId,
    name: membership.user?.fullName ?? membership.user?.email ?? 'Parent',
  };
}

async function requireGuardianOf(studentId: string): Promise<ParentContext> {
  const parent = await requireParentContext();
  const link = await db.query.studentGuardians.findFirst({
    where: and(
      eq(schema.studentGuardians.studentId, studentId),
      eq(schema.studentGuardians.guardianUserId, parent.userId),
    ),
    with: { student: { columns: { organizationId: true } } },
  });

  if (!link?.student || link.student.organizationId !== parent.orgId) redirect('/parent');

  return parent;
}

async function getGuardianStudentsForParent(parent: ParentContext) {
  const links = await db.query.studentGuardians.findMany({
    where: eq(schema.studentGuardians.guardianUserId, parent.userId),
    with: { student: true },
  });
  const seen = new Set<string>();
  return links
    .map((l) => l.student)
    .filter((s): s is NonNullable<typeof s> => {
      if (!s || s.organizationId !== parent.orgId || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
}

export async function getAnnouncements(orgId?: string) {
  const parent = await requireParentContext();
  if (orgId && orgId !== parent.orgId) throw new Error('Forbidden');

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
        eq(schema.messageThreads.organizationId, parent.orgId),
        eq(schema.messageThreads.scope, 'school_wide'),
      ),
    )
    .orderBy(desc(schema.messages.createdAt))
    .limit(5);
  return rows;
}

// Exported server actions derive the parent from the current session and
// re-check guardian access before reading or mutating child-specific data.
export async function getGuardianStudents(guardianUserId?: string) {
  const parent = await requireParentContext();
  if (guardianUserId && guardianUserId !== parent.userId) throw new Error('Forbidden');
  return getGuardianStudentsForParent(parent);
}

export async function getStudentFeed(studentId: string, date: string) {
  const { orgId } = await requireGuardianOf(studentId);

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
        const { data } = await serviceClient.storage.from('hifz-audio').createSignedUrl(path, 3600);
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
  const { orgId } = await requireGuardianOf(studentId);
  return db.query.studentNotes.findMany({
    where: and(
      eq(schema.studentNotes.studentId, studentId),
      eq(schema.studentNotes.visibleToParent, true),
      eq(schema.studentNotes.organizationId, orgId),
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
  const { orgId } = await requireGuardianOf(studentId);
  return db.query.studentNotes.findMany({
    where: and(
      eq(schema.studentNotes.studentId, studentId),
      eq(schema.studentNotes.visibleToParent, true),
      eq(schema.studentNotes.organizationId, orgId),
      eq(schema.studentNotes.noteType, 'homework'),
      isNull(schema.studentNotes.deletedAt),
    ),
    orderBy: (n, { desc }) => desc(n.createdAt),
    limit: 10,
  });
}

export async function getStudentHomework(studentId: string) {
  const { orgId } = await requireGuardianOf(studentId);
  const enrollments = await db.query.classEnrollments.findMany({
    where: eq(schema.classEnrollments.studentId, studentId),
    with: { class: { columns: { organizationId: true } } },
  });
  const classIds = enrollments
    .filter((e) => e.class?.organizationId === orgId)
    .map((e) => e.classId);
  if (classIds.length === 0) return [];

  const [assignments, completions] = await Promise.all([
    db.query.homeworkAssignments.findMany({
      where: and(
        eq(schema.homeworkAssignments.archived, false),
        eq(schema.homeworkAssignments.organizationId, orgId),
        inArray(schema.homeworkAssignments.classId, classIds),
      ),
      with: { class: { columns: { name: true } } },
      orderBy: (h, { asc }) => asc(h.dueDate),
      limit: 30,
    }),
    db.query.homeworkCompletions.findMany({
      where: and(
        eq(schema.homeworkCompletions.studentId, studentId),
        eq(schema.homeworkCompletions.organizationId, orgId),
      ),
      columns: { homeworkAssignmentId: true },
    }),
  ]);
  const doneIds = new Set(completions.map((c) => c.homeworkAssignmentId));
  return assignments.map((hw) => ({ ...hw, done: doneIds.has(hw.id) }));
}

// Parent marks (or unmarks) homework as done for their child. Completion is
// per-child, not per-assignment, since siblings in the same class finish
// at different times.
export async function setHomeworkDone(
  homeworkAssignmentId: string,
  studentId: string,
  done: boolean,
) {
  const { userId, orgId } = await requireGuardianOf(studentId);
  const homework = await db.query.homeworkAssignments.findFirst({
    where: and(
      eq(schema.homeworkAssignments.id, homeworkAssignmentId),
      eq(schema.homeworkAssignments.organizationId, orgId),
      eq(schema.homeworkAssignments.archived, false),
    ),
    columns: { classId: true },
  });
  const enrollment = homework
    ? await db.query.classEnrollments.findFirst({
        where: and(
          eq(schema.classEnrollments.classId, homework.classId),
          eq(schema.classEnrollments.studentId, studentId),
        ),
        columns: { classId: true },
      })
    : null;
  if (!homework || !enrollment) redirect(`/parent/${studentId}/homework`);

  if (done) {
    await db
      .insert(schema.homeworkCompletions)
      .values({
        organizationId: orgId,
        homeworkAssignmentId,
        studentId,
        completedBy: userId,
      })
      .onConflictDoNothing();
  } else {
    await db
      .delete(schema.homeworkCompletions)
      .where(
        and(
          eq(schema.homeworkCompletions.homeworkAssignmentId, homeworkAssignmentId),
          eq(schema.homeworkCompletions.studentId, studentId),
          eq(schema.homeworkCompletions.organizationId, orgId),
        ),
      );
  }
  revalidatePath(`/parent/${studentId}`);
}

export async function getStudentMilestones(studentId: string) {
  const { orgId } = await requireGuardianOf(studentId);
  return db.query.hifzMilestones.findMany({
    where: and(
      eq(schema.hifzMilestones.studentId, studentId),
      eq(schema.hifzMilestones.organizationId, orgId),
    ),
    orderBy: (m, { desc }) => desc(m.achievedDate),
    limit: 30,
  });
}

// Full adab/praise timeline for a child — the "Adab Growth Journal".
export async function getAdabJournal(studentId: string) {
  const { orgId } = await requireGuardianOf(studentId);
  const notes = await db.query.studentNotes.findMany({
    where: and(
      eq(schema.studentNotes.studentId, studentId),
      eq(schema.studentNotes.noteType, 'praise'),
      eq(schema.studentNotes.visibleToParent, true),
      eq(schema.studentNotes.organizationId, orgId),
      isNull(schema.studentNotes.deletedAt),
    ),
    with: { class: { columns: { name: true } } },
    orderBy: (n, { desc }) => desc(n.createdAt),
  });
  const seen = new Set<string>();
  return notes.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });
}

// Monthly report card: attendance summary, hifz progress, milestones, and
// praise/general notes for a student over a given calendar month. Powers the
// printable "here's what your child learned this month" export.
export async function getStudentReportCard(studentId: string, month: string) {
  const { orgId } = await requireGuardianOf(studentId);

  const [year, mon] = month.split('-').map(Number);
  const monthStart = `${month}-01`;
  const lastDay = new Date(year!, mon!, 0).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;
  const rangeStart = new Date(`${monthStart}T00:00:00Z`);
  const rangeEnd = new Date(`${monthEnd}T23:59:59Z`);

  const [student, enrollments, attendance, hifz, milestones, notes] = await Promise.all([
    db.query.students.findFirst({
      where: and(eq(schema.students.id, studentId), eq(schema.students.organizationId, orgId)),
    }),
    db.query.classEnrollments.findMany({
      where: eq(schema.classEnrollments.studentId, studentId),
      with: { class: { columns: { name: true, organizationId: true } } },
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
    present: attendance.filter((a) => a.status === 'present').length,
    late: attendance.filter((a) => a.status === 'late').length,
    absent: attendance.filter((a) => a.status === 'absent').length,
    excused: attendance.filter((a) => a.status === 'excused').length,
    total: attendance.length,
  };

  return {
    student,
    className:
      enrollments
        .map((e) => (e.class?.organizationId === orgId ? e.class.name : null))
        .filter(Boolean)
        .join(', ') || null,
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
  const { userId, orgId, name } = await requireGuardianOf(studentId);

  const [record] = await db
    .update(schema.attendanceRecords)
    .set({
      guardianReason: reason,
      guardianReasonNote: note?.trim() || null,
      guardianReasonSubmittedAt: new Date(),
    })
    .where(
      and(
        eq(schema.attendanceRecords.id, attendanceId),
        eq(schema.attendanceRecords.studentId, studentId),
        eq(schema.attendanceRecords.organizationId, orgId),
      ),
    )
    .returning({ classId: schema.attendanceRecords.classId });
  if (!record) redirect(`/parent/${studentId}`);

  const student = await db.query.students.findFirst({
    where: and(eq(schema.students.id, studentId), eq(schema.students.organizationId, orgId)),
    columns: { fullName: true },
  });
  await logActivity({
    organizationId: orgId,
    actorUserId: userId,
    actorName: name,
    action: 'absence_reason.submitted',
    targetType: 'student',
    targetId: studentId,
    metadata: { targetLabel: student?.fullName ?? 'a student' },
  });

  const cls = await db.query.classes.findFirst({
    where: and(eq(schema.classes.id, record.classId), eq(schema.classes.organizationId, orgId)),
    columns: { primaryTeacherId: true },
  });
  if (cls?.primaryTeacherId) {
    await notifyTeacherIfEnabled(cls.primaryTeacherId, orgId, 'absenceResponses', {
      type: 'absence_reason',
      title: `${student?.fullName ?? 'A parent'} responded about an absence`,
      body: `Reason: ${reason.replace('_', ' ')}${note ? ` — ${note}` : ''}`,
      link: '/teacher',
    });
  }

  revalidatePath(`/parent/${studentId}`);
  redirect(`/parent/${studentId}?notice=absence_reason_submitted`);
}

// Recent direct messages between this parent and the child's teacher —
// reuses the existing message_threads/messages tables (scope: 'direct'),
// which already supported this but had no UI writing to it yet.
export async function getNotesToTeacher(studentId: string) {
  const { orgId } = await requireGuardianOf(studentId);
  const threads = await db.query.messageThreads.findMany({
    where: and(
      eq(schema.messageThreads.studentId, studentId),
      eq(schema.messageThreads.organizationId, orgId),
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
  return threads
    .flatMap((t) => t.messages)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Shared by sendNoteToTeacher (one child) and sendNoteToAllTeachers (every
// linked child) — creates the thread/message and notifies that child's
// teacher, without redirecting, so callers can loop or redirect once.
async function sendNoteToTeacherInternal(
  userId: string,
  orgId: string,
  studentId: string,
  trimmed: string,
) {
  const enrollment = await db.query.classEnrollments.findFirst({
    where: eq(schema.classEnrollments.studentId, studentId),
    with: { class: { columns: { id: true, organizationId: true, primaryTeacherId: true } } },
  });
  const cls = enrollment?.class?.organizationId === orgId ? enrollment.class : null;
  const classId = cls?.id;
  const teacherId = cls?.primaryTeacherId;

  const [thread] = await db
    .insert(schema.messageThreads)
    .values({
      organizationId: orgId,
      scope: 'direct',
      studentId,
      classId: classId ?? null,
      createdBy: userId,
    })
    .returning({ id: schema.messageThreads.id });
  if (!thread) return;

  await db.insert(schema.messages).values({
    threadId: thread.id,
    senderUserId: userId,
    content: trimmed,
  });

  if (teacherId) {
    const [student, parentRow] = await Promise.all([
      db.query.students.findFirst({
        where: and(eq(schema.students.id, studentId), eq(schema.students.organizationId, orgId)),
        columns: { fullName: true },
      }),
      db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { fullName: true } }),
    ]);
    await createNotification({
      organizationId: orgId,
      userId: teacherId,
      type: 'note_added',
      title: `Note from ${parentRow?.fullName ?? 'a parent'} about ${student?.fullName ?? 'a student'}`,
      body: trimmed.length > 100 ? `${trimmed.slice(0, 100)}…` : trimmed,
      link: `/teacher/${classId}/students/${studentId}`,
    });
  }
}

export async function sendNoteToTeacher(studentId: string, content: string) {
  const { userId, orgId } = await requireGuardianOf(studentId);

  const trimmed = content.trim();
  if (!trimmed) redirect(`/parent/${studentId}/message`);

  await sendNoteToTeacherInternal(userId, orgId, studentId, trimmed);

  revalidatePath(`/parent/${studentId}/message`);
  redirect(`/parent/${studentId}/message?notice=note_sent_to_teacher`);
}

// Sends the same note to every linked child's teacher — one thread per
// child, so it shows up correctly in each child's own message history.
export async function sendNoteToAllTeachers(content: string) {
  const parent = await requireParentContext();

  const trimmed = content.trim();
  if (!trimmed) redirect('/parent/message');

  const students = await getGuardianStudentsForParent(parent);
  for (const student of students) {
    await sendNoteToTeacherInternal(parent.userId, parent.orgId, student.id, trimmed);
  }

  revalidatePath('/parent');
  redirect('/parent/message?notice=note_sent_to_all_teachers');
}

// "Unsend" — only the sender can remove their own message. Hard delete
// (unlike homework/notes, unsending isn't meant to be recoverable).
export async function unsendMessage(messageId: string, studentId: string) {
  const { userId, orgId } = await requireGuardianOf(studentId);

  const message = await db.query.messages.findFirst({
    where: eq(schema.messages.id, messageId),
    columns: { senderUserId: true },
    with: {
      thread: { columns: { organizationId: true, scope: true, studentId: true } },
    },
  });
  if (
    message?.senderUserId === userId &&
    message.thread?.organizationId === orgId &&
    message.thread.scope === 'direct' &&
    message.thread.studentId === studentId
  ) {
    await db.delete(schema.messages).where(eq(schema.messages.id, messageId));
  }

  revalidatePath(`/parent/${studentId}/message`);
  redirect(`/parent/${studentId}/message?notice=message_unsent`);
}

export async function createParentPaymentSession(planId: string, studentId: string) {
  const { orgId } = await requireGuardianOf(studentId);

  const plan = await db.query.tuitionPlans.findFirst({
    where: and(
      eq(schema.tuitionPlans.id, planId),
      eq(schema.tuitionPlans.studentId, studentId),
      eq(schema.tuitionPlans.organizationId, orgId),
      ne(schema.tuitionPlans.status, 'cancelled'),
    ),
    with: { student: true },
  });
  if (!plan) redirect(`/parent/${studentId}`);

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
    ...(isRecurring
      ? { recurring: { interval: plan.frequency === 'annual' ? 'year' : 'month' } }
      : {}),
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
  const { orgId } = await requireGuardianOf(studentId);
  const plan = await db.query.tuitionPlans.findFirst({
    where: and(
      eq(schema.tuitionPlans.studentId, studentId),
      eq(schema.tuitionPlans.organizationId, orgId),
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
export async function getAllParentTuition(guardianUserId?: string) {
  const parent = await requireParentContext();
  if (guardianUserId && guardianUserId !== parent.userId) throw new Error('Forbidden');
  const students = await getGuardianStudentsForParent(parent);
  const rows = await Promise.all(
    students.map(async (student) => {
      const plan = await db.query.tuitionPlans.findFirst({
        where: and(
          eq(schema.tuitionPlans.studentId, student.id),
          eq(schema.tuitionPlans.organizationId, parent.orgId),
          ne(schema.tuitionPlans.status, 'cancelled'),
        ),
        with: {
          payments: { orderBy: (p, { desc }) => desc(p.paidAt) },
        },
        orderBy: (t, { desc }) => desc(t.createdAt),
      });
      return { student, plan: plan ?? null };
    }),
  );
  return rows;
}
