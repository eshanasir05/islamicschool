import { env } from '@/env';
import { logActivity } from '@/lib/activity-log';
import { getAdminActorForOrg } from '@/lib/admin-auth';
import { db, schema } from '@/lib/db';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import type { ParsedRosterRow } from '../parse/route';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_IMPORT_ROWS = 500;

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRosterRow(row: Partial<ParsedRosterRow>, fallbackIndex: number): ParsedRosterRow {
  const studentFirstName = cleanString(row.studentFirstName);
  const studentLastName = cleanString(row.studentLastName);
  const dateOfBirth = cleanString(row.dateOfBirth);
  const className = cleanString(row.className);
  const guardianName = cleanString(row.guardianName);
  const guardianEmail = cleanString(row.guardianEmail).toLowerCase();
  const guardianPhone = cleanString(row.guardianPhone);
  const rowIndex =
    typeof row.rowIndex === 'number' && Number.isInteger(row.rowIndex) && row.rowIndex > 0
      ? row.rowIndex
      : fallbackIndex;

  const errors: string[] = [];
  if (!studentFirstName) errors.push('Missing student first name');
  if (!studentLastName) errors.push('Missing student last name');
  if (!dateOfBirth) errors.push('Missing date of birth');
  else if (!DATE_RE.test(dateOfBirth)) errors.push('Date of birth must be YYYY-MM-DD');
  if (!className) errors.push('Missing class name');
  if (!guardianName) errors.push('Missing guardian name');
  if (!guardianEmail) errors.push('Missing guardian email');
  else if (!EMAIL_RE.test(guardianEmail)) errors.push('Guardian email is invalid');

  return {
    rowIndex,
    studentFirstName,
    studentLastName,
    dateOfBirth,
    className,
    guardianName,
    guardianEmail,
    guardianPhone,
    errors,
    willCreateClass: false,
    existingGuardian: false,
  };
}

export async function POST(req: Request) {
  const orgId = env.NEXT_PUBLIC_ORG_ID;
  const caller = await getAdminActorForOrg(orgId);
  if (!caller) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { rows?: unknown } | null;
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: 'Missing roster rows' }, { status: 400 });
  }
  if (body.rows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      { error: `Import is limited to ${MAX_IMPORT_ROWS} rows at a time` },
      { status: 400 },
    );
  }

  const normalizedRows = body.rows.map((row, i) =>
    normalizeRosterRow((row ?? {}) as Partial<ParsedRosterRow>, i + 2),
  );
  const validRows = normalizedRows.filter((r) => r.errors.length === 0);
  const rowErrors: { rowIndex: number; message: string }[] = normalizedRows
    .filter((r) => r.errors.length > 0)
    .map((r) => ({ rowIndex: r.rowIndex, message: r.errors.join('; ') }));
  if (validRows.length === 0) {
    return NextResponse.json({ error: 'No valid rows to import', rowErrors }, { status: 400 });
  }

  const serviceClient = await createSupabaseServiceClient();

  let studentsCreated = 0;
  let classesCreated = 0;
  let guardiansLinked = 0;
  let guardiansCreated = 0;

  // Cache class name -> id and guardian email -> user id within this import run
  const classRows = await db
    .select({ id: schema.classes.id, name: schema.classes.name })
    .from(schema.classes)
    .where(eq(schema.classes.organizationId, orgId));
  const classCache = new Map<string, string>(
    classRows.map((c) => [c.name.trim().toLowerCase(), c.id]),
  );
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
            rowErrors.push({
              rowIndex: row.rowIndex,
              message: `Could not create guardian account: ${result.error?.message ?? 'unknown error'}`,
            });
            continue;
          }
          guardianUserId = result.data.user.id;
          await db
            .insert(schema.users)
            .values({
              id: guardianUserId,
              email: row.guardianEmail,
              fullName: row.guardianName,
              phone: row.guardianPhone || null,
            })
            .onConflictDoNothing();
          guardiansCreated++;
        }
        await db
          .insert(schema.memberships)
          .values({
            userId: guardianUserId,
            organizationId: orgId,
            role: 'parent',
            status: 'active',
          })
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
      await db
        .insert(schema.classEnrollments)
        .values({ classId, studentId: student.id })
        .onConflictDoNothing();
      await db
        .insert(schema.studentGuardians)
        .values({
          studentId: student.id,
          guardianUserId,
          relationship: null,
          isPrimary: true,
          receivesNotifications: true,
        })
        .onConflictDoNothing();
    } catch (err) {
      rowErrors.push({
        rowIndex: row.rowIndex,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  if (studentsCreated > 0) {
    await logActivity({
      organizationId: orgId,
      actorUserId: caller.userId,
      actorName: caller.name,
      action: 'roster_import.completed',
      targetType: 'roster_import',
      targetId: null,
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
