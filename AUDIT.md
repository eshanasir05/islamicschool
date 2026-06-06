# Talibly — Technical Audit

> Codebase package name: `skooly`. Product name: **Talibly** — a polished Islamic school
> platform for Sunday schools, Quran programs, and parents.

---

## 1. Tech Stack & Folder Structure

**Monorepo** managed by Turborepo + pnpm workspaces.

```
islamicschool/
├── apps/
│   ├── web/          Next.js 16, React 19, Tailwind 4, App Router
│   └── mobile/       Expo 54, React Native 0.81 — empty stub
├── packages/
│   ├── db/           Drizzle ORM, postgres-js, 14 table schemas
│   ├── shared/       Zod schemas + TypeScript domain types
│   ├── ui/           Button component + cn() utility
│   └── api-client/   Fetch-based API client stub
└── infra/            Supabase migrations folder (empty)
```

- **Formatter/linter**: Biome (not ESLint/Prettier — don't mix them).
- **Services declared in `.env.example` but not integrated**: Supabase, Stripe, Resend,
  Twilio, Expo Push, PostHog, Sentry, Anthropic.

---

## 2. Existing Pages & Components

**Marketing site — fully built:**

| Route | What it is |
|---|---|
| `/` | Landing page — hero, persona sections, stats, pricing preview, CTA |
| `/for-parents` | Parent persona page — hifz audio, push alerts, homework, multi-child |
| `/for-teachers` | Teacher persona page — 60-second class wrap walkthrough |
| `/for-principals` | Principal persona — dashboard mock, tuition pipeline, exports |
| `/pricing` | 3-tier pricing ($19 / $79 / $249), FAQ, monthly/annual toggle |

**Product app routes — stub only, render nothing:**

| Route | Status |
|---|---|
| `/(admin)/admin` | Empty |
| `/(parent)/parent` | Empty |
| `/(teacher)/teacher` | Empty |

**Components worth knowing:**

- `mocks.tsx` — the most important file right now. Fully-designed product UI prototypes:
  `AttendanceCard`, `HifzCard` (audio player), `PraiseCard`, `HomeworkCard`, `HeroPhone`,
  `TeacherWrap` (60-second timer, 4 steps), `Dashboard`, `PaymentsCard`. Used for marketing
  visuals only — not wired to real data.
- `site-nav.tsx`, `site-footer.tsx`, `site-cta.tsx` — marketing shell.
- `page-hero.tsx`, `persona-sidebar.tsx` — shared persona page layout.
- `icon.tsx` — 23 custom SVG icons, no external icon library.

**Design system**: `globals.css` is ~2,100 lines. Full CSS variable system — colors, fluid
type scale (clamp-based), spacing. Brand accent is emerald (`#059669`). Fonts: Geist Sans +
Geist Mono + Instrument Serif italic for headlines.

---

## 3. Backend / API / Auth / Database

| Area | Status |
|---|---|
| Database schema | Complete — 14 Drizzle tables covering all domain objects |
| Migrations | Not run — no Supabase project provisioned yet |
| API routes | None exist — no `/api/` directory |
| Auth | Not wired — Supabase Auth planned (magic-link), zero implementation |
| Server actions | None |
| Stripe | Not wired |
| Email/SMS/Push | Not wired |

**Database schema is solid.** All 14 tables are well-modeled:

- `users`, `organizations`, `memberships` — multi-tenant identity
- `students`, `classes`, `classEnrollments`, `studentGuardians` — school ops
- `attendanceRecords`, `hifzRecords`, `studentNotes` — academic activity
- `tuitionPlans`, `payments` — billing
- `messageThreads`, `messages`, `messageReads` — messaging with read receipts
- `consents`, `mediaUploads` — consent + audio/media storage

Soft deletes on users/orgs/students via `deletedAt`. JSONB for flexible fields (quiet hours,
branding, schedule, emergency contacts). All primary keys are UUIDs.

---

## 4. What Is Working

- The marketing site renders correctly — all 5 routes, all components.
- The design system is production-quality (fluid type, consistent tokens).
- The database schema is well-designed and covers the full domain.
- The shared types and Zod schemas exist and are importable.
- The monorepo build pipeline (Turbo + pnpm) works.
- The API client stub has the right shape — just needs real endpoints behind it.
- Mock product UIs in `mocks.tsx` are detailed enough to build from directly.

---

## 5. What Is Broken or Incomplete

| Issue | Severity |
|---|---|
| No auth at all — any URL is open | Critical |
| Product app routes render nothing | Critical |
| No API routes exist | Critical |
| Database not provisioned or seeded | Critical |
| Mobile app is Expo boilerplate | High |
| `packages/ui` has only Button — no inputs, cards, modals | High |
| No error boundaries or loading states | Medium |
| `site-cta.tsx` email form posts nowhere | Medium |
| `infra/` folder is empty — no migration scripts | Medium |
| No environment-variable validation at startup | Low |

---

## 6. What to Build Next for a Real MVP

**Phase 1 — Foundation (everything depends on this)**
1. Provision Supabase project, set env vars, run `db:push`
2. Wire Supabase Auth — magic-link sign-in, session middleware, role-based route guards on
   `(admin)`, `(parent)`, `(teacher)` groups
3. Seed one organization + one teacher + two students + two parents

**Phase 2 — Teacher Class Wrap (F-TC-1) — the core product loop**
4. Build `/teacher` — class selector → attendance tap-to-mark → hifz voice record →
   praise/homework → confirm & send
5. Build `POST /api/attendance` and `POST /api/hifz` server actions
6. Wire Supabase Storage for audio uploads
7. Trigger parent push notification on class wrap submit

**Phase 3 — Parent Feed (F-PA-1)**
8. Build `/parent` — child selector, attendance card, hifz audio player, praise, homework
9. Wire Expo Push for mobile notifications

**Phase 4 — Principal Dashboard (F-PR-1)**
10. Build `/admin` — weekly stats roll-up, attendance %, class wrap status, tuition pipeline

**Phase 5 — Tuition**
11. Stripe Connect onboarding for organizations
12. Tuition plan creation + Stripe Billing subscriptions
13. Payment receipt emails via Resend

---

## 7. Risks, Mess, and Things to Watch

| Finding | Detail |
|---|---|
| `mocks.tsx` is 700+ lines | Product prototypes living in a marketing file. When building real product pages, extract these into proper components — don't build on top of the mock file. |
| `globals.css` is ~2,100 lines | Everything in one file. Fine now; split by layer (reset / tokens / typography / utilities) once it settles. |
| `packages/ui` is nearly empty | Only `Button` + `cn`. Build inputs, cards, modals into the UI package from the start so web and mobile can share them. |
| No env validation | Missing `DATABASE_URL` / Supabase vars will fail silently at runtime. Add a startup check (e.g. `@t3-oss/env-nextjs`). |
| Placeholder data is domain-correct | Student names, surah numbers, hifz streams all match the domain. Keep seeded data consistent with these. |
| `api-client` has two stub endpoints | Will grow significantly. Keep the typed-client pattern — right call for sharing between web and mobile. |
| No tests anywhere | `turbo.json` has a `test` task but no test files. Add integration tests for class wrap and payment flows before going live. |
| Mobile is untouched | Default Expo boilerplate. Finish the web teacher flow first, then port to Expo. |

---

## Action Plan Summary

```
Week 1  Supabase up → auth → seed data → route guards
Week 2  Teacher class wrap (web) → API routes → audio upload
Week 3  Parent feed (web) → push notifications
Week 4  Principal dashboard → polish → invite beta schools
Later   Stripe, mobile Expo app, Arabic/Urdu i18n
```

The foundation (schema, design system, marketing) is genuinely strong. The entire product
layer is a blank page. **Auth is the single gate blocking everything else — start there.**
