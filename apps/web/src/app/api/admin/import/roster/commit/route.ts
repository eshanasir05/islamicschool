import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { logActivity } from '@/lib/activity-log';
import type { ParsedRosterRow } from '../parse/route';

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

export async function POST(req: Request) {
  const caller = await getCaller();
  if (!caller || !['admin', 'principal'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { rows } = await req.json() as { rows?: ParsedRosterRow[] };
  const validRows = (rows ?? []).filter(r => r.errors.length === 0);
  if (validRows.length === 0) {
    return NextResponse.json({ error: 'No valid rows to import' }, { status: 400 });
  }

  const orgId = env.NEXT_PUBLIC_ORG_ID;
  const serviceClient = await createSupabaseServiceClient();

  let studentsCreated = 0;
  let classesCreated = 0;
  let guardiansLinked = 0;
  let guardiansCreated = 0;
  const rowErrors: { rowIndex: number; message: string }[] = [];

  // Cache class name -> id and guardian email -> user id within this import run
  const classRows = await db
    .select({ id: schema.classes.id, name: schema.classes.name })
    .from(schema.classes)
    .where(eq(schema.classes.organizationId, orgId));
  const classCache = new Map<string, string>(classRows.map(c => [c.name.trim().toLowerCase(), c.id]));
  const guardianCache = new Map<string, string>();

  for (const row of validRows) {
    try {
      // Resolve class (case-insensitive match within org)
      const classKey = row.className.toLowerCase();
      let classId = classCache.get(classKey);
      if (!classId) {
        const [created] = await db
          .insert(schema.classes)
          .values({ organizationId: orgId, name: row.className })
          .returning({ id: schema.classes.id });
        if (!created) throw new Error('Failed to create class');
        classId = created.id;
        classesCreated++;
        classCache.set(classKey, classId);
      }

      // Resolve guardian (link existing by email, else create silently — no invite email)
      let guardianUserId = guardianCache.get(row.guardianEmail);
      if (!guardianUserId) {
        const existingUser = await db.query.users.findFirst({
          where: eq(schema.users.email, row.guardianEmail),
        });
        if (existingUser) {
          guardianUserId = existingUser.id;
          guardiansLinked++;
        } else {
          const result = await serviceClient.auth.admin.createUser({
            email: row.guardianEmail,
            email_confirm: true,
          });
          if (result.error || !result.data.user) {
            rowErrors.push({ rowIndex: row.rowIndex, message: `Could not create guardian account: ${result.error?.message ?? 'unknown error'}` });
            continue;
          }
          guardianUserId = result.data.user.id;
          await db
            .insert(schema.users)
            .values({ id: guardianUserId, email: row.guardianEmail, fullName: row.guardianName, phone: row.guardianPhone || null })
            .onConflictDoNothing();
          guardiansCreated++;
        }
        await db
          .insert(schema.memberships)
          .values({ userId: guardianUserId, organizationId: orgId, role: 'parent', status: 'active' })
          .onConflictDoNothing();
        guardianCache.set(row.guardianEmail, guardianUserId);
      }

      // Create student
      const [student] = await db
        .insert(schema.students)
        .values({
          organizationId: orgId,
          fullName: `${row.studentFirstName} ${row.studentLastName}`,
          dateOfBirth: row.dateOfBirth,
          enrolledAt: new Date().toISOString().slice(0, 10),
          status: 'active',
        })
        .returning({ id: schema.students.id });
      if (!student) throw new Error('Failed to create student');
      studentsCreated++;

      // Enroll + link guardian
      await db.insert(schema.classEnrollments).values({ classId, studentId: student.id }).onConflictDoNothing();
      await db.insert(schema.studentGuardians).values({
        studentId: student.id,
        guardianUserId,
        relationship: null,
        isPrimary: true,
        receivesNotifications: true,
      }).onConflictDoNothing();
    } catch (err) {
      rowErrors.push({ rowIndex: row.rowIndex, message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  if (studentsCreated > 0) {
    await logActivity({
      organizationId: orgId, actorUserId: caller.userId, actorName: caller.name,
      action: 'roster_import.completed', targetType: 'roster_import', targetId: null,
      metadata: { targetLabel: `${studentsCreated} student${studentsCreated === 1 ? '' : 's'}` },
    });
  }

  return NextResponse.json({
    studentsCreated,
    classesCreated,
    guardiansLinked,
    guardiansCreated,
    rowErrors,
  });
}
