# Talibly

Islamic Sunday school management platform — replacing WhatsApp groups, paper attendance, and Zelle screenshots with a purpose-built tool for teachers, parents, and principals.

Public product tour: https://taliblyapp.vercel.app/demo

---

## What is Talibly?

Talibly is a SaaS MVP for North American Islamic weekend schools. A teacher can complete the full class wrap (attendance, hifz progress, notes, parent notification) in under 60 seconds. Parents get an immediate summary. Principals see a live dashboard.

Three role-based flows:

- **Teacher** — mark attendance, log hifz ayah ranges with optional audio, add praise notes, assign class homework (one task, one due date), send parent wrap email
- **Parent** — daily feed per child with attendance, hifz record, teacher notes, homework due dates, billing status, and school announcements
- **Principal/Admin** — dashboard with weekly stats, student/class/teacher management, tuition plans via Stripe Checkout, CSV exports, homework by class, and analytics

Homework is a real, class-scoped feature (`homework_assignments` table) — a teacher assigns a task with a title, optional instructions, and a due date from `/teacher/homework`; every guardian of an enrolled student gets an in-app notification immediately, and the assignment shows in the parent feed and on the admin class detail page.

The **Insights dashboard** (`/admin/insights`) provides a monthly business-intelligence view: student/teacher/parent headcount, attendance rate, tuition collected vs. outstanding, pending plan count, payment status breakdown with visual bars, a recent-payments feed, and per-class attendance rate table — all scoped to the organisation and rendered server-side with no charting library.

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
| Payments | Stripe Checkout + webhooks (tuition subscription billing) |
| Monorepo | Turborepo + pnpm workspaces |
| Linting | Biome |

---

## Safe product tour and guided demo

Talibly does not publish reusable usernames or passwords. The former shared demo accounts have been retired. `/demo` is a public visual tour built entirely from fictional sample information; guided access is arranged privately through `/contact` when needed.

The focused guided-demo story is:

1. A principal enrolls a fictional student, assigns a class, and links a fictional guardian.
2. The assigned teacher marks attendance and records a text-only Hifz session.
3. The linked parent sees the attendance and Quran update in the child feed.
4. A past-due fictional tuition plan creates an in-app reminder; email delivery is shown only when Resend is configured and succeeds.

No real student, parent, payment, email, address, or audio information belongs in the guided-demo dataset.

---

## Stripe test cards

Use these in the Stripe Checkout during the tuition demo:

| Card number | Scenario |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |

Expiry: any future date (e.g. `12/29`). CVV: any 3 digits. ZIP: any 5 digits.

---

## Key workflows

| Workflow | Path |
|---|---|
| Admin invites teacher | `/admin/teachers/invite` |
| Admin invites parent + links to student | `/admin/parents/invite` |
| Admin creates tuition plan (Stripe Checkout) | `/admin/tuition/[studentId]` |
| Teacher completes class wrap | `/teacher → attendance → hifz → notes → confirm` |
| Parent views child feed + billing | `/parent/[studentId]` |
| Admin downloads CSV export | `/admin/exports` |
| Admin views analytics dashboard | `/admin/insights` |
| Change password | `/account` |
| Admin edits org settings | `/admin/settings` |

---

## Local setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template and fill in values
cp apps/web/.env.example apps/web/.env.local

# 3. Apply versioned migrations to your Supabase project
pnpm --filter @skooly/db db:migrate

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

