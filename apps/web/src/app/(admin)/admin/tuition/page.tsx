import { env } from '@/env';
import { getAdminTuition, sendTuitionReminders, sendSingleTuitionReminder } from '../../actions';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { ExportButton } from '@/components/ui/export-button';
import { SubmitButton } from '@/components/ui/submit-button';
import { ToastOnParam } from '@/components/ui/toast-on-param';

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

type Props = { searchParams: Promise<{ notice?: string }> };

export default async function TuitionPage({ searchParams }: Props) {
  const { notice } = await searchParams;
  const students = await getAdminTuition(env.NEXT_PUBLIC_ORG_ID);

  const withPlan = students.filter(s => s.tuitionPlans.length > 0);
  const withoutPlan = students.filter(s => s.tuitionPlans.length === 0);
  const pastDueCount = withPlan.filter(s => s.tuitionPlans[0]!.status === 'past_due').length;

  const sendAllAction = async () => {
    'use server';
    await sendTuitionReminders(env.NEXT_PUBLIC_ORG_ID);
  };

  return (
    <main className="app-main">
      <ToastOnParam notice={notice} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 20px', flexWrap: 'wrap', gap: 10 }}>
        <h1 className="text-h1">Tuition</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {pastDueCount > 0 && (
            <form action={sendAllAction}>
              <SubmitButton className="btn btn-ghost" pendingLabel="Sending…">
                Send reminders ({pastDueCount})
              </SubmitButton>
            </form>
          )}
          <ExportButton href="/api/admin/exports/payments" label="↓ Export ledger (CSV)" />
        </div>
      </div>

      {withPlan.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
            Active plans ({withPlan.length})
          </h2>
          <table className="rtable">
            <thead>
              <tr>
                {['Student', 'Guardian', 'Amount', 'Status', 'Last payment', 'Receipt', 'Reminder'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withPlan.map(s => {
                const plan = s.tuitionPlans[0]!;
                const lastPayment = plan.payments[0];
                const sendOneAction = async () => {
                  'use server';
                  await sendSingleTuitionReminder(plan.id, env.NEXT_PUBLIC_ORG_ID);
                };
                return (
                  <tr key={s.id}>
                    <td data-label="Student">
                      <Link href={`/admin/tuition/${s.id}`} style={{ color: 'var(--fg)', fontWeight: 500, textDecoration: 'none' }}>
                        {s.fullName}
                      </Link>
                    </td>
                    <td data-label="Guardian" style={{ color: 'var(--muted)' }}>
                      {plan.guardian?.fullName ?? plan.guardian?.email ?? '—'}
                    </td>
                    <td data-label="Amount">
                      {formatAmount(plan.amountCents, plan.currency)}
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                        {' '}/ {plan.frequency === 'one_time' ? 'one time' : plan.frequency}
                      </span>
                      {plan.baseAmountCents && (
                        <span className="badge badge-discount" style={{ marginLeft: 6, fontSize: 10 }}>discount</span>
                      )}
                    </td>
                    <td data-label="Status">
                      <span className={`badge badge-${plan.status}`} style={{ textTransform: 'capitalize' }}>
                        {plan.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td data-label="Last payment" style={{ color: 'var(--muted)' }}>
                      {lastPayment?.paidAt ? new Date(lastPayment.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td data-label="Receipt">
                      {lastPayment?.receiptUrl ? (
                        <a href={lastPayment.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13 }}>
                          View
                        </a>
                      ) : '—'}
                    </td>
                    <td data-label="Reminder">
                      {plan.status === 'past_due' ? (
                        <form action={sendOneAction}>
                          <SubmitButton className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} pendingLabel="Sending…">
                            Send
                          </SubmitButton>
                          {plan.lastReminderSentAt && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                              Last sent {new Date(plan.lastReminderSentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </form>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {withoutPlan.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
            No plan ({withoutPlan.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {withoutPlan.map(s => (
              <Link key={s.id} href={`/admin/tuition/${s.id}`} className="app-card-link">
                <div className="app-card is-interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                  <div style={{ fontWeight: 500, color: 'var(--fg)' }}>{s.fullName}</div>
                  <div style={{ fontSize: 13, color: 'var(--accent-700)' }}>Set up plan →</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {students.length === 0 && (
        <EmptyState
          icon="money"
          title="No students to bill yet"
          body="Add students first, then set up a tuition plan and send parents a secure Stripe checkout link."
          cta={{ label: 'Go to Students', href: '/admin/students' }}
        />
      )}
    </main>
  );
}
