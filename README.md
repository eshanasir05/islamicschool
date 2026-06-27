# Talibly

Islamic Sunday school management platform — replacing WhatsApp groups, paper attendance, and Zelle screenshots with a purpose-built tool for teachers, parents, and principals.

Live demo: https://talibly.vercel.app

---

## What is Talibly?

Talibly is a SaaS MVP for North American Islamic weekend schools. A teacher can complete the full class wrap (attendance, hifz progress, notes, parent notification) in under 60 seconds. Parents get an immediate summary. Principals see a live dashboard.

Three role-based flows:

- **Teacher** — mark attendance, log hifz ayah ranges with optional audio, add praise/homework notes, send parent wrap email
- **Parent** — daily feed per child with attendance, hifz record, teacher notes, and school announcements
- **Principal/Admin** — dashboard with weekly stats, student list, class list, teacher list, announcements

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind 4 + custom CSS design system |
| Auth | Supabase Auth (email + password, magic link) |
| Database | Supabase Postgres + Drizzle ORM |
| Storage | Supabase Storage (hifz audio) |
| Email | Resend (transactional + parent wrap notifications) |
| Monorepo | Turborepo + pnpm workspaces |
| Linting | Biome |

---

## Demo credentials

All demo accounts use password `demo1234`.

| Email | Role | Access |
|---|---|---|
| amina@talibly.dev | Teacher | Beginners class (Aisha + Yusuf) |
| idris@talibly.dev | Teacher | Advanced class (Bilal + Khadijah) |
| sarah@talibly.dev | Parent | Aisha Hassan, Yusuf Hassan |
| omar@talibly.dev | Parent | Bilal Yusuf, Khadijah Nasir |
| khalid@talibly.dev | Principal | Full admin dashboard |

Sign in at `/sign-in`.

---

## Local setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template and fill in values
cp apps/web/.env.example apps/web/.env.local

# 3. Push schema to your Supabase project
pnpm --filter @skooly/db db:push

# 4. Seed demo data
pnpm --filter @skooly/db db:seed

# 5. Start dev server
pnpm dev
```

### Required environment variables

See `apps/web/.env.example` for the full list. Minimum to run locally:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (pooler URL, port 6543)
- `DATABASE_URL_DIRECT` (direct URL, port 5432, for migrations)
- `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_ORG_ID` (the UUID of the seeded organization)

Optional (email features degrade gracefully without these):
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `LEADS_TO_EMAIL`

---

## Project structure

```
islamicschool/
├── apps/
│   └── web/                        # Next.js app
│       └── src/
│           ├── app/
│           │   ├── (auth)/         # sign-in, forgot-password, update-password
│           │   ├── (teacher)/      # /teacher/** — class wrap flow
│           │   ├── (parent)/       # /parent/** — daily feed
│           │   ├── (admin)/        # /admin/** — principal dashboard
│           │   └── api/            # Route handlers (leads, auth callbacks)
│           ├── components/         # Shared UI components
│           └── lib/                # Supabase helpers, Hijri date util
├── packages/
│   ├── db/                         # Drizzle schema (14 tables) + seed script
│   └── ui/                         # Shared component primitives
```

---

## Scripts

```bash
pnpm dev                                    # Start all apps
pnpm build                                  # Build all packages and apps
pnpm --filter @skooly/web typecheck         # TypeScript check
pnpm --filter @skooly/web lint              # Biome lint
pnpm --filter @skooly/db db:push            # Push schema changes
pnpm --filter @skooly/db db:seed            # Seed demo data
```

---

## Deployment (Vercel)

1. Connect the `eshanasir05/islamicschool` repo to Vercel
2. Set root directory to `apps/web`
3. Add all environment variables from `.env.example` to the Vercel dashboard
4. Deploy — Turbo remote cache is not required; `globalEnv` in `turbo.json` ensures env vars propagate to all packages at build time
