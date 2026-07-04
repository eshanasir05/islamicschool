import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema/index.js';

// ---------------------------------------------------------------------------
// Config — reads from env, falls back to localhost Supabase defaults
// ---------------------------------------------------------------------------
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:54322/postgres';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const queryClient = postgres(DATABASE_URL, { prepare: false });
const db = drizzle(queryClient, { schema });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pastSunday(weeksAgo: number): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const daysToLastSunday = day === 0 ? 7 * weeksAgo : day + 7 * (weeksAgo - 1);
  d.setDate(d.getDate() - daysToLastSunday);
  return d.toISOString().slice(0, 10);
}

function arrivalTime(date: string, minutesAfter9: number): Date {
  const d = new Date(`${date}T09:00:00-05:00`);
  d.setMinutes(d.getMinutes() + minutesAfter9);
  return d;
}

// ---------------------------------------------------------------------------
// Seed IDs (hardcoded for idempotency)
// ---------------------------------------------------------------------------
const ORG_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const USER_IDS = {
  amina:  'a1b2c3d4-0001-0000-0000-000000000001',
  idris:  'a1b2c3d4-0001-0000-0000-000000000002',
  sarah:  'a1b2c3d4-0001-0000-0000-000000000003',
  omar:   'a1b2c3d4-0001-0000-0000-000000000004',
  khalid: 'a1b2c3d4-0001-0000-0000-000000000005',
};
const STUDENT_IDS = {
  aisha:   'a1b2c3d4-0002-0000-0000-000000000001',
  yusuf:   'a1b2c3d4-0002-0000-0000-000000000002',
  bilal:   'a1b2c3d4-0002-0000-0000-000000000003',
  khadijah:'a1b2c3d4-0002-0000-0000-000000000004',
};
const CLASS_IDS = {
  beginners: 'a1b2c3d4-0003-0000-0000-000000000001',
  advanced:  'a1b2c3d4-0003-0000-0000-000000000002',
};

