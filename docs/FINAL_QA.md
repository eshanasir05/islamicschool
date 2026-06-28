# Talibly — Final QA Checklist

Production URL: https://islamicschool-web.vercel.app

---

## Demo credentials

| Email | Password | Role | Access |
|---|---|---|---|
| khalid@talibly.dev | demo1234 | Principal/Admin | Full admin dashboard |
| amina@talibly.dev | demo1234 | Teacher | Hifz Circle — Beginners (Aisha + Yusuf) |
| idris@talibly.dev | demo1234 | Teacher | Hifz Circle — Advanced (Bilal + Khadijah) |
| sarah@talibly.dev | demo1234 | Parent | Aisha Hassan, Yusuf Hassan |
| omar@talibly.dev | demo1234 | Parent | Bilal Yusuf, Khadijah Nasir |

---

## Auth flows

- [ ] Sign in with password → correct role redirect
- [ ] Sign in with wrong password → error shown, no redirect
- [ ] Sign in as unknown email → `?error=no-access` message on sign-in page
- [ ] Forgot password → email received → link works → password updated → can sign in
- [ ] Sign out → redirected to sign-in, session cleared
- [ ] Direct navigation to `/admin` as unauthenticated → redirect to `/sign-in`
- [ ] Direct navigation to `/teacher` as unauthenticated → redirect to `/sign-in`
- [ ] Direct navigation to `/parent` as unauthenticated → redirect to `/sign-in`

---

## Role access control

- [ ] Teacher (`amina@talibly.dev`) cannot access `/admin` → redirected to `/teacher`
- [ ] Teacher cannot access `/parent` → redirected to `/teacher`
- [ ] Parent (`sarah@talibly.dev`) cannot access `/admin` → redirected to `/parent`
- [ ] Parent cannot access `/teacher` → redirected to `/parent`
- [ ] `GET /api/admin/exports/students` as teacher → `{"error":"Forbidden"}` 403
- [ ] `GET /api/admin/exports/payments` as parent → `{"error":"Forbidden"}` 403
- [ ] `GET /api/admin/exports/attendance` as unauthenticated → `{"error":"Forbidden"}` 403
- [ ] Parent cannot see another parent's students (sarah cannot access Bilal's feed)

---

## Admin workflows

### Dashboard
- [ ] `/admin` loads with weekly attendance %, hifz wins, class wrap status, tuition counts
- [ ] Stats reflect seeded data (4 students, 2 classes, 12 payments)

### Students
- [ ] `/admin/students` lists all 4 seeded students
- [ ] Student detail shows profile, guardian links, attendance history, hifz records
- [ ] Add new student → appears in list
- [ ] Edit student → changes reflected
- [ ] Archive student → status badge changes
- [ ] Restore student → status badge returns to active

### Classes
- [ ] `/admin/classes` lists both seeded classes with teacher names
- [ ] Class detail shows enrolled students and session history table
- [ ] Add new class → appears in list
- [ ] Edit class → name/teacher updated
- [ ] Enroll student → appears in class detail
- [ ] Remove student from class → removed from list
- [ ] Archive class → archived badge shown

### Teachers
- [ ] `/admin/teachers` lists Sister Amina and Brother Idris
- [ ] "+ Invite teacher" → `/admin/teachers/invite` form renders
- [ ] Submit new email → `?status=invited` success message
- [ ] Submit existing email (sarah@talibly.dev) → `?status=added`
- [ ] Submit existing teacher (amina@talibly.dev) → `?status=already_member`
- [ ] Submit invalid email → `?status=invalid_email`
- [ ] Invited teacher email received → click link → lands on `/teacher` dashboard

### Parents
- [ ] `/admin/parents` lists Sarah Hassan and Omar Yusuf with linked students
- [ ] "+ Invite parent" → `/admin/parents/invite` form renders
- [ ] Student dropdown populated with all active students
- [ ] Submit new email + select student → `?status=invited`
- [ ] Submit existing user (not yet linked) + select student → `?status=added`
- [ ] Submit email already linked to that student → `?status=already_linked`
- [ ] Submit with no student selected → `?status=missing_student`
- [ ] Invited parent email received → click link → lands on `/parent` → sees linked student

### Tuition
- [ ] `/admin/tuition` lists all active students with plan status
- [ ] Students without plans show "Set up plan →" link
- [ ] Click student with plan → see plan card, Cancel button, payment history
- [ ] Create new plan → Stripe Checkout link appears in banner
- [ ] Open Checkout link → pay with `4242 4242 4242 4242` → webhook fires → plan status becomes active
- [ ] Payment history shows new payment with receipt link
- [ ] Cancel plan → plan status becomes cancelled, shown in Past plans

### Announcements
- [ ] Create announcement → appears in list
- [ ] Delete announcement → removed from list
- [ ] Announcement visible in parent feed

### Exports
- [ ] `/admin/exports` page loads with 3 export cards
- [ ] Download Student Roster CSV → file downloaded, columns correct, no injection chars
- [ ] Download Payment History CSV → file downloaded, seeded payments present
- [ ] Download Attendance Records CSV → file downloaded, all 4 Sundays × 4 students
- [ ] Filenames include today's date (e.g. `students-2026-06-27.csv`)

### Settings
- [ ] `/admin/settings` loads with org name "Masjid Al-Noor Sunday School"
- [ ] Edit org name → save → success message → name updated
- [ ] "Go to Account →" link navigates to `/account`

