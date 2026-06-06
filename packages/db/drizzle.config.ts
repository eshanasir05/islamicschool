import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Use DATABASE_URL_DIRECT (port 5432) for DDL migrations — not the pooler
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:54322/postgres',
  },
  strict: true,
  verbose: true,
} satisfies Config;
