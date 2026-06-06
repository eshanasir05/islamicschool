# Talibly — MVP Roadmap

> **What this is:** A real, working SaaS MVP built as a portfolio project. Real Supabase
> auth, real Postgres database, real file storage. Seeded fake school data for development.
> No Stripe, no SMS, no mobile app, no AI — those come later.
>
> **Goal:** A recruiter or school admin can log in, pick a role, and use every core flow
> end-to-end with believable data.

---

## 1. MVP Features

### Auth — real Supabase magic-link
- `/sign-in` — email input, "Send magic link" button, confirmation message
- Supabase Auth handles token delivery and session
- Middleware reads the session JWT, looks up `memberships` role, redirects to the correct route group
- No passwords, no OAuth, no sign-up form (accounts are pre-seeded)

### `/teacher` — 60-second class wrap
- Class selector on login (scoped to teacher's assigned classes)
- Tap-to-mark attendance: Present / Late / Absent per student; bulk-mark all Present, then tap exceptions
- Hifz entry per student: stream (Sabak / Sabqi / Manzil), surah, ayah range, voice memo via `MediaRecorder`
- Praise or homework note with preset categories (Adab, Effort, Improvement, Helpfulness)
- Confirm & send: writes to Supabase, marks session wrapped

### `/parent` — daily feed
- Child selector tab bar (parent sees all their linked students)
- Today's attendance card (status + arrival time)
- Hifz audio player (plays signed Supabase Storage URL)
- Praise card and homework card
- Reads live from the database — teacher submit appears here immediately

### `/admin` — principal snapshot
- Weekly attendance % roll-up per class
- Class wrap status today: submitted vs pending, per teacher
- Hifz wins count this week
- Tuition pipeline: paid / overdue / pending counts (static seed numbers — no Stripe yet)
- No charts, no exports — numbers and lists only for v1

---

## 2. What Is NOT Being Built (v1 scope boundary)

| Not building | Reason |
|---|---|
| Stripe tuition billing | Separate multi-week integration. Schools note cash for now. |
| SMS / Twilio | Resend covers magic-link email. SMS is not needed for demo. |
| Expo / React Native mobile app | Web is mobile-responsive. Native comes after web flows are solid. |
| Push notifications | Requires native app or service worker infra. Not worth the complexity yet. |
| Messaging UI | Schema is ready; the UI is a full sub-product. |
| Onboarding wizard | Accounts are seeded. No self-serve signup in v1. |
| Settings / profile pages | No org settings, no notification prefs, no profile editor. |
| Arabic / Urdu / French UI | North America v1 is English-only. |
| SSO (Google / Microsoft) | Enterprise tier feature. |
| AI features | Anthropic key is in `.env.example`; ignore it for now. |
| Multi-org switcher | Single org per deployment. Hardcode `ORG_ID` as an env var. |
| PostHog, Sentry | Wire after real users exist. |

---

## 3. Build Order

```
Step 1 — Supabase + Database (2–3 days)
  ├── Provision Supabase project (see docs/SUPABASE_SETUP.md)
  ├── Set env vars in apps/web/.env.local
  ├── Run: pnpm --filter @skooly/db db:push
  ├── Run seed script: packages/db/src/seed.ts  (see docs/SEED_DATA.md)
  ├── Verify tables + data in Drizzle Studio
  └── Confirm Supabase Auth can send magic links (check Resend or SMTP)

Step 2 — Auth + Middleware (1–2 days)
  ├── Install @supabase/ssr, @supabase/supabase-js in apps/web
  ├── apps/web/src/lib/supabase/server.ts   ← createServerClient helper
  ├── apps/web/src/lib/supabase/client.ts   ← createBrowserClient helper
  ├── apps/web/src/middleware.ts             ← session check + role redirect
  │     reads: supabase session → memberships.role
  │     teacher → /teacher, parent → /parent, principal|admin → /admin
  ├── apps/web/src/app/(auth)/sign-in/page.tsx
  └── apps/web/src/app/(auth)/sign-in/actions.ts  ← signInWithOtp server action

Step 3 — Teacher Class Wrap (4–5 days)
  ├── /teacher                             ← class selector
  ├── /teacher/[classId]                   ← attendance step (tap-to-mark)
  ├── /teacher/[classId]/hifz              ← hifz step (MediaRecorder + Supabase Storage upload)
  ├── /teacher/[classId]/notes             ← praise/homework step
  ├── /teacher/[classId]/confirm           ← summary review + submit button
  ├── apps/web/src/app/(teacher)/actions.ts
  │     submitAttendance   → INSERT attendance_records
  │     submitHifz         → upload audio to Supabase Storage, INSERT hifz_records + media_uploads
  │     submitNotes        → INSERT student_notes
  │     confirmWrap        → marks class as wrapped for today
  └── Success screen with "View as parent →" link

Step 4 — Parent Feed (3–4 days)
  ├── /parent                              ← child selector (reads student_guardians)
  ├── /parent/[studentId]                  ← today's feed
  ├── Queries: attendance_records, hifz_records, student_notes for sessionDate = today
  ├── AttendanceCard  (real DB row)
  ├── HifzCard        (real DB row + signed Supabase Storage URL for audio)
  ├── PraiseCard      (real DB row, visibleToParent = true only)
  └── HomeworkCard    (real DB row, noteType = homework)

Step 5 — Principal Dashboard (2–3 days)
  ├── /admin
  ├── Weekly attendance % per class
  │     SELECT + GROUP BY classId, sessionDate WHERE sessionDate >= 7 days ago
  ├── Class wrap status today
  │     derive from: did any attendance_records exist for today per class?
  ├── Hifz wins this week (COUNT hifz_records WHERE sessionDate >= 7 days ago)
  └── Tuition pipeline: static numbers from seed data (no live Stripe yet)

Step 6 — Polish (1–2 days)
  ├── Empty states: "No class wrapped yet today", "No feed items yet"
  ├── Error state: session expired → redirect to /sign-in
  ├── Mobile layout check on real device (teacher + parent flows one-handed)
  └── Add NEXT_PUBLIC_ORG_ID to .env.local; remove any hardcoded org UUIDs
```

**Total estimate:** 13–19 days.

---

## 4. Backend Stack

| Need | Tool | Notes |
|---|---|---|
| Database | Supabase Postgres + Drizzle ORM | Schema complete in `packages/db/src/schema/` |
| Auth | Supabase Auth, magic-link | `@supabase/ssr` in Next.js App Router |
| File storage | Supabase Storage, `hifz-audio` bucket | Private bucket, signed URLs for playback |
| Server actions | Next.js server actions | No separate API service or route handlers |
| Email (magic link) | Supabase built-in SMTP for dev; swap to Resend for production | |
| Seed data | `packages/db/src/seed.ts` script | See `docs/SEED_DATA.md` |
| Env validation | `@t3-oss/env-nextjs` | Fail fast on missing vars — add before Step 2 |

**Not wired in v1:** Resend (beyond magic-link), Twilio, Stripe, Expo Push, PostHog, Sentry, Anthropic.

---

## 5. UI Components to Build

### Add to `packages/ui`
- `Card` — base surface for feed items
- `Badge` — status chips (Present, Late, Absent, Sabak, Sabqi, Manzil)
- `AudioPlayer` — play/pause + scrub bar (extract from `mocks.tsx`, wire to real URL)
- `TextArea` — note input for praise/homework step
- `Stepper` — linear step indicator for teacher class wrap flow

### Screens to build
- `/sign-in` — email input, submit, "check your email" confirmation
- `/teacher` flow — class selector → attendance → hifz → notes → confirm (5 screens)
- `/parent` — child tabs + vertical card feed
- `/admin` — stat grid + class status list

### Design rules (do not break these)
- No new colors — use existing CSS variables only
- No new fonts — Geist Sans, Geist Mono, Instrument Serif only
- Mobile-first — teacher and parent screens must work one-handed on a phone
- Do not touch `site-nav.tsx` or `site-footer.tsx` (marketing shell, already done)
