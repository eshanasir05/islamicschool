import { buildCsv, csvResponse } from '@/lib/csv';

export const runtime = 'nodejs';

export async function GET() {
  const headers = ['student_first_name', 'student_last_name', 'date_of_birth', 'class_name', 'guardian_name', 'guardian_email', 'guardian_phone'];
  const rows = [
    ['Aisha', 'Hassan', '2016-04-12', 'Hifz Circle — Beginners', 'Sarah Hassan', 'sarah@example.com', '555-0100'],
    ['Bilal', 'Yusuf', '2015-11-22', 'Hifz Circle — Advanced', 'Omar Yusuf', 'omar@example.com', ''],
  ];
  return csvResponse(buildCsv(headers, rows), 'talibly-roster-import-sample.csv');
}
