import { env } from '@/env';
import { getAdminTuition } from '../../actions';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { ExportButton } from '@/components/ui/export-button';

const statusBadge: Record<string, string> = {
  active: 'badge badge-present',
  pending_payment: 'badge badge-late',
  past_due: 'badge badge-absent',
  cancelled: 'badge badge-absent',
};

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default async function TuitionPage() {
  const students = await getAdminTuition(env.NEXT_PUBLIC_ORG_ID);

  const withPlan = students.filter(s => s.tuitionPlans.length > 0);
  const withoutPlan = students.filter(s => s.tuitionPlans.length === 0);

  return (
    <main className="app-main">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 20px' }}>
        <h1 className="text-h1">Tuition</h1>
        <ExportButton href="/api/admin/exports/payments" label="↓ Export ledger (CSV)" />
      </div>

      {withPlan.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
            Active plans ({withPlan.length})
          </h2>
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Student', 'Guardian', 'Amount', 'Status', 'Last payment', 'Receipt'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withPlan.map(s => {
                  const plan = s.tuitionPlans[0]!;
                  const lastPayment = plan.payments[0];
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 8px' }}>
                        <Link href={`/admin/tuition/${s.id}`} style={{ color: 'var(--fg)', fontWeight: 500, textDecoration: 'none' }}>
                          {s.fullName}
                        </Link>
                      </td>
                      <td style={{ padding: '8px 8px', color: 'var(--muted)' }}>
                        {plan.guardian?.fullName ?? plan.guardian?.email ?? '—'}
                      </td>
                      <td style={{ padding: '8px 8px', color: 'var(--fg)' }}>
                        {formatAmount(plan.amountCents, plan.currency)}
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                          {' '}/ {plan.frequency === 'one_time' ? 'one time' : plan.frequency}
                        </span>
                        {plan.baseAmountCents && (
                          <span className="badge badge-present" style={{ marginLeft: 6, fontSize: 10 }}>discount</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 8px' }}>
                        <span className={statusBadge[plan.status] ?? 'badge'} style={{ textTransform: 'capitalize' }}>
                          {plan.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '8px 8px', color: 'var(--muted)' }}>
                        {lastPayment?.paidAt ? new Date(lastPayment.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '8px 8px' }}>
                        {lastPayment?.receiptUrl ? (
                          <a href={lastPayment.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13 }}>
                            View
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
