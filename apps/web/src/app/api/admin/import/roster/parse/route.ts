import { env } from '@/env';
import { getAdminActorForOrg } from '@/lib/admin-auth';
import { parseCsv } from '@/lib/csv';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const REQUIRED_HEADERS = [
  'student_first_name',
  'student_last_name',
  'date_of_birth',
  'class_name',
  'guardian_name',
  'guardian_email',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ParsedRosterRow = {
  rowIndex: number;
  studentFirstName: string;
  studentLastName: string;
  dateOfBirth: string;
  className: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  errors: string[];
  willCreateClass: boolean;
  existingGuardian: boolean;
};

export async function POST(req: Request) {
  const orgId = env.NEXT_PUBLIC_ORG_ID;
  const caller = await getAdminActorForOrg(orgId);
  if (!caller) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { csv } = (await req.json()) as { csv?: string };
  if (!csv || typeof csv !== 'string') {
    return NextResponse.json({ error: 'Missing CSV text' }, { status: 400 });
  }

  const rawRows = parseCsv(csv);
  const headerRow = rawRows[0];
  if (!headerRow) {
    return NextResponse.json({ error: 'CSV is empty' }, { status: 400 });
  }

  const header = headerRow.map((h) => h.trim().toLowerCase());
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !header.includes(h));
  if (missingHeaders.length > 0) {
    return NextResponse.json(
      { error: `Missing required column(s): ${missingHeaders.join(', ')}` },
      { status: 400 },
    );
  }
  const col = (name: string) => header.indexOf(name);
  const phoneCol = header.indexOf('guardian_phone');

  const [existingClasses, existingUsers] = await Promise.all([
    db.query.classes.findMany({
      where: eq(schema.classes.organizationId, orgId),
      columns: { name: true },
    }),
    db.query.users.findMany({ columns: { email: true } }),
  ]);
  const classNames = new Set(existingClasses.map((c) => c.name.trim().toLowerCase()));
  const userEmails = new Set(existingUsers.map((u) => (u.email ?? '').trim().toLowerCase()));

  const dataRows = rawRows.slice(1);
  const rows: ParsedRosterRow[] = dataRows.map((cells, i) => {
    const studentFirstName = (cells[col('student_first_name')] ?? '').trim();
    const studentLastName = (cells[col('student_last_name')] ?? '').trim();
    const dateOfBirth = (cells[col('date_of_birth')] ?? '').trim();
    const className = (cells[col('class_name')] ?? '').trim();
    const guardianName = (cells[col('guardian_name')] ?? '').trim();
    const guardianEmail = (cells[col('guardian_email')] ?? '').trim().toLowerCase();
    const guardianPhone = phoneCol >= 0 ? (cells[phoneCol] ?? '').trim() : '';

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
      rowIndex: i + 2, // account for header + 1-indexing
      studentFirstName,
      studentLastName,
      dateOfBirth,
      className,
      guardianName,
      guardianEmail,
      guardianPhone,
      errors,
      willCreateClass: !!className && !classNames.has(className.toLowerCase()),
      existingGuardian: !!guardianEmail && userEmails.has(guardianEmail),
    };
  });

  return NextResponse.json({ rows });
}