// ---------------------------------------------------------------------------
// 1. Auth users
// ---------------------------------------------------------------------------
async function seedAuthUsers() {
  console.log('→ Creating Supabase Auth users...');
  const users = [
    { id: USER_IDS.amina,  email: 'amina@talibly.dev',  password: 'demo1234', name: 'Sister Amina' },
    { id: USER_IDS.idris,  email: 'idris@talibly.dev',  password: 'demo1234', name: 'Brother Idris' },
    { id: USER_IDS.sarah,  email: 'sarah@talibly.dev',  password: 'demo1234', name: 'Sarah Hassan' },
    { id: USER_IDS.omar,   email: 'omar@talibly.dev',   password: 'demo1234', name: 'Omar Yusuf' },
    { id: USER_IDS.khalid, email: 'khalid@talibly.dev', password: 'demo1234', name: 'Imam Khalid' },
  ];

  for (const u of users) {
    // If the user exists with a different ID (from a previous seed without explicit ID),
    // delete it so we can recreate with the correct hardcoded UUID.
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const existing = list.users.find(u2 => u2.email === u.email);
    if (existing && existing.id !== u.id) {
      await supabaseAdmin.auth.admin.deleteUser(existing.id);
    }

    const { error } = await supabaseAdmin.auth.admin.createUser({
      id: u.id,
      user_metadata: { full_name: u.name },
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error && !error.message.includes('already been registered')) {
      console.warn(`  Auth user ${u.email}: ${error.message}`);
    } else {
      console.log(`  ✓ ${u.email}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Organization
// ---------------------------------------------------------------------------
async function seedOrg() {
  console.log('→ Seeding organization...');
  await db
    .insert(schema.organizations)
    .values({
      id: ORG_ID,
      name: 'Masjid Al-Noor Sunday School',
      slug: 'al-noor',
      type: 'weekend_school',
      timezone: 'America/New_York',
      is501c3: true,
    })
    .onConflictDoNothing();
  console.log('  ✓ org-al-noor');
}

// ---------------------------------------------------------------------------
// 3. Public users
// ---------------------------------------------------------------------------
async function seedUsers() {
  console.log('→ Seeding public.users...');
  const rows = [
    { id: USER_IDS.amina,  fullName: 'Sister Amina',  email: 'amina@talibly.dev' },
    { id: USER_IDS.idris,  fullName: 'Brother Idris', email: 'idris@talibly.dev' },
    { id: USER_IDS.sarah,  fullName: 'Sarah Hassan',  email: 'sarah@talibly.dev' },
    { id: USER_IDS.omar,   fullName: 'Omar Yusuf',    email: 'omar@talibly.dev' },
    { id: USER_IDS.khalid, fullName: 'Imam Khalid',   email: 'khalid@talibly.dev' },
  ];
  await db.insert(schema.users).values(rows).onConflictDoNothing();
  console.log('  ✓ 5 users');
}

// ---------------------------------------------------------------------------
// 4. Memberships
// ---------------------------------------------------------------------------
async function seedMemberships() {
  console.log('→ Seeding memberships...');
  const rows = [
    { userId: USER_IDS.amina,  organizationId: ORG_ID, role: 'teacher'   as const },
    { userId: USER_IDS.idris,  organizationId: ORG_ID, role: 'teacher'   as const },
    { userId: USER_IDS.sarah,  organizationId: ORG_ID, role: 'parent'    as const },
    { userId: USER_IDS.omar,   organizationId: ORG_ID, role: 'parent'    as const },
    { userId: USER_IDS.khalid, organizationId: ORG_ID, role: 'principal' as const },
  ];
  await db.insert(schema.memberships).values(rows).onConflictDoNothing();
  console.log('  ✓ 5 memberships');
}

// ---------------------------------------------------------------------------
// 5. Students
// ---------------------------------------------------------------------------
async function seedStudents() {
  console.log('→ Seeding students...');
  const rows = [
    { id: STUDENT_IDS.aisha,    organizationId: ORG_ID, fullName: 'Aisha Hassan',   dateOfBirth: '2016-04-12', enrolledAt: '2024-09-01', status: 'active' },
    { id: STUDENT_IDS.yusuf,    organizationId: ORG_ID, fullName: 'Yusuf Hassan',   dateOfBirth: '2018-09-03', enrolledAt: '2024-09-01', status: 'active' },
    { id: STUDENT_IDS.bilal,    organizationId: ORG_ID, fullName: 'Bilal Yusuf',    dateOfBirth: '2015-11-22', enrolledAt: '2024-09-01', status: 'active' },
    { id: STUDENT_IDS.khadijah, organizationId: ORG_ID, fullName: 'Khadijah Nasir', dateOfBirth: '2017-03-08', enrolledAt: '2024-09-01', status: 'active' },
  ];
  await db.insert(schema.students).values(rows).onConflictDoNothing();
  console.log('  ✓ 4 students');
}

// ---------------------------------------------------------------------------
// 6. Classes
// ---------------------------------------------------------------------------
async function seedClasses() {
  console.log('→ Seeding classes...');
  const rows = [
    { id: CLASS_IDS.beginners, organizationId: ORG_ID, name: 'Hifz Circle — Beginners', primaryTeacherId: USER_IDS.amina,  academicYear: '2024-2025' },
    { id: CLASS_IDS.advanced,  organizationId: ORG_ID, name: 'Hifz Circle — Advanced',  primaryTeacherId: USER_IDS.idris,  academicYear: '2024-2025' },
  ];
  await db.insert(schema.classes).values(rows).onConflictDoNothing();
  console.log('  ✓ 2 classes');
}

// ---------------------------------------------------------------------------
// 7. Class enrollments
// ---------------------------------------------------------------------------
async function seedEnrollments() {
  console.log('→ Seeding enrollments...');
  const rows = [
    { classId: CLASS_IDS.beginners, studentId: STUDENT_IDS.aisha },
    { classId: CLASS_IDS.beginners, studentId: STUDENT_IDS.yusuf },
    { classId: CLASS_IDS.advanced,  studentId: STUDENT_IDS.bilal },
    { classId: CLASS_IDS.advanced,  studentId: STUDENT_IDS.khadijah },
  ];
  await db.insert(schema.classEnrollments).values(rows).onConflictDoNothing();
  console.log('  ✓ 4 enrollments');
}

// ---------------------------------------------------------------------------
// 8. Student guardians
// ---------------------------------------------------------------------------
async function seedGuardians() {
  console.log('→ Seeding guardians...');
  const rows = [
    { studentId: STUDENT_IDS.aisha,    guardianUserId: USER_IDS.sarah, relationship: 'mother', isPrimary: true, receivesNotifications: true, canPickup: true, paysTuition: true },
    { studentId: STUDENT_IDS.yusuf,    guardianUserId: USER_IDS.sarah, relationship: 'mother', isPrimary: true, receivesNotifications: true, canPickup: true, paysTuition: true },
    { studentId: STUDENT_IDS.bilal,    guardianUserId: USER_IDS.omar,  relationship: 'father', isPrimary: true, receivesNotifications: true, canPickup: true, paysTuition: true },
    { studentId: STUDENT_IDS.khadijah, guardianUserId: USER_IDS.omar,  relationship: 'father', isPrimary: true, receivesNotifications: true, canPickup: true, paysTuition: true },
  ];
  await db.insert(schema.studentGuardians).values(rows).onConflictDoNothing();
  console.log('  ✓ 4 guardians');
}

// ---------------------------------------------------------------------------
// 9. Consents (audio + data_sharing, pre-granted for seed data)
// ---------------------------------------------------------------------------
async function seedConsents() {
  console.log('→ Seeding consents...');
  const rows = [];
  const studentGuardianPairs = [
    { studentId: STUDENT_IDS.aisha,    guardianUserId: USER_IDS.sarah },
    { studentId: STUDENT_IDS.yusuf,    guardianUserId: USER_IDS.sarah },
    { studentId: STUDENT_IDS.bilal,    guardianUserId: USER_IDS.omar },
    { studentId: STUDENT_IDS.khadijah, guardianUserId: USER_IDS.omar },
  ];
  const consentTypes: ('audio' | 'data_sharing')[] = ['audio', 'data_sharing'];
  for (const pair of studentGuardianPairs) {
    for (const consentType of consentTypes) {
      rows.push({
        organizationId: ORG_ID,
        studentId: pair.studentId,
        guardianUserId: pair.guardianUserId,
        consentType,
        granted: true,
        grantedAt: new Date('2024-09-01'),
      });
    }
  }
  await db.insert(schema.consents).values(rows).onConflictDoNothing();
  console.log('  ✓ 8 consents');
}

// ---------------------------------------------------------------------------
// 10. Historical records — 4 past Sundays
// ---------------------------------------------------------------------------
async function seedHistoricalRecords() {
  console.log('→ Seeding historical records (4 Sundays)...');

  const beginnerStudents = [STUDENT_IDS.aisha, STUDENT_IDS.yusuf];
  const advancedStudents = [STUDENT_IDS.bilal, STUDENT_IDS.khadijah];

  // Hifz progression per week: [surahNum, ayahStart, ayahEnd]
  const hifzProgression: [number, number, number][] = [
    [2, 1, 5],
    [2, 6, 10],
    [2, 11, 20],
    [2, 21, 30],
  ];

  // Attendance pattern: index 0 = most recent Sunday (week 1), etc.
  // 90% present, 7% late, 3% absent — deterministic by student+week
  function attendanceStatus(studentIndex: number, weekIndex: number): 'present' | 'late' | 'absent' {
    const hash = (studentIndex * 7 + weekIndex * 13) % 100;
    if (hash < 3) return 'absent';
    if (hash < 10) return 'late';
    return 'present';
  }

  const attendanceRows = [];
  const hifzRows = [];
  const noteRows: (typeof schema.studentNotes.$inferInsert)[] = [];

  const allStudents = [
    ...beginnerStudents.map(id => ({ id, classId: CLASS_IDS.beginners, teacherId: USER_IDS.amina })),
    ...advancedStudents.map(id => ({ id, classId: CLASS_IDS.advanced,  teacherId: USER_IDS.idris })),
  ];

  for (let weekIndex = 0; weekIndex < 4; weekIndex++) {
    const sessionDate = pastSunday(4 - weekIndex); // oldest first
    const [surahNum, ayahStart, ayahEnd] = hifzProgression[weekIndex];

    for (let studentIndex = 0; studentIndex < allStudents.length; studentIndex++) {
      const { id: studentId, classId, teacherId } = allStudents[studentIndex];
      const status = attendanceStatus(studentIndex, weekIndex);

      attendanceRows.push({
        organizationId: ORG_ID,
        classId,
        studentId,
        sessionDate,
        status,
        arrivalTime: status === 'absent' ? null : arrivalTime(sessionDate, status === 'late' ? 25 : 8),
        recordedBy: teacherId,
      });

      if (status !== 'absent') {
        hifzRows.push({
          organizationId: ORG_ID,
          studentId,
          classId,
          stream: 'sabak' as const,
          surahNumber: surahNum,
          ayahStart,
          ayahEnd,
          sessionDate,
          audioUrl: null,
          recordedBy: teacherId,
        });
      }
    }
  }

  // Notes: 2 praise + 1 homework per student (spread across weeks)
  const praises = [
    { category: 'Adab',   content: 'Sat quietly and helped a younger student settle in. MashaAllah.' },
    { category: 'Effort', content: 'Memorized the assigned portion perfectly this week. Excellent focus.' },
  ];
  const homework = { content: 'Review Al-Baqarah 1–10 at home before next Sunday.' };

  for (const { id: studentId, classId, teacherId } of allStudents) {
    for (const praise of praises) {
      noteRows.push({
        organizationId: ORG_ID,
        studentId,
        classId,
        noteType: 'praise',
        category: praise.category,
        content: praise.content,
        visibleToParent: true,
        createdBy: teacherId,
      });
    }
    noteRows.push({
      organizationId: ORG_ID,
      studentId,
      classId,
      noteType: 'homework',
      category: null,
      content: homework.content,
      visibleToParent: true,
      createdBy: teacherId,
    });
  }

  await db.insert(schema.attendanceRecords).values(attendanceRows).onConflictDoNothing();
  console.log(`  ✓ ${attendanceRows.length} attendance records`);

  await db.insert(schema.hifzRecords).values(hifzRows).onConflictDoNothing();
  console.log(`  ✓ ${hifzRows.length} hifz records`);

  await db.insert(schema.studentNotes).values(noteRows).onConflictDoNothing();
  console.log(`  ✓ ${noteRows.length} student notes`);
}

// ---------------------------------------------------------------------------
// 11. Homework assignments
// ---------------------------------------------------------------------------
async function seedHomework() {
  console.log('→ Seeding homework...');
  const today = new Date();
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + ((7 - today.getDay()) % 7 || 7));
  const dueDate = nextSunday.toISOString().slice(0, 10);

  const rows = [
    {
      id: 'a1b2c3d4-0005-0000-0000-000000000001',
      organizationId: ORG_ID,
      classId: CLASS_IDS.beginners,
      title: 'Review Al-Baqarah 1–10',
      description: 'Practice the ayahs recited in class this week with a parent before next Sunday.',
      dueDate,
      createdBy: USER_IDS.amina,
    },
    {
      id: 'a1b2c3d4-0005-0000-0000-000000000002',
      organizationId: ORG_ID,
      classId: CLASS_IDS.advanced,
      title: 'Revise Al-Baqarah 11–30',
      description: 'Revision (sabqi) portion for the advanced circle — be ready to recite from memory.',
      dueDate,
      createdBy: USER_IDS.idris,
    },
  ];
  await db.insert(schema.homeworkAssignments).values(rows).onConflictDoNothing();
  console.log('  ✓ 2 homework assignments');
}

// ---------------------------------------------------------------------------
// 12. Hifz milestones
// ---------------------------------------------------------------------------
async function seedHifzMilestones() {
  console.log('→ Seeding hifz milestones...');
  const rows = [
    {
      id: 'a1b2c3d4-0006-0000-0000-000000000001',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.bilal,
      type: 'surah_completed' as const,
      label: 'Completed Surah Al-Baqarah',
      achievedDate: pastSunday(1),
      teacherNotes: 'Recited the full surah from memory with excellent tajweed. MashaAllah.',
      recordedBy: USER_IDS.idris,
    },
    {
      id: 'a1b2c3d4-0006-0000-0000-000000000002',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.khadijah,
      type: 'juz_completed' as const,
      label: 'Completed Juz 1',
      achievedDate: pastSunday(2),
      teacherNotes: 'Strong revision (murajaah) — ready to move on to Juz 2.',
      recordedBy: USER_IDS.idris,
    },
    {
      id: 'a1b2c3d4-0006-0000-0000-000000000003',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.aisha,
      type: 'revision_completed' as const,
      label: 'Revision milestone — Surah Al-Fatihah',
      achievedDate: pastSunday(1),
      teacherNotes: null,
      recordedBy: USER_IDS.amina,
    },
  ];
  await db.insert(schema.hifzMilestones).values(rows).onConflictDoNothing();
  console.log('  ✓ 3 hifz milestones');
}

// ---------------------------------------------------------------------------
// 13. Tonight's Practice demo data (today's session for Yusuf)
// ---------------------------------------------------------------------------
async function seedTonightPractice() {
  console.log("→ Seeding tonight's practice demo data...");
  const today = new Date().toISOString().slice(0, 10);

  await db.insert(schema.attendanceRecords).values({
    organizationId: ORG_ID,
    classId: CLASS_IDS.beginners,
    studentId: STUDENT_IDS.yusuf,
    sessionDate: today,
    status: 'present',
    arrivalTime: new Date(`${today}T09:05:00-05:00`),
    recordedBy: USER_IDS.amina,
  }).onConflictDoNothing();

  await db.insert(schema.hifzRecords).values({
    id: 'a1b2c3d4-0007-0000-0000-000000000001',
    organizationId: ORG_ID,
    studentId: STUDENT_IDS.yusuf,
    classId: CLASS_IDS.beginners,
    stream: 'sabak',
    surahNumber: 67,
    ayahStart: 1,
    ayahEnd: 5,
    sessionDate: today,
    audioUrl: null,
    recordedBy: USER_IDS.amina,
  }).onConflictDoNothing();

  await db.insert(schema.studentNotes).values({
    id: 'a1b2c3d4-0008-0000-0000-000000000001',
    organizationId: ORG_ID,
    studentId: STUDENT_IDS.yusuf,
    classId: CLASS_IDS.beginners,
    noteType: 'praise',
    category: 'Effort',
    content: 'He improved his confidence today.',
    visibleToParent: true,
    createdBy: USER_IDS.amina,
  }).onConflictDoNothing();

  console.log("  ✓ tonight's practice demo (Yusuf)");
}

// ---------------------------------------------------------------------------
// 14. Tuition plans + payment history
// ---------------------------------------------------------------------------
async function seedTuition() {
  console.log('→ Seeding tuition plans + payments...');

  const planRows = [
    { id: 'a1b2c3d4-0004-0000-0000-000000000001', organizationId: ORG_ID, studentId: STUDENT_IDS.aisha,    guardianUserId: USER_IDS.sarah, amountCents: 5000, currency: 'usd', frequency: 'monthly' as const, startDate: '2024-09-01', status: 'active' },
    { id: 'a1b2c3d4-0004-0000-0000-000000000002', organizationId: ORG_ID, studentId: STUDENT_IDS.yusuf,    guardianUserId: USER_IDS.sarah, amountCents: 5000, currency: 'usd', frequency: 'monthly' as const, startDate: '2024-09-01', status: 'active' },
    { id: 'a1b2c3d4-0004-0000-0000-000000000003', organizationId: ORG_ID, studentId: STUDENT_IDS.bilal,    guardianUserId: USER_IDS.omar,  amountCents: 5000, currency: 'usd', frequency: 'monthly' as const, startDate: '2024-09-01', status: 'active' },
    { id: 'a1b2c3d4-0004-0000-0000-000000000004', organizationId: ORG_ID, studentId: STUDENT_IDS.khadijah, guardianUserId: USER_IDS.omar,  amountCents: 5000, currency: 'usd', frequency: 'monthly' as const, startDate: '2024-09-01', status: 'active' },
  ];
  await db
    .insert(schema.tuitionPlans)
    .values(planRows)
    .onConflictDoUpdate({
      target: schema.tuitionPlans.id,
      set: { guardianUserId: sql`excluded.guardian_user_id` },
    });

  const paymentRows = [];
  for (let i = 0; i < planRows.length; i++) {
    for (let month = 1; month <= 3; month++) {
      const paidDate = new Date(2024, 8 + month, 1); // Sep, Oct, Nov 2024
      paymentRows.push({
        organizationId: ORG_ID,
        tuitionPlanId: planRows[i].id,
        payerUserId: i < 2 ? USER_IDS.sarah : USER_IDS.omar,
        amountCents: 5000,
        currency: 'usd',
        paymentMethod: 'card',
        status: 'succeeded' as const,
        paidAt: paidDate,
      });
    }
  }
  await db.insert(schema.payments).values(paymentRows).onConflictDoNothing();
  console.log('  ✓ 4 tuition plans, 12 payments');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n🌱 Seeding Talibly database...\n');
  try {
    await seedAuthUsers();
    await seedOrg();
    await seedUsers();
    await seedMemberships();
    await seedStudents();
    await seedClasses();
    await seedEnrollments();
    await seedGuardians();
    await seedConsents();
    await seedHistoricalRecords();
    await seedHomework();
    await seedHifzMilestones();
    await seedTonightPractice();
    await seedTuition();
    console.log('\n✅ Seed complete.\n');
  } catch (err) {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
}

main();
