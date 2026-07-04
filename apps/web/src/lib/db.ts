import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@skooly/db/schema';
import { env } from '@/env';

// Cache the connection pool on globalThis so Next.js dev-mode hot reloads
// reuse it instead of opening a new pool on every module reload, which
// otherwise exhausts Supabase's pooler connection limit over a long session.
const globalForDb = globalThis as unknown as { queryClient?: ReturnType<typeof postgres> };

const queryClient = globalForDb.queryClient ?? postgres(env.DATABASE_URL, { prepare: false });
if (process.env.NODE_ENV !== 'production') globalForDb.queryClient = queryClient;

export const db = drizzle(queryClient, { schema });
export { schema };
