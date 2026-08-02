import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;

test('all Talibly public tables have RLS and anonymous access is revoked', async (context) => {
  if (!databaseUrl) return context.skip('DATABASE_URL_DIRECT or DATABASE_URL is not configured');
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    const unprotected = await sql<{ table_name: string }[]>`
      select c.relname as table_name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and not c.relrowsecurity
      order by c.relname
    `;
    assert.equal(unprotected.length, 0);

    const anonGrants = await sql<{ table_name: string; privilege_type: string }[]>`
      select table_name, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'anon'
      order by table_name, privilege_type
    `;
    assert.equal(anonGrants.length, 0);
  } finally {
    await sql.end();
  }
});

test('Stripe event and payment identifiers have durable uniqueness', async (context) => {
  if (!databaseUrl) return context.skip('DATABASE_URL_DIRECT or DATABASE_URL is not configured');
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  const eventId = `evt_test_${randomUUID()}`;
  const rollback = new Error('ROLLBACK_TEST');

  try {
    try {
      await sql.begin(async (transaction) => {
        const first = await transaction<{ stripe_event_id: string }[]>`
          insert into public.stripe_webhook_events (stripe_event_id, event_type)
          values (${eventId}, 'invoice.payment_succeeded')
          on conflict do nothing
          returning stripe_event_id
        `;
        const retry = await transaction<{ stripe_event_id: string }[]>`
          insert into public.stripe_webhook_events (stripe_event_id, event_type)
          values (${eventId}, 'invoice.payment_succeeded')
          on conflict do nothing
          returning stripe_event_id
        `;
        assert.equal(first.length, 1);
        assert.equal(retry.length, 0);

        const paymentIndex = await transaction<{ index_name: string }[]>`
          select indexname as index_name
          from pg_indexes
          where schemaname = 'public'
            and tablename = 'payments'
            and indexname = 'payments_stripe_payment_intent_unique'
        `;
        assert.equal(paymentIndex.length, 1);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  } finally {
    await sql.end();
  }
});

test('fictional admin → teacher → parent demo loop stays organization-scoped', async (context) => {
  if (!databaseUrl) return context.skip('DATABASE_URL_DIRECT or DATABASE_URL is not configured');
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  const ids = {
    org: randomUUID(),
    otherOrg: randomUUID(),
    admin: randomUUID(),
    teacher: randomUUID(),
    parent: randomUUID(),
    outsider: randomUUID(),
    student: randomUUID(),
    class: randomUUID(),
    guardianLink: randomUUID(),
    attendance: randomUUID(),
    hifz: randomUUID(),
    tuition: randomUUID(),
    notification: randomUUID(),
  };
  const rollback = new Error('ROLLBACK_TEST');

  try {
    try {
      await sql.begin(async (transaction) => {
        await transaction`
          insert into public.organizations (id, name, slug, type)
          values
            (${ids.org}, 'Fictional Guided Demo School', ${`guided-${ids.org}`}, 'weekend_school'),
            (${ids.otherOrg}, 'Unrelated Fictional School', ${`other-${ids.otherOrg}`}, 'weekend_school')
        `;
        await transaction`
          insert into public.users (id, full_name)
          values
            (${ids.admin}, 'Fictional Administrator'),
            (${ids.teacher}, 'Fictional Teacher'),
            (${ids.parent}, 'Fictional Parent'),
            (${ids.outsider}, 'Unrelated User')
        `;
        await transaction`
          insert into public.memberships (user_id, organization_id, role, status)
          values
            (${ids.admin}, ${ids.org}, 'principal', 'active'),
            (${ids.teacher}, ${ids.org}, 'teacher', 'active'),
            (${ids.parent}, ${ids.org}, 'parent', 'active'),
            (${ids.outsider}, ${ids.otherOrg}, 'parent', 'active')
        `;
        await transaction`
          insert into public.classes (id, organization_id, name, primary_teacher_id)
          values (${ids.class}, ${ids.org}, 'Fictional Quran Class', ${ids.teacher})
        `;

        await transaction.unsafe('set local role authenticated');
        await transaction`select set_config('request.jwt.claim.sub', ${ids.admin}, true)`;
        await transaction`
          insert into public.students (
            id, organization_id, full_name, date_of_birth, enrolled_at, status
          ) values (
            ${ids.student}, ${ids.org}, 'Fictional Student', '2017-01-01', '2026-08-02', 'active'
          )
        `;
        await transaction`
          insert into public.class_enrollments (class_id, student_id)
          values (${ids.class}, ${ids.student})
        `;
        await transaction`
          insert into public.student_guardians (
            id, student_id, guardian_user_id, relationship, is_primary, pays_tuition
          ) values (
            ${ids.guardianLink}, ${ids.student}, ${ids.parent}, 'guardian', true, true
          )
        `;
        await transaction`
          insert into public.tuition_plans (
            id, organization_id, student_id, guardian_user_id,
            amount_cents, currency, frequency, status
          ) values (
            ${ids.tuition}, ${ids.org}, ${ids.student}, ${ids.parent},
            6500, 'USD', 'monthly', 'past_due'
          )
        `;

        await transaction.unsafe('reset role');
        await transaction.unsafe('set local role authenticated');
        await transaction`select set_config('request.jwt.claim.sub', ${ids.teacher}, true)`;
        await transaction`
          insert into public.attendance_records (
            id, organization_id, class_id, student_id,
            session_date, status, recorded_by
          ) values (
            ${ids.attendance}, ${ids.org}, ${ids.class}, ${ids.student},
            '2026-08-02', 'present', ${ids.teacher}
          )
        `;
        await transaction`
          insert into public.hifz_records (
            id, organization_id, student_id, class_id, stream,
            surah_number, ayah_start, ayah_end, session_date, recorded_by
          ) values (
            ${ids.hifz}, ${ids.org}, ${ids.student}, ${ids.class}, 'sabak',
            1, 1, 7, '2026-08-02', ${ids.teacher}
          )
        `;

        await transaction.unsafe('reset role');
        await transaction`
          insert into public.notifications (
            id, organization_id, user_id, type, title, body, link
          ) values (
            ${ids.notification}, ${ids.org}, ${ids.parent}, 'payment_failed',
            'Tuition payment reminder',
            'Fictional Student tuition is past due.',
            ${`/parent/${ids.student}`}
          )
        `;
        await transaction`
          update public.tuition_plans
          set last_reminder_sent_at = '2026-08-02T16:00:00Z'
          where id = ${ids.tuition}
        `;

        await transaction.unsafe('set local role authenticated');
        await transaction`select set_config('request.jwt.claim.sub', ${ids.parent}, true)`;
        const parentStudents = await transaction<{ id: string }[]>`
          select id from public.students where id = ${ids.student}
        `;
        const parentAttendance = await transaction<{ id: string }[]>`
          select id from public.attendance_records where student_id = ${ids.student}
        `;
        const parentHifz = await transaction<{ id: string }[]>`
          select id from public.hifz_records where student_id = ${ids.student}
        `;
        const parentTuition = await transaction<{ id: string }[]>`
          select id from public.tuition_plans where student_id = ${ids.student}
        `;
        const parentReminders = await transaction<{ id: string }[]>`
          select id from public.notifications where user_id = ${ids.parent}
        `;
        assert.equal(parentStudents.length, 1);
        assert.equal(parentAttendance.length, 1);
        assert.equal(parentHifz.length, 1);
        assert.equal(parentTuition.length, 1);
        assert.equal(parentReminders.length, 1);

        await transaction.unsafe('reset role');
        await transaction.unsafe('set local role authenticated');
        await transaction`select set_config('request.jwt.claim.sub', ${ids.outsider}, true)`;
        const leakedStudents = await transaction<{ id: string }[]>`
          select id from public.students where id = ${ids.student}
        `;
        const leakedTuition = await transaction<{ id: string }[]>`
          select id from public.tuition_plans where id = ${ids.tuition}
        `;
        const leakedReminders = await transaction<{ id: string }[]>`
          select id from public.notifications where id = ${ids.notification}
        `;
        assert.equal(leakedStudents.length, 0);
        assert.equal(leakedTuition.length, 0);
        assert.equal(leakedReminders.length, 0);

        await transaction.unsafe('reset role');
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  } finally {
    await sql.end();
  }
});