---

## Teacher workflows

- [ ] `/teacher` shows assigned classes (Sister Amina sees Beginners, Brother Idris sees Advanced)
- [ ] Select class → attendance screen with student cards
- [ ] Tap student card → cycles Present → Late → Absent → Present
- [ ] Proceed to Hifz → one entry per present/late student
- [ ] Log surah + ayah range → proceed to Notes
- [ ] Add praise note (with category chip) → add homework note
- [ ] Confirm screen → shows summary of all entries
- [ ] "Send to parents" → parent wrap email sent via Resend (check guardian inbox)
- [ ] Audio recording (optional) → requires `hifz-audio` bucket in Supabase Storage

---

## Parent workflows

- [ ] `/parent` redirects to first linked child's feed
- [ ] Tab bar shows all linked children (sarah sees Aisha + Yusuf)
- [ ] Switch child tabs → correct feed loads for each child
- [ ] Attendance card shows status + arrival time
- [ ] Hifz card shows surah + ayah range
- [ ] Teacher notes show praise (with category) and homework
- [ ] Billing section shows plan amount, frequency, status badge
- [ ] Billing shows pending warning if plan not yet paid
- [ ] Billing shows past due warning if overdue
- [ ] Recent payments list with receipt links (if Stripe payments exist)
- [ ] School announcements section visible at bottom
- [ ] Parent cannot navigate to `/admin` or `/teacher` directly

---

## Account / profile

- [ ] `/account` loads for all roles (teacher, parent, admin)
- [ ] Email shown read-only
- [ ] Update display name → saved → success confirmation
- [ ] Change password → new password works on next sign-in
- [ ] Role badge shown correctly
- [ ] Back link returns to correct role home

---

## Stripe end-to-end

- [ ] Admin creates monthly plan for a student with guardian selected
- [ ] Checkout link appears in success banner
- [ ] Checkout link opens Stripe hosted page
- [ ] Pay with test card `4242 4242 4242 4242`, expiry `12/29`, CVV `123`
- [ ] Webhook fires `checkout.session.completed` → plan status updated to `active`
- [ ] Webhook fires `invoice.payment_succeeded` → payment row inserted
- [ ] Receipt URL stored on payment record
- [ ] Parent sees Billing section showing active plan + payment receipt
- [ ] Admin cancels plan → Stripe subscription cancelled → DB status = `cancelled`
- [ ] Declined card `4000 0000 0000 0002` → checkout fails, plan stays `pending_payment`
- [ ] Webhook `invoice.payment_failed` fires → plan status = `past_due`

---

## CSV exports correctness

### Student Roster
- [ ] Includes all 4 seeded students + any added during testing
- [ ] `class_name` populated for enrolled students
- [ ] `parent_name` + `parent_email` populated for linked guardians
- [ ] `enrollment_status` = `active` for all seeded students
- [ ] No formula injection: test student name starting with `=SUM(` is escaped with `'`

### Payment History
- [ ] Includes 12 seeded payments (3 months × 4 students)
- [ ] `amount` formatted as decimal (e.g. `50.00`)
- [ ] `currency` = `usd`
- [ ] `stripe_payment_intent_id` blank for seeded payments (expected)
- [ ] `receipt_url` blank for seeded payments (expected)
- [ ] Stripe-originated payments (from Checkout test) have `receipt_url` populated

### Attendance Records
- [ ] 4 students × 4 Sundays = up to 16 rows (some absent = no hifz but attendance still recorded)
- [ ] `class_name` correct per student
- [ ] `recorded_by` shows teacher name
- [ ] `date` in `YYYY-MM-DD` format

---

## Security checklist

- [ ] `.env.local` not committed (verify: `git log --all -- apps/web/.env.local` returns nothing)
- [ ] No Stripe secret key visible in browser network tab
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` in any client-side bundle
- [ ] `?status=error` in invite URLs never contains raw Supabase error messages
- [ ] `/api/admin/exports/*` returns 403 when accessed by teacher/parent/unauthenticated
- [ ] Stripe webhook rejects invalid signatures (tampered body → 400)
- [ ] Cross-org: student IDs submitted to invite form are validated against current org

---

## Known limitations (not bugs)

- **No SMS/push notifications** — parent wrap emails only; Twilio not wired
- **Single organisation** — `NEXT_PUBLIC_ORG_ID` is env-level; multi-tenancy not implemented
- **No Stripe Connect** — all tuition payments go to one Stripe account
- **Hifz audio** — silently skips if `hifz-audio` Supabase Storage bucket doesn't exist
- **No in-app messaging** — schema supports it (`message_threads`/`messages`) but no UI
- **No date filter on CSV exports** — full history only; date range is a clear next step
- **Magic link / invite emails require SMTP** — Supabase's default email sending has rate limits; custom SMTP recommended for production
- **Invited users set password via Forgot Password** — invite links log them in directly but don't prompt for password setup

---

## Future improvements

- [ ] Multi-org / school switching
- [ ] Stripe Connect for per-school payouts
- [ ] Date range filter on CSV exports
- [ ] In-app messaging between teachers and parents
- [ ] Push notifications (Expo mobile app stub exists in `/apps/mobile`)
- [ ] Hifz progress charts on admin dashboard
- [ ] Sibling discount support in tuition plans
- [ ] Bulk student import from CSV
- [ ] Session replay / Hifz audio library per student
