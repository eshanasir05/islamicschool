'use server';

import { and, count, desc, eq, gte, inArray, max, sum } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db, schema } from '@/lib/db';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { env } from '@/env';
import { notifyAllGuardiansInOrg, createNotification } from '@/lib/notifications';

export async function getAdminStats(orgId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekStart = sevenDaysAgo.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [attendanceRows, hifzCount, classes, tuitionPlans] = await Promise.all([
    // Attendance this week
    db
      .select({ status: schema.attendanceRecords.status, cnt: count() })
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.organizationId, orgId),
          gte(schema.attendanceRecords.sessionDate, weekStart),
        ),
      )
      .groupBy(schema.attendanceRecords.status),

    // Hifz wins this week
    db
      .select({ cnt: count() })
      .from(schema.hifzRecords)
      .where(
        and(
          eq(schema.hifzRecords.organizationId, orgId),
          gte(schema.hifzRecords.sessionDate, weekStart),
        ),
      ),

    // Classes with today's wrap status
    db.query.classes.findMany({
      where: eq(schema.classes.organizationId, orgId),
      with: { primaryTeacher: true },
    }),

    // Tuition plans
    db
      .select({ status: schema.tuitionPlans.status, cnt: count() })
      .from(schema.tuitionPlans)
      .where(eq(schema.tuitionPlans.organizationId, orgId))
      .groupBy(schema.tuitionPlans.status),
  ]);

  // Check which classes are wrapped today
  const todayAttendanceClassIds = await db
    .selectDistinct({ classId: schema.attendanceRecords.classId })
    .from(schema.attendanceRecords)
    .where(
      and(
        eq(schema.attendanceRecords.organizationId, orgId),
        eq(schema.attendanceRecords.sessionDate, today),
      ),
    );
  const wrappedSet = new Set(todayAttendanceClassIds.map(r => r.classId));

  const presentCount = attendanceRows.find(r => r.status === 'present')?.cnt ?? 0;
  const totalCount = attendanceRows.reduce((s, r) => s + Number(r.cnt), 0);
  const attendancePct = totalCount > 0 ? Math.round((Number(presentCount) / totalCount) * 100) : 0;
  const hifzWins = Number(hifzCount[0]?.cnt ?? 0);
  const classesWrapped = classes.filter(c => wrappedSet.has(c.id)).length;
  const activeTuition = Number(tuitionPlans.find(t => t.status === 'active')?.cnt ?? 0);

  return {
    attendancePct,
    hifzWins,
    classesWrapped,
    activeTuition,
    classes: classes.map(c => ({
      id: c.id,
      name: c.name,
      teacherName: c.primaryTeacher?.fullName ?? 'Unassigned',
      wrappedToday: wrappedSet.has(c.id),
    })),
  };
}

export async function getAdminStudents(orgId: string) {
  return db.query.students.findMany({
    where: eq(schema.students.organizationId, orgId),
    with: {
      enrollments: { with: { class: true } },
      guardians: true,
    },
    orderBy: (s, { asc }) => asc(s.fullName),
  });
}

export async function getAdminStudent(studentId: string, orgId: string) {
  const [student, attendance, hifz, milestones, noteCount] = await Promise.all([
    db.query.students.findFirst({
      where: and(eq(schema.students.id, studentId), eq(schema.students.organizationId, orgId)),
      with: {
        enrollments: { with: { class: true } },
        guardians: { with: { guardian: true } },
      },
    }),
    db.query.attendanceRecords.findMany({
      where: and(eq(schema.attendanceRecords.studentId, studentId), eq(schema.attendanceRecords.organizationId, orgId)),
      orderBy: (a, { desc }) => desc(a.sessionDate),
    }),
    db.query.hifzRecords.findMany({
      where: and(eq(schema.hifzRecords.studentId, studentId), eq(schema.hifzRecords.organizationId, orgId)),
      orderBy: (h, { desc }) => desc(h.sessionDate),
    }),
    db.query.hifzMilestones.findMany({
      where: and(eq(schema.hifzMilestones.studentId, studentId), eq(schema.hifzMilestones.organizationId, orgId)),
      orderBy: (m, { desc }) => desc(m.achievedDate),
    }),
    db.select({ cnt: count() }).from(schema.studentNotes)
      .where(and(eq(schema.studentNotes.studentId, studentId), eq(schema.studentNotes.organizationId, orgId))),
  ]);
  return { student, attendance, hifz, milestones, noteCount: Number(noteCount[0]?.cnt ?? 0) };
}

