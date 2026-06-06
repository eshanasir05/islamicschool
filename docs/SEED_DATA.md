# Talibly — Seed Data

> Fake but realistic Islamic school data used for development and testing.
> Run once after `db:push`. Safe to re-run (upserts, not inserts).
> See `docs/SUPABASE_SETUP.md` for how to provision the database first.

---

## What Gets Seeded

### Organization

```ts
{
  id:       'org-al-noor',  // hardcode so re-runs are idempotent
  name:     'Masjid Al-Noor Sunday School',
  slug:     'al-noor',
  type:     'weekend_school',
  timezone: 'America/New_York',
  is501c3:  true,
}
```

Set `NEXT_PUBLIC_ORG_ID=org-al-noor` in `.env.local`.

---

### Auth users (create in Supabase Auth + matching `public.users` rows)

Create these in the Supabase dashboard under **Authentication → Users → Add user**,
or via the admin API in the seed script using `supabase.auth.admin.createUser`.
Use the same UUID for both `auth.users.id` and `public.users.id`.

| Email | Full name | Role | Password (dev only) |
|---|---|---|---|
| `amina@talibly.dev` | Sister Amina | teacher | `demo1234` |
| `idris@talibly.dev` | Brother Idris | teacher | `demo1234` |
| `sarah@talibly.dev` | Sarah Hassan | parent | `demo1234` |
| `omar@talibly.dev` | Omar Yusuf | parent | `demo1234` |
| `khalid@talibly.dev` | Imam Khalid | principal | `demo1234` |

> For development, enable "Email confirmations" OFF in Supabase Auth settings so you can
> log in without checking email. Re-enable for any public-facing deployment.

---

### Students

| Full name | Date of birth | Guardian | Class |
|---|---|---|---|
| Aisha Hassan | 2016-04-12 | sarah@talibly.dev (primary) | Hifz Circle — Beginners |
| Yusuf Hassan | 2018-09-03 | sarah@talibly.dev (primary) | Hifz Circle — Beginners |
| Bilal Yusuf | 2015-11-22 | omar@talibly.dev (primary) | Hifz Circle — Advanced |
| Khadijah Nasir | 2017-03-08 | omar@talibly.dev (primary) | Hifz Circle — Advanced |

All students: `status: 'active'`, `enrolledAt: '2024-09-01'`.

---

### Classes

| Name | Teacher | Students | Academic year |
|---|---|---|---|
| Hifz Circle — Beginners | Sister Amina | Aisha, Yusuf | 2024-2025 |
| Hifz Circle — Advanced | Brother Idris | Bilal, Khadijah | 2024-2025 |

---

### Memberships

One row per user × org:

```
amina   → teacher
idris   → teacher
sarah   → parent
omar    → parent
khalid  → principal
```

---

### Historical records (past 4 Sundays)

Generates enough data so the parent feed, admin stats, and hifz history are not empty
on first load.

**Attendance** — 90% present rate, realistic variation:
```
Each Sunday for 4 weeks, for each student:
  - 90% → present, arrivalTime between 09:00–09:15
  - 7%  → late,    arrivalTime between 09:15–09:45
  - 3%  → absent
```

**Hifz records** — progressive advancement:
```
Week 1: Al-Baqarah 1–5,   stream: sabak
Week 2: Al-Baqarah 6–10,  stream: sabak
Week 3: Al-Baqarah 11–20, stream: sabak  (Aisha/Bilal advance faster)
Week 4: Al-Baqarah 21–30, stream: sabak
audioUrl: null (no real audio in seed)
```

**Student notes** — 2 praise + 1 homework per student across the 4 weeks:
```
Praise:   noteType: 'praise',   category: 'Adab',   content: 'Sat quietly and helped a younger student.'
Praise:   noteType: 'praise',   category: 'Effort', content: 'Memorized the assigned portion perfectly this week.'
Homework: noteType: 'homework', category: null,     content: 'Review Al-Baqarah 1–10 before next Sunday.'
```

**Tuition plans** (static, no Stripe):
```
All 4 students: amountCents: 5000, currency: 'usd', frequency: 'monthly', status: 'active'
Payments: 3 succeeded rows per student (last 3 months), stripePaymentIntentId: null
```

---

## Seed Script Location

```
packages/db/src/seed.ts
```

Run it:

```bash
# From repo root
DATABASE_URL="postgresql://..." npx tsx packages/db/src/seed.ts
```

Or add it as a script in `packages/db/package.json`:

```json
"db:seed": "tsx src/seed.ts"
```

Then:

```bash
pnpm --filter @skooly/db db:seed
```

---

## Idempotency

Use `onConflictDoNothing()` (Drizzle) for all inserts so re-running the seed script is
safe. IDs are hardcoded strings (not `gen_random_uuid()`) so conflicts are predictable.

```ts
await db.insert(organizations).values(ORG_SEED).onConflictDoNothing()
await db.insert(users).values(USER_SEEDS).onConflictDoNothing()
// etc.
```

---

## Resetting

To wipe and reseed:

```bash
# In Drizzle Studio or psql: TRUNCATE all tables in reverse FK order
# Then re-run db:seed
pnpm --filter @skooly/db db:seed
```

Or add a `db:reset` script that drops + recreates all tables via `db:push --force`.
