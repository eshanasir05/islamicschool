# Talibly — Supabase Setup Guide

> **Phase:** Current — follow this before writing any product code.
> See `docs/SEED_DATA.md` for the fake school data to load after setup.
> See `docs/MVP_ROADMAP.md` for the full build order.
>
> Reference: `packages/db/src/schema/` for all table definitions.
> Run every command from the repo root unless noted otherwise.

---

## 1. Supabase Project Setup

### Create the project

1. Go to [supabase.com](https://supabase.com) → New project.
2. **Name:** `talibly` (or `talibly-dev` for a dev-only project).
3. **Region:** closest to your users — `us-east-1` (Virginia) is a safe default for North America.
4. **Password:** generate a strong one and save it in a password manager. You will need it for `DATABASE_URL`.
5. Wait ~2 minutes for provisioning.

### Enable Auth providers

In the Supabase dashboard → **Authentication → Providers**:
- **Email** → enable, set "Confirm email" to **true**, set "Secure email change" to **true**.
- **Magic Link** → already on by default with Email provider.
- Disable everything else (Google, GitHub, etc.) — not needed for v1.

### Configure Auth emails

**Authentication → Email Templates → Magic Link:**
- Update the subject to: `Sign in to Talibly`
- Update the body to reference Talibly, not the Supabase default.

### Create a Storage bucket for audio

In **Storage → New bucket:**
- **Name:** `hifz-audio`
- **Public:** No (private — signed URLs only)
- **File size limit:** 50 MB
- **Allowed MIME types:** `audio/webm, audio/mp4, audio/mpeg, audio/ogg`

---

## 2. Required Environment Variables

Copy `.env.example` to `.env.local` in `apps/web/` and fill in every value below.

```bash
# Supabase — from Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>   # never expose to browser

# Postgres — from Project Settings → Database → Connection string (URI mode)
# Use the "Transaction" pooler URL (port 6543) for serverless/edge, not the direct URL
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000          # change to production URL before launch
```

**Not needed until later phases:** `STRIPE_*`, `RESEND_API_KEY`, `TWILIO_*`,
`NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN`, `ANTHROPIC_API_KEY`.

> **Important:** `DATABASE_URL` must use the **Transaction pooler** (port 6543), not the
> direct connection (port 5432). Drizzle with `postgres-js` and `{ prepare: false }` is
> already configured correctly for pooled connections — do not change that flag.

---

## 3. Drizzle Commands

All scripts are defined in `packages/db/package.json`. Run them via pnpm from the repo root.

### Push schema to Supabase (first-time setup)

```bash
# Set DATABASE_URL in your shell first, or it will use the localhost default
DATABASE_URL="postgresql://..." pnpm --filter @skooly/db db:push
```

`db:push` introspects the live database and applies your schema without generating migration
files. Use this during active development.

### Generate migration files (before production deploys)

```bash
pnpm --filter @skooly/db db:generate
# Creates SQL files in packages/db/drizzle/
```

### Apply migrations (production)

```bash
pnpm --filter @skooly/db db:migrate
```

### Open Drizzle Studio (visual DB browser)

```bash
DATABASE_URL="postgresql://..." pnpm --filter @skooly/db db:studio
# Opens at https://local.drizzle.studio
```

### Expected table creation order

Drizzle resolves FK references automatically, but the schema exports them in this order in
`schema/index.ts`, which is correct:

```
organizations → users → memberships
                     → students → student_guardians
                     → classes  → class_enrollments
                                → attendance_records
                                → hifz_records
                                → student_notes
                     → tuition_plans → payments
                     → message_threads → messages → message_reads
                     → media_uploads
                     → consents
```

---

## 4. How Supabase Auth Maps to `users` + `memberships`

Supabase Auth manages its own `auth.users` table (UUID, email, session tokens). Your app has
a separate `public.users` table. **These must be kept in sync manually** — Supabase does not
auto-populate `public.users`.

### The link

`public.users.id` = `auth.users.id`. Use the same UUID for both rows.

### Sign-up flow (magic link)

```
1. User enters email → Supabase sends magic link
2. User clicks link → Supabase creates auth.users row (if new), issues JWT
3. Your middleware reads the JWT → extracts auth.users.id + email
4. Middleware checks: does public.users row exist for this id?
   └── No → INSERT into public.users (id, email, fullName='')
             INSERT into memberships (userId, organizationId, role)
   └── Yes → continue
5. Middleware reads membership.role → redirects to correct route group
```

### Middleware role check (pseudocode)

```ts
// apps/web/src/middleware.ts
const { data: { session } } = await supabase.auth.getSession()
if (!session) redirect('/sign-in')

const membership = await db.query.memberships.findFirst({
  where: (m, { eq, and }) => and(
    eq(m.userId, session.user.id),
    eq(m.organizationId, ORG_ID),  // single org for v1
    eq(m.status, 'active')
  )
})

if (!membership) redirect('/sign-in?error=no-access')

// Route group guards
if (pathname.startsWith('/teacher') && membership.role !== 'teacher') redirect('/sign-in')
if (pathname.startsWith('/parent')  && membership.role !== 'parent')  redirect('/sign-in')
if (pathname.startsWith('/admin')   && !['admin','principal'].includes(membership.role)) redirect('/sign-in')
```

### Key constraint

`memberships` has a unique index on `(userId, organizationId, role)`. A user can hold
multiple roles in one org (e.g. a parent who is also a teacher) — each gets its own row.
Your middleware must decide which role takes precedence for routing.

---

## 5. Role Rules for Parent / Teacher / Admin

| Role | Route group | What they can read | What they can write |
|---|---|---|---|
| `teacher` | `/teacher` | Their own classes + enrolled students | `attendance_records`, `hifz_records`, `student_notes`, `media_uploads` |
| `parent` | `/parent` | Students linked via `student_guardians` where `receivesNotifications = true` | Nothing (read-only feed) |
| `principal` | `/admin` | All classes, all students, all records in their org | Can create classes, enroll students, invite users |
| `admin` | `/admin` | Same as principal | Same as principal + can manage org settings |
| `student` | none in v1 | — | — |

### Row-level security (RLS)

Supabase RLS is enabled on every Talibly table in the public schema. Policies use `auth.uid()` plus active organization membership, assigned-teacher relationships, and linked-guardian relationships. The anonymous role has no table grants, and server-only tables such as contact submissions and the Stripe event ledger have no authenticated-client policies.

The application server still uses a privileged Postgres/service connection that bypasses RLS. Every server action and route handler must therefore continue to authenticate the caller and include organization ownership in sensitive queries. RLS is defense in depth; it does not replace server-side authorization.

---

## 6. Seed Data Plan

Run this seed once after `db:push`. It creates enough data to develop and test all three
MVP flows (teacher wrap, parent feed, principal dashboard) without needing real school data.

### What to seed

```
Organization
  name: "Masjid Al-Noor Sunday School"
  slug: "al-noor"
  type: "weekend_school"
  timezone: "America/New_York"

Fictional application profiles (no Auth login is created by seed.ts)
  Teacher:   Sister Amina   | role: teacher
  Teacher:   Brother Idris  | role: teacher
  Parent:    Sarah Hassan   | role: parent
  Parent:    Omar Yusuf     | role: parent
  Principal: Imam Khalid    | role: principal

Students
  Aisha Hassan   | dob: 2016-04-12 | guardian: Sarah Hassan (isPrimary: true)
  Yusuf Hassan   | dob: 2018-09-03 | guardian: Sarah Hassan (isPrimary: true)
  Bilal Yusuf    | dob: 2015-11-22 | guardian: Omar Yusuf  (isPrimary: true)

Classes
  "Hifz Circle — Beginners" | teacher: Sister Amina  | students: Aisha, Yusuf
  "Hifz Circle — Advanced"  | teacher: Brother Idris | students: Bilal

Seed records (so the parent feed isn't empty on first load)
  1 attendance_record per student (status: present, sessionDate: today)
  1 hifz_record per student (surah 1, ayah 1-7, stream: sabak)
  1 student_note per student (noteType: praise, category: Adab)
```

### How to seed

The seed script is at `packages/db/src/seed.ts` and creates fictional application data only:

```bash
pnpm --filter @skooly/db db:seed
```

---

## 7. Risks Before Implementation

| Risk | Detail | Mitigation |
|---|---|---|
| **`users.id` ≠ `auth.users.id`** | If you insert a `public.users` row with a different UUID than Supabase Auth assigned, the session-to-user lookup breaks completely. | Always use `session.user.id` as the `public.users.id` — never `gen_random_uuid()` for users created post-auth. |
| **Transaction pooler vs direct connection** | `drizzle-kit push/migrate` needs a direct connection (port 5432), not the pooler, to run DDL statements. The app at runtime must use the pooler (port 6543). | Set `DATABASE_URL` to pooler for the app; use `DATABASE_URL_DIRECT` (port 5432) in the Drizzle config for migrations only. Update `drizzle.config.ts` to read from `DATABASE_URL_DIRECT`. |
| **No env validation** | If `DATABASE_URL` is missing, `packages/db/src/client.ts` throws at import time — Next.js will crash on startup with an unhelpful message. | Install `@t3-oss/env-nextjs` and add a `src/env.ts` validation file before wiring any server actions. |
| **Audio files in Supabase Storage without consent check** | `media_uploads.consentVerified` is a boolean in the schema. If you skip the consent flow, you may store audio of minors without parental opt-in — a COPPA issue for US schools. | For v1: insert `consents` rows during seed with `granted: true`. Build the real consent UI before any school with real students goes live. |
| **Single org assumption** | `drizzle.config.ts` and the planned middleware hardcode a single `ORG_ID`. | Store `ORG_ID` as an env var (`NEXT_PUBLIC_ORG_ID`). Do not hardcode a UUID in middleware. |
| **RLS disabled** | Using the service role key server-side with no RLS means a bug in a server action could read or write any org's data. | Keep the DB package server-only (never import `@skooly/db` in a `'use client'` file). Add an org-scoping utility that always appends `eq(table.organizationId, orgId)` to every query. |
| **No migration history** | `db:push` doesn't generate migration files. If you push a breaking schema change (drop column, change enum), there's no rollback. | Switch to `db:generate` + `db:migrate` before the first real school's data is in the database. |