Optional (tuition/Stripe features disabled without these):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

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
│           │   └── api/            # Route handlers (leads, auth callbacks, Stripe webhook)
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
pnpm --filter @skooly/db db:migrate         # Apply versioned schema/RLS changes
pnpm --filter @skooly/db db:seed            # Seed demo data
pnpm --filter @skooly/db db:reset-demo      # Wipe + reseed the demo org only (see below)
```

---

## Resetting demo data

Before a guided walkthrough or demo video, you can wipe the fictional organization back to a clean, fully-seeded state with one command. The reset never touches any other organization or any Supabase Auth account. The seed script creates fictional application profiles and records only; it does not create login accounts.

```bash
cd packages/db
ALLOW_DEMO_RESET=true DEMO_ORG_ID=a1b2c3d4-0000-0000-0000-000000000001 pnpm db:reset-demo
```

Both environment variables are required and checked before anything is deleted:
- `ALLOW_DEMO_RESET=true` — explicit confirmation you intend to run a destructive reset
- `DEMO_ORG_ID` — must exactly match the hardcoded demo org id above, as a second explicit confirmation of *what* you're wiping

Missing or incorrect values cause the script to refuse to run and exit immediately with no changes made.

What it does, in FK-safe order: deletes all messages/threads, notifications, trial placements, hifz milestones/records, student notes, homework, attendance, payments, tuition plans, consents, guardian links, and enrollments scoped to the fictional org, then deletes that org's students and classes, and re-runs `db:seed` to restore fictional profiles and operational records. It does not provision authentication access.

Not touched by the reset: `contact_submissions` (inbound leads) — this table has no organization scoping in the schema, so it is intentionally left alone rather than risk deleting real inbound inquiries in a shared environment. Clear it manually via the Supabase dashboard if needed.

---

## Deployment (Vercel)

1. Connect the `eshanasir05/islamicschool` repo to Vercel
2. Set root directory to `apps/web`
3. Add all environment variables from `.env.example` to the Vercel dashboard
4. Deploy — Turbo remote cache is not required; `globalEnv` in `turbo.json` ensures env vars propagate to all packages at build time
5. **Stripe webhook** — after first deploy, go to Stripe Dashboard → Developers → Webhooks → add endpoint `https://[your-domain]/api/stripe/webhook` with events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`

---

## Known limitations / future work

These are intentional MVP trade-offs, not bugs:

- **No SMS/push notifications** — parent wrap emails use Resend; Twilio/push not wired up
- **Single organisation** — `NEXT_PUBLIC_ORG_ID` is hardcoded; multi-tenancy would require org switching
- **No Stripe Connect** — all payments go to the platform Stripe account; per-school sub-accounts not implemented
- **Audio requires Supabase Storage bucket** — hifz recording silently skips if the `hifz-audio` bucket doesn't exist
- **No in-app messaging** — schema has `message_threads`/`messages` tables but no UI; school-wide announcements are the only communication channel
- **No date filter on exports** — CSV exports return all records; date-range filtering is a natural next step
- **Invited users have no password until they use "Forgot password"** — this is by design; Supabase invite links log the user in directly
- **Sibling discounts apply directly to the charged amount, not as a separate Stripe Coupon** — when an admin applies a sibling discount, the Stripe Checkout price is created at the already-discounted amount. This is fully real (the family is genuinely charged less) but it won't appear as a separate "discount" line item on the Stripe invoice/receipt — only the final total shows. A full Stripe Coupon/Promotion Code integration is a natural next step if that line-item breakdown matters.

The same list, written for a non-technical audience, is public at `/known-limitations`.

---

## Recommended pilot setup

Before running a real single-school pilot rather than a fictional guided walkthrough:

1. **Use a separate clean organization and database state.** Do not mix a pilot school's records with the fictional guided-demo dataset.
2. **Set the school's real profile** in Admin → Settings (name, address) before inviting anyone — this is also the first item on the in-app Getting Started checklist.
3. **Invite one admin/principal account first**, have them work through the Getting Started checklist end to end (classes → teachers → students → guardians → tuition → announcement → homework → Board Pack → parent invites) before inviting teachers or parents, so the first real users don't land on an empty dashboard.
4. **Invite teachers next**, and validate attendance, text-only Hifz progress, notes, and email delivery with fictional records before entering any real student information. Do not enable real student audio until the consent workflow and school agreement are complete.
5. **Invite parents last**, once there's already real data (attendance, hifz, an announcement) for them to see on first login.
6. **Set expectations against the [known limitations](/known-limitations) page** — no SMS, no native app, single school per deployment — before the school commits further.
7. **Check the Activity Log** (Admin → Activity Log) periodically during the pilot — it's the fastest way to confirm real usage is happening without asking each user directly.
8. **Keep support simple** — the in-app "Need help?" link and `info@talibly.com` are the only support channel right now; there's no ticketing system, so plan to respond to pilot schools directly by email.
