import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

// ---------------------------------------------------------------------------
// Config — reads from env, falls back to localhost Supabase defaults
// ---------------------------------------------------------------------------
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:54322/postgres';
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
  amina: 'a1b2c3d4-0001-0000-0000-000000000001',
  idris: 'a1b2c3d4-0001-0000-0000-000000000002',
  sarah: 'a1b2c3d4-0001-0000-0000-000000000003',
  omar: 'a1b2c3d4-0001-0000-0000-000000000004',
  khalid: 'a1b2c3d4-0001-0000-0000-000000000005',
};
const STUDENT_IDS = {
  aisha: 'a1b2c3d4-0002-0000-0000-000000000001',
  yusuf: 'a1b2c3d4-0002-0000-0000-000000000002',
  bilal: 'a1b2c3d4-0002-0000-0000-000000000003',
  khadijah: 'a1b2c3d4-0002-0000-0000-000000000004',
};
const CLASS_IDS = {
  beginners: 'a1b2c3d4-0003-0000-0000-000000000001',
  advanced: 'a1b2c3d4-0003-0000-0000-000000000002',
};

// ---------------------------------------------------------------------------
// 1. Organization
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
// 2. Fictional public profiles (not Supabase Auth accounts)
// ---------------------------------------------------------------------------
async function seedUsers() {
  console.log('→ Seeding public.users...');
  const rows = [
    { id: USER_IDS.amina, fullName: 'Sister Amina', email: null },
    { id: USER_IDS.idris, fullName: 'Brother Idris', email: null },
    { id: USER_IDS.sarah, fullName: 'Sarah Hassan', email: null },
    { id: USER_IDS.omar, fullName: 'Omar Yusuf', email: null },
    { id: USER_IDS.khalid, fullName: 'Imam Khalid', email: null },
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
    { userId: USER_IDS.amina, organizationId: ORG_ID, role: 'teacher' as const },
    { userId: USER_IDS.idris, organizationId: ORG_ID, role: 'teacher' as const },
    { userId: USER_IDS.sarah, organizationId: ORG_ID, role: 'parent' as const },
    { userId: USER_IDS.omar, organizationId: ORG_ID, role: 'parent' as const },
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
    {
      id: STUDENT_IDS.aisha,
      organizationId: ORG_ID,
      fullName: 'Aisha Hassan',
      dateOfBirth: '2016-04-12',
      enrolledAt: '2024-09-01',
      status: 'active',
    },
    {
      id: STUDENT_IDS.yusuf,
      organizationId: ORG_ID,
      fullName: 'Yusuf Hassan',
      dateOfBirth: '2018-09-03',
      enrolledAt: '2024-09-01',
      status: 'active',
    },
    {
      id: STUDENT_IDS.bilal,
      organizationId: ORG_ID,
      fullName: 'Bilal Yusuf',
      dateOfBirth: '2015-11-22',
      enrolledAt: '2024-09-01',
      status: 'active',
    },
    {
      id: STUDENT_IDS.khadijah,
      organizationId: ORG_ID,
      fullName: 'Khadijah Nasir',
      dateOfBirth: '2017-03-08',
      enrolledAt: '2024-09-01',
      status: 'active',
    },
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
    {
      id: CLASS_IDS.beginners,
      organizationId: ORG_ID,
      name: 'Hifz Circle — Beginners',
      primaryTeacherId: USER_IDS.amina,
      academicYear: '2024-2025',
    },
    {
      id: CLASS_IDS.advanced,
      organizationId: ORG_ID,
      name: 'Hifz Circle — Advanced',
      primaryTeacherId: USER_IDS.idris,
      academicYear: '2024-2025',
    },
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
    { classId: CLASS_IDS.advanced, studentId: STUDENT_IDS.bilal },
    { classId: CLASS_IDS.advanced, studentId: STUDENT_IDS.khadijah },
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
    {
      studentId: STUDENT_IDS.aisha,
      guardianUserId: USER_IDS.sarah,
      relationship: 'mother',
      isPrimary: true,
      receivesNotifications: true,
      canPickup: true,
      paysTuition: true,
    },
    {
      studentId: STUDENT_IDS.yusuf,
      guardianUserId: USER_IDS.sarah,
      relationship: 'mother',
      isPrimary: true,
      receivesNotifications: true,
      canPickup: true,
      paysTuition: true,
    },
    {
      studentId: STUDENT_IDS.bilal,
      guardianUserId: USER_IDS.omar,
      relationship: 'father',
      isPrimary: true,
      receivesNotifications: true,
      canPickup: true,
      paysTuition: true,
    },
    {
      studentId: STUDENT_IDS.khadijah,
      guardianUserId: USER_IDS.omar,
      relationship: 'father',
      isPrimary: true,
      receivesNotifications: true,
      canPickup: true,
      paysTuition: true,
    },
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
    { studentId: STUDENT_IDS.aisha, guardianUserId: USER_IDS.sarah },
    { studentId: STUDENT_IDS.yusuf, guardianUserId: USER_IDS.sarah },
    { studentId: STUDENT_IDS.bilal, guardianUserId: USER_IDS.omar },
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
  function attendanceStatus(
    studentIndex: number,
    weekIndex: number,
  ): 'present' | 'late' | 'absent' {
    const hash = (studentIndex * 7 + weekIndex * 13) % 100;
    if (hash < 3) return 'absent';
    if (hash < 10) return 'late';
    return 'present';
  }

  const attendanceRows = [];
  const hifzRows = [];
  const noteRows: (typeof schema.studentNotes.$inferInsert)[] = [];

  const allStudents = [
    ...beginnerStudents.map((id) => ({
      id,
      classId: CLASS_IDS.beginners,
      teacherId: USER_IDS.amina,
    })),
    ...advancedStudents.map((id) => ({
      id,
      classId: CLASS_IDS.advanced,
      teacherId: USER_IDS.idris,
    })),
  ];

  for (let weekIndex = 0; weekIndex < 4; weekIndex++) {
    const sessionDate = pastSunday(4 - weekIndex); // oldest first
    const [surahNum, ayahStart, ayahEnd] = hifzProgression[weekIndex]!;

    for (let studentIndex = 0; studentIndex < allStudents.length; studentIndex++) {
      const { id: studentId, classId, teacherId } = allStudents[studentIndex]!;
      const status = attendanceStatus(studentIndex, weekIndex);

      attendanceRows.push({
        organizationId: ORG_ID,
        classId,
        studentId,
        sessionDate,
        status,
        arrivalTime:
          status === 'absent' ? null : arrivalTime(sessionDate, status === 'late' ? 25 : 8),
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
    {
      category: 'Adab',
      content: 'Sat quietly and helped a younger student settle in. MashaAllah.',
    },
    {
      category: 'Effort',
      content: 'Memorized the assigned portion perfectly this week. Excellent focus.',
    },
  ];
  const homework = { content: 'Review Al-Baqarah 1–10 at home before next Sunday.' };

  for (let studentIndex = 0; studentIndex < allStudents.length; studentIndex++) {
    const { id: studentId, classId, teacherId } = allStudents[studentIndex]!;
    for (let praiseIndex = 0; praiseIndex < praises.length; praiseIndex++) {
      const praise = praises[praiseIndex]!;
      const seq = studentIndex * 10 + praiseIndex;
      noteRows.push({
        id: `a1b2c3d4-0006-0000-0000-${String(seq).padStart(12, '0')}`,
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
    const homeworkSeq = studentIndex * 10 + 5;
    noteRows.push({
      id: `a1b2c3d4-0006-0000-0000-${String(homeworkSeq).padStart(12, '0')}`,
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
      description:
        'Practice the ayahs recited in class this week with a parent before next Sunday.',
      dueDate,
      createdBy: USER_IDS.amina,
    },
    {
      id: 'a1b2c3d4-0005-0000-0000-000000000002',
      organizationId: ORG_ID,
      classId: CLASS_IDS.advanced,
      title: 'Revise Al-Baqarah 11–30',
      description:
        'Revision (sabqi) portion for the advanced circle — be ready to recite from memory.',
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

  await db
    .insert(schema.attendanceRecords)
    .values({
      organizationId: ORG_ID,
      classId: CLASS_IDS.beginners,
      studentId: STUDENT_IDS.yusuf,
      sessionDate: today,
      status: 'present',
      arrivalTime: new Date(`${today}T09:05:00-05:00`),
      recordedBy: USER_IDS.amina,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.hifzRecords)
    .values({
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
    })
    .onConflictDoNothing();

  await db
    .insert(schema.studentNotes)
    .values({
      id: 'a1b2c3d4-0008-0000-0000-000000000001',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.yusuf,
      classId: CLASS_IDS.beginners,
      noteType: 'praise',
      category: 'Effort',
      content: 'He improved his confidence today.',
      visibleToParent: true,
      createdBy: USER_IDS.amina,
    })
    .onConflictDoNothing();

  console.log("  ✓ tonight's practice demo (Yusuf)");
}

// ---------------------------------------------------------------------------
// 13b. Hifz retention demo data (Khadijah: repeated weak; Bilal: mastered)
// ---------------------------------------------------------------------------
async function seedHifzRetentionDemo() {
  console.log('→ Seeding hifz retention demo data...');
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const rows = [
    {
      id: 'a1b2c3d4-0009-0000-0000-000000000001',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.khadijah,
      classId: CLASS_IDS.advanced,
      stream: 'sabqi' as const,
      surahNumber: 2,
      ayahStart: 21,
      ayahEnd: 30,
      status: 'needs_review' as const,
      mistakeType: 'hesitation' as const,
      sessionDate: daysAgo(4),
      teacherNotes: 'Hesitated on a few ayahs — recommend extra review this week.',
      recordedBy: USER_IDS.idris,
    },
    {
      id: 'a1b2c3d4-0009-0000-0000-000000000002',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.khadijah,
      classId: CLASS_IDS.advanced,
      stream: 'sabqi' as const,
      surahNumber: 2,
      ayahStart: 21,
      ayahEnd: 30,
      status: 'weak' as const,
      mistakeType: 'repeated_correction' as const,
      sessionDate: daysAgo(1),
      teacherNotes: 'Same portion still needs work — repeated corrections today.',
      recordedBy: USER_IDS.idris,
    },
    {
      id: 'a1b2c3d4-0009-0000-0000-000000000003',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.bilal,
      classId: CLASS_IDS.advanced,
      stream: 'manzil' as const,
      surahNumber: 2,
      ayahStart: 1,
      ayahEnd: 20,
      status: 'mastered' as const,
      mistakeType: null,
      sessionDate: daysAgo(2),
      teacherNotes: 'Flawless revision — ready to move to the next manzil portion.',
      recordedBy: USER_IDS.idris,
    },
  ];
  await db.insert(schema.hifzRecords).values(rows).onConflictDoNothing();
  console.log('  ✓ 3 hifz retention demo records');
}

// ---------------------------------------------------------------------------
// 13c. Adab Growth Journal demo data
// ---------------------------------------------------------------------------
async function seedAdabJournalDemo() {
  console.log('→ Seeding adab journal demo data...');
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  };

  const rows = [
    {
      id: 'a1b2c3d4-000a-0000-0000-000000000001',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.aisha,
      classId: CLASS_IDS.beginners,
      noteType: 'praise' as const,
      category: 'Kindness',
      content: 'Shared her seat cushion with a classmate without being asked. MashaAllah.',
      visibleToParent: true,
      createdBy: USER_IDS.amina,
      createdAt: daysAgo(6),
    },
    {
      id: 'a1b2c3d4-000a-0000-0000-000000000002',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.yusuf,
      classId: CLASS_IDS.beginners,
      noteType: 'praise' as const,
      category: 'Preparedness',
      content: 'Brought his mushaf and notebook without a reminder — three weeks in a row now.',
      visibleToParent: true,
      createdBy: USER_IDS.amina,
      createdAt: daysAgo(4),
    },
    {
      id: 'a1b2c3d4-000a-0000-0000-000000000003',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.bilal,
      classId: CLASS_IDS.advanced,
      noteType: 'praise' as const,
      category: 'Helping Others',
      content: 'Helped a younger student in the hallway find his classroom.',
      visibleToParent: true,
      createdBy: USER_IDS.idris,
      createdAt: daysAgo(3),
    },
    {
      id: 'a1b2c3d4-000a-0000-0000-000000000004',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.khadijah,
      classId: CLASS_IDS.advanced,
      noteType: 'praise' as const,
      category: 'Quran Etiquette',
      content: 'Handled the mushaf with real care today — cleaned her hands before class started.',
      visibleToParent: true,
      createdBy: USER_IDS.idris,
      createdAt: daysAgo(1),
    },
  ];
  await db.insert(schema.studentNotes).values(rows).onConflictDoNothing();
  console.log('  ✓ 4 adab journal demo notes');
}

// ---------------------------------------------------------------------------
// 13d. Attendance follow-up demo data (Khadijah: repeated absences)
// ---------------------------------------------------------------------------
async function seedAttendanceFollowUpDemo() {
  console.log('→ Seeding attendance follow-up demo data...');
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const rows = [
    {
      id: 'a1b2c3d4-000b-0000-0000-000000000001',
      organizationId: ORG_ID,
      classId: CLASS_IDS.advanced,
      studentId: STUDENT_IDS.khadijah,
      sessionDate: daysAgo(18),
      status: 'absent' as const,
      recordedBy: USER_IDS.idris,
      guardianReason: 'sick' as const,
      guardianReasonNote: 'Fever over the weekend.',
      guardianReasonSubmittedAt: new Date(),
    },
    {
      id: 'a1b2c3d4-000b-0000-0000-000000000002',
      organizationId: ORG_ID,
      classId: CLASS_IDS.advanced,
      studentId: STUDENT_IDS.khadijah,
      sessionDate: daysAgo(4),
      status: 'absent' as const,
      recordedBy: USER_IDS.idris,
      guardianReason: null,
      guardianReasonNote: null,
      guardianReasonSubmittedAt: null,
    },
    {
      id: 'a1b2c3d4-000b-0000-0000-000000000003',
      organizationId: ORG_ID,
      classId: CLASS_IDS.advanced,
      studentId: STUDENT_IDS.khadijah,
      sessionDate: daysAgo(1),
      status: 'absent' as const,
      recordedBy: USER_IDS.idris,
      guardianReason: null,
      guardianReasonNote: null,
      guardianReasonSubmittedAt: null,
    },
  ];
  await db.insert(schema.attendanceRecords).values(rows).onConflictDoNothing();
  console.log('  ✓ 3 attendance follow-up demo records');
}

// ---------------------------------------------------------------------------
// 13e. Trial class / placement assessment demo data
// ---------------------------------------------------------------------------
async function seedTrialPlacements() {
  console.log('→ Seeding trial placement demo data...');
  const rows = [
    {
      id: 'a1b2c3d4-000c-0000-0000-000000000001',
      organizationId: ORG_ID,
      studentFirstName: 'Zainab',
      studentLastName: 'Karim',
      guardianName: 'Layla Karim',
      guardianEmail: 'layla.karim.demo@example.com',
      guardianPhone: '555-0142',
      scheduledDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 5);
        return d.toISOString().slice(0, 10);
      })(),
      assignedTeacherId: USER_IDS.amina,
      status: 'scheduled' as const,
      createdBy: USER_IDS.khalid,
    },
    {
      id: 'a1b2c3d4-000c-0000-0000-000000000002',
      organizationId: ORG_ID,
      studentFirstName: 'Hamza',
      studentLastName: 'Rahman',
      guardianName: 'Yusuf Rahman',
      guardianEmail: 'yusuf.rahman.demo@example.com',
      guardianPhone: null,
      scheduledDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() - 3);
        return d.toISOString().slice(0, 10);
      })(),
      assignedTeacherId: USER_IDS.idris,
      status: 'assessed' as const,
      quranReadingLevel: 'Reads with occasional support, working on tajweed rules',
      hifzLevel: 'Has memorized Juz Amma independently',
      arabicLevel: 'Conversational, good vocabulary for his age',
      behaviorReadiness: 'Attentive and eager — ready for a group class',
      recommendedClassId: CLASS_IDS.advanced,
      assessmentNotes:
        'Strong candidate for the advanced circle. Recommend starting sabaq at Al-Baqarah.',
      assessedAt: new Date(),
      createdBy: USER_IDS.khalid,
    },
  ];
  await db.insert(schema.trialPlacements).values(rows).onConflictDoNothing();
  console.log('  ✓ 2 trial placement demo records');
}

// ---------------------------------------------------------------------------
// 14. Tuition plans + payment history
// ---------------------------------------------------------------------------
async function seedTuition() {
  console.log('→ Seeding tuition plans + payments...');

  const planRows = [
    {
      id: 'a1b2c3d4-0004-0000-0000-000000000001',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.aisha,
      guardianUserId: USER_IDS.sarah,
      amountCents: 5000,
      currency: 'usd',
      frequency: 'monthly' as const,
      startDate: '2024-09-01',
      status: 'active',
    },
    {
      id: 'a1b2c3d4-0004-0000-0000-000000000002',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.yusuf,
      guardianUserId: USER_IDS.sarah,
      amountCents: 5000,
      currency: 'usd',
      frequency: 'monthly' as const,
      startDate: '2024-09-01',
      status: 'active',
    },
    {
      id: 'a1b2c3d4-0004-0000-0000-000000000003',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.bilal,
      guardianUserId: USER_IDS.omar,
      amountCents: 5000,
      currency: 'usd',
      frequency: 'monthly' as const,
      startDate: '2024-09-01',
      status: 'active',
    },
    {
      id: 'a1b2c3d4-0004-0000-0000-000000000004',
      organizationId: ORG_ID,
      studentId: STUDENT_IDS.khadijah,
      guardianUserId: USER_IDS.omar,
      amountCents: 5000,
      currency: 'usd',
      frequency: 'monthly' as const,
      startDate: '2024-09-01',
      status: 'active',
    },
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
    const plan = planRows[i]!;
    for (let month = 1; month <= 3; month++) {
      const paidDate = new Date(2024, 8 + month, 1); // Sep, Oct, Nov 2024
      paymentRows.push({
        organizationId: ORG_ID,
        tuitionPlanId: plan.id,
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

async function seedActivityLog() {
  console.log('→ Seeding activity log demo data...');
  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

  const idFor = (n: number) => `a1b2c3d4-0009-0000-0000-${String(n).padStart(12, '0')}`;

  const rows = [
    {
      id: idFor(1),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.khalid,
      actorName: 'Imam Khalid',
      action: 'student.created',
      targetType: 'student',
      targetId: STUDENT_IDS.aisha,
      metadata: { targetLabel: 'Aisha Hassan' },
      createdAt: daysAgo(30),
    },
    {
      id: idFor(2),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.khalid,
      actorName: 'Imam Khalid',
      action: 'class.created',
      targetType: 'class',
      targetId: CLASS_IDS.beginners,
      metadata: { targetLabel: 'Hifz Circle — Beginners' },
      createdAt: daysAgo(29),
    },
    {
      id: idFor(3),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.khalid,
      actorName: 'Imam Khalid',
      action: 'teacher.invited',
      targetType: 'teacher',
      targetId: USER_IDS.amina,
      metadata: { targetLabel: 'Sister Amina' },
      createdAt: daysAgo(28),
    },
    {
      id: idFor(4),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.khalid,
      actorName: 'Imam Khalid',
      action: 'guardian.linked',
      targetType: 'guardian',
      targetId: USER_IDS.sarah,
      metadata: { targetLabel: 'Fictional guardian → Aisha Hassan' },
      createdAt: daysAgo(27),
    },
    {
      id: idFor(5),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.khalid,
      actorName: 'Imam Khalid',
      action: 'tuition_plan.created',
      targetType: 'tuition_plan',
      targetId: null,
      metadata: { targetLabel: 'Aisha Hassan' },
      createdAt: daysAgo(26),
    },
    {
      id: idFor(6),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.khalid,
      actorName: 'Imam Khalid',
      action: 'sibling_discount.applied',
      targetType: 'tuition_plan',
      targetId: null,
      metadata: { targetLabel: 'Yusuf Hassan' },
      createdAt: daysAgo(26),
    },
    {
      id: idFor(7),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.khalid,
      actorName: 'Imam Khalid',
      action: 'roster_import.completed',
      targetType: 'roster_import',
      targetId: null,
      metadata: { targetLabel: '4 students' },
      createdAt: daysAgo(25),
    },
    {
      id: idFor(8),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.amina,
      actorName: 'Sister Amina',
      action: 'attendance.submitted',
      targetType: 'class',
      targetId: CLASS_IDS.beginners,
      metadata: { targetLabel: 'Hifz Circle — Beginners' },
      createdAt: daysAgo(7),
    },
    {
      id: idFor(9),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.amina,
      actorName: 'Sister Amina',
      action: 'hifz_record.created',
      targetType: 'class',
      targetId: CLASS_IDS.beginners,
      metadata: { targetLabel: '2 records — Hifz Circle — Beginners' },
      createdAt: daysAgo(7),
    },
    {
      id: idFor(10),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.amina,
      actorName: 'Sister Amina',
      action: 'adab_note.added',
      targetType: 'student',
      targetId: STUDENT_IDS.aisha,
      metadata: { targetLabel: 'Aisha Hassan' },
      createdAt: daysAgo(6),
    },
    {
      id: idFor(11),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.amina,
      actorName: 'Sister Amina',
      action: 'homework.assigned',
      targetType: 'class',
      targetId: CLASS_IDS.beginners,
      metadata: { targetLabel: 'Memorize Surah Al-Fatihah — Hifz Circle — Beginners' },
      createdAt: daysAgo(5),
    },
    {
      id: idFor(12),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.amina,
      actorName: 'Sister Amina',
      action: 'hifz_milestone.created',
      targetType: 'student',
      targetId: STUDENT_IDS.yusuf,
      metadata: { targetLabel: 'Juz 30 completed — Yusuf Hassan' },
      createdAt: daysAgo(4),
    },
    {
      id: idFor(13),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.idris,
      actorName: 'Brother Idris',
      action: 'attendance.submitted',
      targetType: 'class',
      targetId: CLASS_IDS.advanced,
      metadata: { targetLabel: 'Hifz Circle — Advanced' },
      createdAt: daysAgo(3),
    },
    {
      id: idFor(14),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.idris,
      actorName: 'Brother Idris',
      action: 'trial_assessment.completed',
      targetType: 'trial_placement',
      targetId: null,
      metadata: { targetLabel: 'a prospective student' },
      createdAt: daysAgo(3),
    },
    {
      id: idFor(15),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.sarah,
      actorName: 'Sarah Hassan',
      action: 'absence_reason.submitted',
      targetType: 'student',
      targetId: STUDENT_IDS.yusuf,
      metadata: { targetLabel: 'Yusuf Hassan' },
      createdAt: daysAgo(2),
    },
    {
      id: idFor(16),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.khalid,
      actorName: 'Imam Khalid',
      action: 'announcement.posted',
      targetType: 'announcement',
      targetId: null,
      metadata: { targetLabel: 'Jummah reminder' },
      createdAt: daysAgo(1),
    },
    {
      id: idFor(17),
      organizationId: ORG_ID,
      actorUserId: null,
      actorName: 'Stripe',
      action: 'payment.succeeded',
      targetType: 'tuition_plan',
      targetId: null,
      metadata: { targetLabel: 'Bilal Yusuf' },
      createdAt: daysAgo(1),
    },
    {
      id: idFor(18),
      organizationId: ORG_ID,
      actorUserId: USER_IDS.khalid,
      actorName: 'Imam Khalid',
      action: 'csv_export.downloaded',
      targetType: 'roster_export',
      targetId: null,
      metadata: { targetLabel: 'roster' },
      createdAt: daysAgo(0),
    },
  ];

  await db.insert(schema.activityLog).values(rows).onConflictDoNothing();
  console.log(`  ✓ ${rows.length} activity log entries`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n🌱 Seeding Talibly database...\n');
  try {
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
    await seedHifzRetentionDemo();
    await seedAdabJournalDemo();
    await seedAttendanceFollowUpDemo();
    await seedTrialPlacements();
    await seedTuition();
    await seedActivityLog();
    console.log('\n✅ Seed complete.\n');
  } catch (err) {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
}

main();
