import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAdminInsights } from '@/app/(admin)/actions';
import { env } from '@/env';

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active:          { label: 'Active',          color: '#166534', bg: '#dcfce7' },
  pending_payment: { label: 'Pending Payment',  color: '#92400e', bg: '#fef3c7' },
  past_due:        { label: 'Past Due',         color: '#991b1b', bg: '#fee2e2' },
  cancelled:       { label: 'Cancelled',        color: '#374151', bg: '#f3f4f6' },
};

const ATTENDANCE_COLORS: Record<string, string> = {
  present: '#166534',
  late:    '#92400e',
  absent:  '#991b1b',
  excused: '#374151',
};

export default async function InsightsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const orgId = env.NEXT_PUBLIC_ORG_ID;
  const d = await getAdminInsights(orgId);

  const kpis = [
    { label: 'Total Students',      value: d.totalStudents,        sub: 'active',              accent: false },
    { label: 'Active Teachers',     value: d.activeTeachers,       sub: 'members',             accent: false },
    { label: 'Active Parents',      value: d.activeParents,        sub: 'guardians',           accent: false },
    { label: 'Attendance Rate',     value: `${d.attendanceRatePct}%`, sub: `${d.monthLabel}`, accent: d.attendanceRatePct >= 80 },
    { label: 'Collected This Month',value: fmt(d.collectedThisMonthCents), sub: `All time: ${fmt(d.collectedAllTimeCents)}`, accent: true },
    { label: 'Outstanding',         value: fmt(d.outstandingCents), sub: 'pending + past due', accent: d.outstandingCents > 0 },
    { label: 'Pending Plans',       value: d.pendingCount,          sub: 'awaiting payment',   accent: d.pendingCount > 0 },
  ];

  const totalPlans = d.planStatusBreakdown.reduce((s, p) => s + p.count, 0);

  return (
    <main className="app-main">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--fg)' }}>Insights</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{d.monthLabel} · org-level analytics</p>
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 32 }}>
        {kpis.map(k => (
          <div
            key={k.label}
            className="app-card"
            style={{ padding: '16px 18px' }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 8 }}>
              {k.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.accent ? 'var(--accent)' : 'var(--fg)', lineHeight: 1, marginBottom: 4 }}>
              {k.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Two-column section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, alignItems: 'start' }}>

        {/* Plan status breakdown */}
        <div className="app-card" style={{ padding: '20px 22px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', margin: '0 0 16px' }}>Plan Status Breakdown</h2>
          {d.planStatusBreakdown.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>No tuition plans yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {d.planStatusBreakdown
                .slice()
                .sort((a, b) => b.count - a.count)
                .map(p => {
                  const meta = STATUS_LABELS[p.status] ?? { label: p.status, color: '#374151', bg: '#f3f4f6' };
                  const pct = totalPlans > 0 ? Math.round((p.count / totalPlans) * 100) : 0;
                  return (
                    <div key={p.status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{meta.label}</span>
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                          {p.count} plan{p.count !== 1 ? 's' : ''} · {fmt(p.totalCents)}
                        </span>
                      </div>
                      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{pct}%</div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="app-card" style={{ padding: '20px 22px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', margin: '0 0 16px' }}>Recent Payments</h2>
          {d.recentPayments.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>No payments recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.recentPayments.map(p => (
                <div key={p.paymentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{p.studentName}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {p.payerName} · {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{fmt(p.amountCents)}</div>
                    {p.receiptUrl && (
                      <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
                        Receipt ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attendance by class */}
      <div className="app-card" style={{ padding: '20px 22px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', margin: '0 0 16px' }}>
          Attendance by Class — {d.monthLabel}
        </h2>
        {d.classSummary.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>No attendance records this month.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Class', 'Present', 'Late', 'Absent', 'Excused', 'Total', 'Rate'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Class' ? 'left' : 'right', fontWeight: 600, color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.classSummary.map(c => {
                  const total = c.present + c.late + c.absent + c.excused;
                  const rate = total > 0 ? Math.round((c.present / total) * 100) : 0;
                  return (
                    <tr key={c.className} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 10px', fontWeight: 500, color: 'var(--fg)' }}>{c.className}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: ATTENDANCE_COLORS.present }}>{c.present}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: ATTENDANCE_COLORS.late }}>{c.late}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: ATTENDANCE_COLORS.absent }}>{c.absent}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: ATTENDANCE_COLORS.excused }}>{c.excused}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--muted)' }}>{total}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 99,
                          fontSize: 12, fontWeight: 600,
                          background: rate >= 80 ? '#dcfce7' : rate >= 60 ? '#fef3c7' : '#fee2e2',
                          color: rate >= 80 ? '#166534' : rate >= 60 ? '#92400e' : '#991b1b',
                        }}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