export async function getAdminClasses(orgId: string) {
  const classes = await db.query.classes.findMany({
    where: eq(schema.classes.organizationId, orgId),
    with: { primaryTeacher: true, enrollments: true },
  });
  const today = new Date().toISOString().slice(0, 10);
  const todayWrapped = await db
    .selectDistinct({ classId: schema.attendanceRecords.classId })
    .from(schema.attendanceRecords)
    .where(and(eq(schema.attendanceRecords.organizationId, orgId), eq(schema.attendanceRecords.sessionDate, today)));
  const wrappedSet = new Set(todayWrapped.map(r => r.classId));
  return classes.map(c => ({
    id: c.id,
    name: c.name,
    teacherName: c.primaryTeacher?.fullName ?? 'Unassigned',
    studentCount: c.enrollments.length,
    wrappedToday: wrappedSet.has(c.id),
    academicYear: c.academicYear,
    deletedAt: c.deletedAt,
  }));
}

export async function getAdminTeachers(orgId: string) {
  const memberships = await db.query.memberships.findMany({
    where: and(eq(schema.memberships.organizationId, orgId), eq(schema.memberships.role, 'teacher')),
    with: { user: true },
  });
  const teacherIds = memberships.map(m => m.userId);

  const [classRows, lastSessionRows] = await Promise.all([
    db.query.classes.findMany({
      where: eq(schema.classes.organizationId, orgId),
      with: { primaryTeacher: true },
    }),
    teacherIds.length > 0
      ? db.select({ teacherId: schema.attendanceRecords.recordedBy, lastDate: max(schema.attendanceRecords.sessionDate) })
          .from(schema.attendanceRecords)
          .where(eq(schema.attendanceRecords.organizationId, orgId))
          .groupBy(schema.attendanceRecords.recordedBy)
      : Promise.resolve([]),
  ]);

  const lastSessionMap = new Map(lastSessionRows.map(r => [r.teacherId, r.lastDate]));
  const classesByTeacher = new Map<string, string[]>();
  for (const cls of classRows) {
    if (cls.primaryTeacherId) {
      const arr = classesByTeacher.get(cls.primaryTeacherId) ?? [];
      arr.push(cls.name);
      classesByTeacher.set(cls.primaryTeacherId, arr);
    }
  }

  return memberships.map(m => ({
    id: m.userId,
    name: m.user?.fullName ?? '—',
    email: m.user?.email ?? '—',
    classes: classesByTeacher.get(m.userId) ?? [],
    lastSession: lastSessionMap.get(m.userId) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------
export async function getAnnouncements(orgId: string) {
  const rows = await db
    .select({
      threadId: schema.messageThreads.id,
      createdAt: schema.messages.createdAt,
      content: schema.messages.content,
      senderUserId: schema.messages.senderUserId,
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
    .limit(20);

  const senderIds = [...new Set(rows.map(r => r.senderUserId))];
  const senders = senderIds.length > 0
    ? await db.query.users.findMany({ where: (u, { inArray }) => inArray(u.id, senderIds) })
    : [];
  const senderMap = new Map(senders.map(s => [s.id, s.fullName ?? s.email ?? '—']));

  return rows.map(r => ({
    id: r.threadId,
    content: r.content,
    createdAt: r.createdAt,
    senderName: senderMap.get(r.senderUserId) ?? '—',
  }));
}

export async function createAnnouncement(orgId: string, userId: string, content: string) {
  const [thread] = await db.insert(schema.messageThreads).values({
    organizationId: orgId,
    scope: 'school_wide',
    createdBy: userId,
  }).returning({ id: schema.messageThreads.id });

  if (!thread) throw new Error('Failed to create thread');

  await db.insert(schema.messages).values({
    threadId: thread.id,
    senderUserId: userId,
    content,
  });

  await notifyAllGuardiansInOrg(orgId, {
    type: 'announcement',
    title: 'New school announcement',
    body: content.length > 100 ? `${content.slice(0, 100)}…` : content,
    link: '/parent',
  });

  revalidatePath('/admin/announcements');
  revalidatePath('/parent');
}

export async function deleteAnnouncement(threadId: string) {
  await db.delete(schema.messages).where(eq(schema.messages.threadId, threadId));
  await db.delete(schema.messageThreads).where(eq(schema.messageThreads.id, threadId));
  revalidatePath('/admin/announcements');
  revalidatePath('/parent');
}

// ---------------------------------------------------------------------------
// Student CRUD
// ---------------------------------------------------------------------------
export async function createStudent(
  orgId: string,
  data: { fullName: string; dateOfBirth: string; gender?: string },
) {
  const [row] = await db
    .insert(schema.students)
    .values({
      organizationId: orgId,
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender ?? null,
      status: 'active',
    })
    .returning({ id: schema.students.id });
  if (!row) throw new Error('Insert failed');
  revalidatePath('/admin/students');
  redirect(`/admin/students/${row.id}?notice=student_created`);
}

export async function updateStudent(
  studentId: string,
  orgId: string,
  data: { fullName: string; dateOfBirth: string; gender?: string; medicalNotes?: string },
) {
  await db
    .update(schema.students)
    .set({
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender ?? null,
      medicalNotes: data.medicalNotes ?? null,
    })
    .where(and(eq(schema.students.id, studentId), eq(schema.students.organizationId, orgId)));
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath('/admin/students');
  redirect(`/admin/students/${studentId}?notice=student_updated`);
}

export async function setStudentStatus(
  studentId: string,
  orgId: string,
  status: 'active' | 'inactive',
) {
  await db
    .update(schema.students)
    .set({ status })
    .where(and(eq(schema.students.id, studentId), eq(schema.students.organizationId, orgId)));
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath('/admin/students');
  redirect(`/admin/students/${studentId}?notice=${status === 'active' ? 'student_restored' : 'student_archived'}`);
}

// ---------------------------------------------------------------------------
// Class CRUD
// ---------------------------------------------------------------------------
export async function createClass(
  orgId: string,
  data: { name: string; gradeLevel?: string; academicYear?: string; capacity?: number; primaryTeacherId?: string },
) {
  const [row] = await db
    .insert(schema.classes)
    .values({
      organizationId: orgId,
      name: data.name,
      gradeLevel: data.gradeLevel ?? null,
      academicYear: data.academicYear ?? null,
      capacity: data.capacity ?? null,
      primaryTeacherId: data.primaryTeacherId || null,
    })
    .returning({ id: schema.classes.id });
  if (!row) throw new Error('Insert failed');
  revalidatePath('/admin/classes');
  revalidatePath('/admin');
  redirect(`/admin/classes/${row.id}?notice=class_created`);
}

export async function updateClass(
  classId: string,
  orgId: string,
  data: { name: string; gradeLevel?: string; academicYear?: string; capacity?: string; primaryTeacherId?: string },
) {
  await db
    .update(schema.classes)
    .set({
      name: data.name,
      gradeLevel: data.gradeLevel || null,
      academicYear: data.academicYear || null,
      capacity: data.capacity ? Number(data.capacity) : null,
      primaryTeacherId: data.primaryTeacherId || null,
    })
    .where(and(eq(schema.classes.id, classId), eq(schema.classes.organizationId, orgId)));
  revalidatePath('/admin/classes');
  revalidatePath('/admin');
  redirect(`/admin/classes/${classId}?notice=class_updated`);
}

export async function archiveClass(classId: string, orgId: string) {
  await db
    .update(schema.classes)
    .set({ deletedAt: new Date() })
    .where(and(eq(schema.classes.id, classId), eq(schema.classes.organizationId, orgId)));
  revalidatePath('/admin/classes');
  revalidatePath('/admin');
  redirect(`/admin/classes/${classId}?notice=class_archived`);
}

export async function restoreClass(classId: string, orgId: string) {
  await db
    .update(schema.classes)
    .set({ deletedAt: null })
    .where(and(eq(schema.classes.id, classId), eq(schema.classes.organizationId, orgId)));
  revalidatePath('/admin/classes');
  revalidatePath('/admin');
  redirect(`/admin/classes/${classId}?notice=class_restored`);
}

// ---------------------------------------------------------------------------
// Class detail + enrollment
// ---------------------------------------------------------------------------
export async function getAdminClassDetail(classId: string, orgId: string) {
  const cls = await db.query.classes.findFirst({
    where: and(eq(schema.classes.id, classId), eq(schema.classes.organizationId, orgId)),
    with: {
      primaryTeacher: true,
      enrollments: { with: { student: true } },
    },
  });

  const enrolledStudentIds = cls?.enrollments.map(e => e.studentId) ?? [];

  const [sessionRows, homework, milestones] = await Promise.all([
    db
      .select({
        sessionDate: schema.attendanceRecords.sessionDate,
        status: schema.attendanceRecords.status,
        cnt: count(),
      })
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.classId, classId),
          eq(schema.attendanceRecords.organizationId, orgId),
        ),
      )
      .groupBy(schema.attendanceRecords.sessionDate, schema.attendanceRecords.status)
      .orderBy(desc(schema.attendanceRecords.sessionDate)),
    db.query.homeworkAssignments.findMany({
      where: and(
        eq(schema.homeworkAssignments.classId, classId),
        eq(schema.homeworkAssignments.organizationId, orgId),
        eq(schema.homeworkAssignments.archived, false),
      ),
      orderBy: (h, { desc }) => desc(h.dueDate),
      limit: 10,
    }),
    enrolledStudentIds.length === 0
      ? Promise.resolve([])
      : db.query.hifzMilestones.findMany({
          where: and(
            inArray(schema.hifzMilestones.studentId, enrolledStudentIds),
            eq(schema.hifzMilestones.organizationId, orgId),
          ),
          with: { student: { columns: { fullName: true } } },
          orderBy: (m, { desc }) => desc(m.achievedDate),
          limit: 10,
        }),
  ]);

  // Pivot attendance counts by session date
  const sessionMap = new Map<string, { present: number; absent: number; late: number; excused: number }>();
  for (const row of sessionRows) {
    const entry = sessionMap.get(row.sessionDate) ?? { present: 0, absent: 0, late: 0, excused: 0 };
    const key = row.status as keyof typeof entry;
    if (key in entry) entry[key] = Number(row.cnt);
    sessionMap.set(row.sessionDate, entry);
  }
  const sessions = [...sessionMap.entries()]
    .map(([date, c]) => ({ date, ...c, total: c.present + c.absent + c.late + c.excused }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return { cls, sessions, homework, milestones };
}

export async function enrollStudent(classId: string, studentId: string) {
  await db.insert(schema.classEnrollments).values({ classId, studentId }).onConflictDoNothing();
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath(`/admin/students/${studentId}`);
  redirect(`/admin/classes/${classId}?notice=student_enrolled`);
}

export async function unenrollStudent(classId: string, studentId: string) {
  await db
    .delete(schema.classEnrollments)
    .where(
      and(
        eq(schema.classEnrollments.classId, classId),
        eq(schema.classEnrollments.studentId, studentId),
      ),
    );
  revalidatePath(`/admin/classes/${classId}`);
  redirect(`/admin/classes/${classId}?notice=student_unenrolled`);
}

// ---------------------------------------------------------------------------
// Guardian linking
// ---------------------------------------------------------------------------
export async function linkGuardian(
  studentId: string,
  orgId: string,
  email: string,
  relationship: string,
  isPrimary: boolean,
  receivesNotifications: boolean,
) {
  let guardianUserId: string;

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (existing) {
    guardianUserId = existing.id;
    await db
      .insert(schema.memberships)
      .values({ userId: guardianUserId, organizationId: orgId, role: 'parent', status: 'active' })
      .onConflictDoNothing();
  } else {
    const serviceClient = await createSupabaseServiceClient();
    const result = await serviceClient.auth.admin.createUser({ email, email_confirm: true });
    if (result.error || !result.data.user) {
      redirect(`/admin/students/${studentId}?notice=guardian_error`);
    }
    guardianUserId = result.data.user.id;
    await db
      .insert(schema.users)
      .values({ id: guardianUserId, email, fullName: email.split('@')[0] ?? email })
      .onConflictDoNothing();
    await db
      .insert(schema.memberships)
      .values({ userId: guardianUserId, organizationId: orgId, role: 'parent', status: 'active' })
      .onConflictDoNothing();
  }

  // Skip if already linked
  const existingLink = await db.query.studentGuardians.findFirst({
    where: and(
      eq(schema.studentGuardians.studentId, studentId),
      eq(schema.studentGuardians.guardianUserId, guardianUserId),
    ),
  });
  if (!existingLink) {
    await db.insert(schema.studentGuardians).values({
      studentId,
      guardianUserId,
      relationship: relationship || null,
      isPrimary,
      receivesNotifications,
    });

    const student = await db.query.students.findFirst({
      where: eq(schema.students.id, studentId),
      columns: { fullName: true },
    });
    await createNotification({
      organizationId: orgId,
      userId: guardianUserId,
      type: 'guardian_linked',
      title: `You've been linked to ${student?.fullName ?? 'a student'}'s account`,
      body: 'You can now see attendance, hifz progress, and tuition in your parent portal.',
      link: `/parent/${studentId}`,
    });
  }

  revalidatePath(`/admin/students/${studentId}`);
  redirect(`/admin/students/${studentId}?notice=guardian_linked`);
}

export async function unlinkGuardian(linkId: string, studentId: string) {
  await db.delete(schema.studentGuardians).where(eq(schema.studentGuardians.id, linkId));
  revalidatePath(`/admin/students/${studentId}`);
  redirect(`/admin/students/${studentId}?notice=guardian_unlinked`);
}

export async function getAdminParents(orgId: string) {
  const rows = await db
    .select({
      userId: schema.memberships.userId,
      parentName: schema.users.fullName,
      parentEmail: schema.users.email,
      studentId: schema.studentGuardians.studentId,
      studentName: schema.students.fullName,
      relationship: schema.studentGuardians.relationship,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .leftJoin(schema.studentGuardians, eq(schema.studentGuardians.guardianUserId, schema.memberships.userId))
    .leftJoin(schema.students, eq(schema.students.id, schema.studentGuardians.studentId))
    .where(
      and(
        eq(schema.memberships.organizationId, orgId),
        eq(schema.memberships.role, 'parent'),
        eq(schema.memberships.status, 'active'),
      ),
    )
    .orderBy(schema.users.fullName);

  // Group rows by parent
  const map = new Map<string, { userId: string; name: string; email: string | null; students: { id: string; name: string; relationship: string | null }[] }>();
  for (const row of rows) {
    if (!map.has(row.userId)) {
      map.set(row.userId, { userId: row.userId, name: row.parentName, email: row.parentEmail, students: [] });
    }
    if (row.studentId && row.studentName) {
      map.get(row.userId)!.students.push({ id: row.studentId, name: row.studentName, relationship: row.relationship });
    }
  }
  return [...map.values()];
}

// ---------------------------------------------------------------------------
// Tuition management
// ---------------------------------------------------------------------------

export async function getAdminTuition(orgId: string) {
  const students = await db.query.students.findMany({
    where: and(eq(schema.students.organizationId, orgId), eq(schema.students.status, 'active')),
    with: {
      tuitionPlans: {
        with: {
          guardian: { columns: { fullName: true, email: true } },
          payments: { orderBy: (p, { desc }) => desc(p.paidAt), limit: 1 },
        },
        orderBy: (t, { desc }) => desc(t.createdAt),
      },
    },
    orderBy: (s, { asc }) => asc(s.fullName),
  });
  // Prefer the most recent non-cancelled plan for the ledger summary row.
  return students.map(s => ({
    ...s,
    tuitionPlans: [
      ...s.tuitionPlans.filter(p => p.status !== 'cancelled'),
      ...s.tuitionPlans.filter(p => p.status === 'cancelled'),
    ],
  }));
}

export async function getAdminStudentTuition(studentId: string, orgId: string) {
  const [student, plans] = await Promise.all([
    db.query.students.findFirst({
      where: and(eq(schema.students.id, studentId), eq(schema.students.organizationId, orgId)),
    }),
    db.query.tuitionPlans.findMany({
      where: and(eq(schema.tuitionPlans.studentId, studentId), eq(schema.tuitionPlans.organizationId, orgId)),
      with: { payments: { orderBy: (p, { desc }) => desc(p.paidAt) }, guardian: true },
      orderBy: (t, { desc }) => desc(t.createdAt),
    }),
  ]);
  return { student, plans };
}

// Other active students sharing at least one guardian with this student —
// used to offer a sibling discount when creating a tuition plan.
export async function getSiblingStudents(studentId: string, orgId: string) {
  const guardianLinks = await db.query.studentGuardians.findMany({
    where: eq(schema.studentGuardians.studentId, studentId),
    columns: { guardianUserId: true },
  });
  const guardianIds = guardianLinks.map(g => g.guardianUserId);
  if (guardianIds.length === 0) return [];

  const siblingLinks = await db.query.studentGuardians.findMany({
    where: inArray(schema.studentGuardians.guardianUserId, guardianIds),
    with: { student: { columns: { id: true, fullName: true, status: true, organizationId: true } } },
  });

  const seen = new Set<string>([studentId]);
  const siblings: { id: string; fullName: string }[] = [];
  for (const link of siblingLinks) {
    const s = link.student;
    if (!s || seen.has(s.id) || s.status !== 'active' || s.organizationId !== orgId) continue;
    seen.add(s.id);
    siblings.push({ id: s.id, fullName: s.fullName });
  }
  return siblings;
}

export async function createTuitionPlan(
  orgId: string,
  studentId: string,
  data: {
    amountCents: number;
    frequency: 'monthly' | 'annual' | 'one_time';
    startDate?: string;
    slidingScaleNotes?: string;
    guardianUserId: string;
    guardianEmail: string;
    studentName: string;
    discountType?: 'percent' | 'fixed';
    discountValue?: number;
    discountReason?: string;
  },
) {
  const hasDiscount = !!data.discountType && !!data.discountValue && data.discountValue > 0;
  const discountCents = !hasDiscount
    ? 0
    : data.discountType === 'percent'
      ? Math.round(data.amountCents * (data.discountValue! / 100))
      : Math.round(data.discountValue! * 100);
  const finalAmountCents = Math.max(0, data.amountCents - discountCents);

  const customer = await stripe.customers.create({
    email: data.guardianEmail,
    metadata: { orgId, studentId, guardianUserId: data.guardianUserId },
  });

  const interval = data.frequency === 'annual' ? 'year' : 'month';
  const isRecurring = data.frequency !== 'one_time';

  const price = await stripe.prices.create({
    unit_amount: finalAmountCents,
    currency: 'usd',
    ...(isRecurring
      ? { recurring: { interval } }
      : {}),
    product_data: { name: `Tuition — ${data.studentName}` },
  });

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [{ price: price.id, quantity: 1 }],
    mode: isRecurring ? 'subscription' : 'payment',
    success_url: `${appUrl}/admin/tuition/${studentId}?payment=success`,
    cancel_url: `${appUrl}/admin/tuition/${studentId}`,
    metadata: { planId: '' },
  });

  const [plan] = await db
    .insert(schema.tuitionPlans)
    .values({
      organizationId: orgId,
      studentId,
      guardianUserId: data.guardianUserId,
      amountCents: finalAmountCents,
      baseAmountCents: hasDiscount ? data.amountCents : null,
      discountType: hasDiscount ? data.discountType : null,
      discountValue: hasDiscount ? data.discountValue : null,
      discountReason: hasDiscount ? (data.discountReason?.trim() || 'Sibling discount') : null,
      currency: 'USD',
      frequency: data.frequency,
      startDate: data.startDate ?? null,
      slidingScaleNotes: data.slidingScaleNotes ?? null,
      status: 'pending_payment',
      stripeCustomerId: customer.id,
      stripeCheckoutSessionId: session.id,
    })
    .returning({ id: schema.tuitionPlans.id });

  if (!plan) throw new Error('Failed to create tuition plan');

  await stripe.checkout.sessions.update(session.id, {
    metadata: { planId: plan.id },
  });

  revalidatePath(`/admin/tuition/${studentId}`);
  revalidatePath('/admin/tuition');
  redirect(`/admin/tuition/${studentId}?checkout_url=${encodeURIComponent(session.url ?? '')}`);
}

// ---------------------------------------------------------------------------
// Admin Insights Dashboard
// ---------------------------------------------------------------------------
export async function getAdminInsights(orgId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    studentCount,
    teacherCount,
    parentCount,
    monthAttendance,
    collectedThisMonth,
    collectedAllTime,
    planStatusBreakdown,
    recentPayments,
    attendanceByClass,
    milestonesThisMonth,
  ] = await Promise.all([
    db.select({ cnt: count() }).from(schema.students)
      .where(and(eq(schema.students.organizationId, orgId), eq(schema.students.status, 'active'))),

    db.select({ cnt: count() }).from(schema.memberships)
      .where(and(
        eq(schema.memberships.organizationId, orgId),
        eq(schema.memberships.role, 'teacher'),
        eq(schema.memberships.status, 'active'),
      )),

    db.select({ cnt: count() }).from(schema.memberships)
      .where(and(
        eq(schema.memberships.organizationId, orgId),
        eq(schema.memberships.role, 'parent'),
        eq(schema.memberships.status, 'active'),
      )),

    db.select({ status: schema.attendanceRecords.status, cnt: count() })
      .from(schema.attendanceRecords)
      .where(and(
        eq(schema.attendanceRecords.organizationId, orgId),
        gte(schema.attendanceRecords.sessionDate, monthStart),
      ))
      .groupBy(schema.attendanceRecords.status),

    db.select({ total: sum(schema.payments.amountCents) })
      .from(schema.payments)
      .where(and(
        eq(schema.payments.organizationId, orgId),
        eq(schema.payments.status, 'succeeded'),
        gte(schema.payments.paidAt, monthStartDate),
      )),

    db.select({ total: sum(schema.payments.amountCents) })
      .from(schema.payments)
      .where(and(
        eq(schema.payments.organizationId, orgId),
        eq(schema.payments.status, 'succeeded'),
      )),

    db.select({
      status: schema.tuitionPlans.status,
      cnt: count(),
      totalCents: sum(schema.tuitionPlans.amountCents),
    })
      .from(schema.tuitionPlans)
      .where(eq(schema.tuitionPlans.organizationId, orgId))
      .groupBy(schema.tuitionPlans.status),

    db.select({
      paymentId: schema.payments.id,
      amountCents: schema.payments.amountCents,
      currency: schema.payments.currency,
      paidAt: schema.payments.paidAt,
      receiptUrl: schema.payments.receiptUrl,
      studentName: schema.students.fullName,
      payerName: schema.users.fullName,
    })
      .from(schema.payments)
      .innerJoin(schema.tuitionPlans, eq(schema.tuitionPlans.id, schema.payments.tuitionPlanId))
      .innerJoin(schema.students, eq(schema.students.id, schema.tuitionPlans.studentId))
      .innerJoin(schema.users, eq(schema.users.id, schema.payments.payerUserId))
      .where(and(
        eq(schema.payments.organizationId, orgId),
        eq(schema.payments.status, 'succeeded'),
      ))
      .orderBy(desc(schema.payments.paidAt))
      .limit(5),

    db.select({
      classId: schema.attendanceRecords.classId,
      className: schema.classes.name,
      status: schema.attendanceRecords.status,
      cnt: count(),
    })
      .from(schema.attendanceRecords)
      .innerJoin(schema.classes, eq(schema.classes.id, schema.attendanceRecords.classId))
      .where(and(
        eq(schema.attendanceRecords.organizationId, orgId),
        gte(schema.attendanceRecords.sessionDate, monthStart),
      ))
      .groupBy(schema.attendanceRecords.classId, schema.classes.name, schema.attendanceRecords.status),

    db.select({ cnt: count() })
      .from(schema.hifzMilestones)
      .where(and(
        eq(schema.hifzMilestones.organizationId, orgId),
        gte(schema.hifzMilestones.achievedDate, monthStart),
      )),
  ]);

  const presentCnt = Number(monthAttendance.find(r => r.status === 'present')?.cnt ?? 0);
  const totalAtt = monthAttendance.reduce((s, r) => s + Number(r.cnt), 0);
  const attendanceRatePct = totalAtt > 0 ? Math.round((presentCnt / totalAtt) * 100) : 0;

  const pendingCount = Number(planStatusBreakdown.find(p => p.status === 'pending_payment')?.cnt ?? 0);
  const outstandingCents = planStatusBreakdown
    .filter(p => p.status === 'pending_payment' || p.status === 'past_due')
    .reduce((s, p) => s + Number(p.totalCents ?? 0), 0);

  const classSummaryMap = new Map<string, { className: string; present: number; late: number; absent: number; excused: number }>();
  for (const row of attendanceByClass) {
    if (!classSummaryMap.has(row.classId)) {
      classSummaryMap.set(row.classId, { className: row.className, present: 0, late: 0, absent: 0, excused: 0 });
    }
    const entry = classSummaryMap.get(row.classId)!;
    if (row.status === 'present') entry.present += Number(row.cnt);
    else if (row.status === 'late') entry.late += Number(row.cnt);
    else if (row.status === 'absent') entry.absent += Number(row.cnt);
    else if (row.status === 'excused') entry.excused += Number(row.cnt);
  }

  return {
    totalStudents: Number(studentCount[0]?.cnt ?? 0),
    activeTeachers: Number(teacherCount[0]?.cnt ?? 0),
    activeParents: Number(parentCount[0]?.cnt ?? 0),
    attendanceRatePct,
    totalAttendanceRecords: totalAtt,
    collectedThisMonthCents: Number(collectedThisMonth[0]?.total ?? 0),
    collectedAllTimeCents: Number(collectedAllTime[0]?.total ?? 0),
    outstandingCents,
    pendingCount,
    planStatusBreakdown: planStatusBreakdown.map(p => ({
      status: p.status,
      count: Number(p.cnt),
      totalCents: Number(p.totalCents ?? 0),
    })),
    recentPayments,
    classSummary: [...classSummaryMap.values()],
    milestonesThisMonth: Number(milestonesThisMonth[0]?.cnt ?? 0),
    monthLabel: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  };
}

export async function cancelTuitionPlan(planId: string, orgId: string, studentId: string) {
  const plan = await db.query.tuitionPlans.findFirst({
    where: and(eq(schema.tuitionPlans.id, planId), eq(schema.tuitionPlans.organizationId, orgId)),
  });
  if (!plan) return;

  if (plan.stripeSubscriptionId) {
    await stripe.subscriptions.cancel(plan.stripeSubscriptionId);
  }

  await db
    .update(schema.tuitionPlans)
    .set({ status: 'cancelled' })
    .where(eq(schema.tuitionPlans.id, planId));

  revalidatePath(`/admin/tuition/${studentId}`);
  revalidatePath('/admin/tuition');
  redirect(`/admin/tuition/${studentId}?notice=plan_cancelled`);
}
