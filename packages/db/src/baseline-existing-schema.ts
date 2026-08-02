import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

const BASELINE_CREATED_AT = 1785645716569;
const EXPECTED_EXISTING_TABLES = [
  'activity_log',
  'attendance_records',
  'class_enrollments',
  'classes',
  'consents',
  'contact_submissions',
  'hifz_milestones',
  'hifz_records',
  'homework_assignments',
  'homework_completions',
  'media_uploads',
  'memberships',
  'message_reads',
  'message_threads',
  'messages',
  'notifications',
  'organizations',
  'payments',
  'student_guardians',
  'student_notes',
  'students',
  'trial_placements',
  'tuition_plans',
  'users',
] as const;

if (process.env.ALLOW_EXISTING_SCHEMA_BASELINE !== 'true') {
  throw new Error(
    'Refusing to baseline. Set ALLOW_EXISTING_SCHEMA_BASELINE=true only after verifying the existing Supabase schema.',
  );
}

const databaseUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL_DIRECT or DATABASE_URL is required.');

const baselineSql = await readFile(
  new URL('../drizzle/0000_awesome_edwin_jarvis.sql', import.meta.url),
  'utf8',
);
const baselineHash = createHash('sha256').update(baselineSql).digest('hex');
const client = postgres(databaseUrl, { max: 1, prepare: false });

try {
  await client.begin(async (transaction) => {
    const rows = await transaction<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `;
    const existingTables = new Set(rows.map((row) => row.table_name));
    const missingTables = EXPECTED_EXISTING_TABLES.filter((table) => !existingTables.has(table));
    if (missingTables.length > 0) {
      throw new Error(
        `Existing schema does not match the Talibly baseline. Missing: ${missingTables.join(', ')}`,
      );
    }

    await transaction`create schema if not exists drizzle`;
    await transaction`
      create table if not exists drizzle.__drizzle_migrations (
        id serial primary key,
        hash text not null,
        created_at bigint
      )
    `;

    const latest = await transaction<{ hash: string; created_at: string }[]>`
      select hash, created_at
      from drizzle.__drizzle_migrations
      order by created_at desc
      limit 1
    `;

    if (latest.length > 0) {
      if (Number(latest[0]?.created_at) >= BASELINE_CREATED_AT) {
        console.log('The database already has a Drizzle migration baseline. No change made.');
        return;
      }
      throw new Error('A different migration history already exists; refusing to overwrite it.');
    }

    await transaction`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${baselineHash}, ${BASELINE_CREATED_AT})
    `;
    console.log('Recorded the verified existing schema as migration 0000.');
  });
} finally {
  await client.end();
}
