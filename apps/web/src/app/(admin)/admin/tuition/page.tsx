import { env } from '@/env';
import { getAdminTuition } from '../../actions';
import Link from 'next/link';

const statusStyle: Record<string, React.CSSProperties> = {
  active: { color: 'var(--accent-700)', fontWeight: 600 },
  pending_payment: { color: '#b45309' },
  past_due: { color: '#991b1b' },
  cancelled: { color: 'var(--muted)' },
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
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>Tuition</h1>
      </div>

      {withPlan.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
            Active plans ({withPlan.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {withPlan.map(s => {
              const plan = s.tuitionPlans[0]!;
              const lastPayment = plan.payments[0];
              return (
                <Link
                  key={s.id}
                  href={`/admin/tuition/${s.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div className="app-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>{s.fullName}</div>
                      <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                        {formatAmount(plan.amountCents, plan.currency)} / {plan.frequency === 'one_time' ? 'one time' : plan.frequency}
                        {lastPayment ? ` · Last paid ${lastPayment.paidAt ? new Date(lastPayment.paidAt).toLocaleDateString() : '—'}` : ''}
                      </div>
                    </div>
                    <div style={{ ...statusStyle[plan.status] ?? {}, fontSize: 13, textTransform: 'capitalize' }}>
                      {plan.status.replace('_', ' ')}
                    </div>
                  </div>
                </Link>
              );
            })}
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
              <Link
                key={s.id}
                href={`/admin/tuition/${s.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="app-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                  <div style={{ fontWeight: 500, color: 'var(--fg)' }}>{s.fullName}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Set up plan →</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {students.length === 0 && (
        <div className="feed-empty">
          <p>No active students. Add students first.</p>
        </div>
      )}
    </main>
  );
}
