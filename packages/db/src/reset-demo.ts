import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, inArray } from 'drizzle-orm';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as schema from './schema/index.js';

// ---------------------------------------------------------------------------
// SAFETY: this script only ever deletes rows scoped to the one hardcoded
// demo organization id below — the same id seed.ts always uses. It never
// touches Supabase Auth users/accounts (those are idempotently upserted by
// seed.ts, not recreated here), and it refuses to run at all unless both
// safeguards below are satisfied. There is no code path that can reach any
// organization other than this one.
// ---------------------------------------------------------------------------
const DEMO_ORG_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:54322/postgres';

function assertSafeToRun() {
  if (process.env.ALLOW_DEMO_RESET !== 'true') {
    console.error(
      '\n❌ Refusing to run: set ALLOW_DEMO_RESET=true to confirm this is a demo environment.\n' +
      '   This script permanently deletes operational data. Do not run it against production.\n',
    );
    process.exit(1);
  }
  const providedOrgId = process.env.DEMO_ORG_ID;
  if (!providedOrgId) {
    console.error(
      '\n❌ Refusing to run: set DEMO_ORG_ID to the known demo organization id, as an explicit\n' +
      `   confirmation of what you're about to wipe. Expected: ${DEMO_ORG_ID}\n`,
    );
    process.exit(1);
  }
  if (providedOrgId !== DEMO_ORG_ID) {
    console.error(
      `\n❌ Refusing to run: DEMO_ORG_ID (${providedOrgId}) does not match the known demo\n` +
      `   organization id (${DEMO_ORG_ID}). This script can only ever target that one org.\n`,
    );
    process.exit(1);
  }
}

async function main() {
  assertSafeToRun();

  const queryClient = postgres(DATABASE_URL, { prepare: false });
  const db = drizzle(queryClient, { schema });

  console.log(`\n🧹 Resetting demo org ${DEMO_ORG_ID}...\n`);
  console.log('This only deletes operational/demo data scoped to this org.');
  console.log('User accounts and Supabase Auth logins are left untouched.\n');

  try {
    const studentRows = await db.select({ id: schema.students.id }).from(schema.students)
      .where(eq(schema.students.organizationId, DEMO_ORG_ID));
    const studentIds = studentRows.map(r => r.id);

    const threadRows = await db.select({ id: schema.messageThreads.id }).from(schema.messageThreads)
      .where(eq(schema.messageThreads.organizationId, DEMO_ORG_ID));
    const threadIds = threadRows.map(r => r.id);

    let messageIds: string[] = [];
    if (threadIds.length > 0) {
      const messageRows = await db.select({ id: schema.messages.id }).from(schema.messages)
        .where(inArray(schema.messages.threadId, threadIds));
      messageIds = messageRows.map(r => r.id);
    }

    // Delete children before parents.
    if (messageIds.length > 0) {
      const r = await db.delete(schema.messageReads).where(inArray(schema.messageReads.messageId, messageIds)).returning();
      console.log(`  ✓ message_reads: ${r.length} rows deleted`);
    }
    if (threadIds.length > 0) {
      const r = await db.delete(schema.messages).where(inArray(schema.messages.threadId, threadIds)).returning();
      console.log(`  ✓ messages: ${r.length} rows deleted`);
    }
    {
      const r = await db.delete(schema.messageThreads).where(eq(schema.messageThreads.organizationId, DEMO_ORG_ID)).returning();
      console.log(`  ✓ message_threads: ${r.length} rows deleted`);
    }

    const orgScoped = [
      { name: 'notifications', table: schema.notifications },
      { name: 'trial_placements', table: schema.trialPlacements },
      { name: 'hifz_milestones', table: schema.hifzMilestones },
      { name: 'hifz_records', table: schema.hifzRecords },
      { name: 'student_notes', table: schema.studentNotes },
      { name: 'homework_assignments', table: schema.homeworkAssignments },
      { name: 'attendance_records', table: schema.attendanceRecords },
      { name: 'payments', table: schema.payments },
      { name: 'tuition_plans', table: schema.tuitionPlans },
      { name: 'consents', table: schema.consents },
    ] as const;
    for (const { name, table } of orgScoped) {
      const r = await db.delete(table).where(eq(table.organizationId, DEMO_ORG_ID)).returning();
      console.log(`  ✓ ${name}: ${r.length} rows deleted`);
    }

    // These two join tables key off student/class ids, not organizationId,
    // so they must be deleted before students/classes using the student ids
    // gathered above.
    if (studentIds.length > 0) {
      const r1 = await db.delete(schema.studentGuardians).where(inArray(schema.studentGuardians.studentId, studentIds)).returning();
      console.log(`  ✓ student_guardians: ${r1.length} rows deleted`);
      const r2 = await db.delete(schema.classEnrollments).where(inArray(schema.classEnrollments.studentId, studentIds)).returning();
      console.log(`  ✓ class_enrollments: ${r2.length} rows deleted`);
    }

    {
      const r = await db.delete(schema.students).where(eq(schema.students.organizationId, DEMO_ORG_ID)).returning();
      console.log(`  ✓ students: ${r.length} rows deleted`);
    }
    {
      const r = await db.delete(schema.classes).where(eq(schema.classes.organizationId, DEMO_ORG_ID)).returning();
      console.log(`  ✓ classes: ${r.length} rows deleted`);
    }

    console.log('\n✅ Demo org data wiped.\n');
    await queryClient.end();
  } catch (err) {
    console.error('\n❌ Reset failed:', err);
    await queryClient.end();
    process.exit(1);
  }

  console.log('🌱 Reseeding demo data...\n');
  const monorepoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
  execSync('pnpm --filter @skooly/db db:seed', { stdio: 'inherit', cwd: monorepoRoot });

  console.log('\n✅ Demo reset complete.\n');
}

main();
