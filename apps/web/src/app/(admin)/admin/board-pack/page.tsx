import { env } from '@/env';
import Link from 'next/link';
import { getBoardPack } from '../../actions';
import { ExportButton } from '@/components/ui/export-button';
import { EmptyState } from '@/components/ui/empty-state';

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function BoardPackPage() {
  const d = await getBoardPack(env.NEXT_PUBLIC_ORG_ID);

  const kpis = [
    { label: 'Total Students', value: d.totalStudents },
    { label: 'Active Classes', value: d.activeClasses },
    { label: 'Active Teachers', value: d.activeTeachers },
    { label: 'Attendance Rate', value: `${d.attendanceRatePct}%` },
    { label: 'Hifz Milestones', value: d.milestonesThisMonth, sub: d.monthLabel },
    { label: 'Tuition Collected', value: fmt(d.collectedThisMonthCents), sub: d.monthLabel },
    { label: 'Tuition Outstanding', value: fmt(d.outstandingCents) },
    { label: 'Failed / Past Due', value: d.failedPastDuePaymentsCount },
  ];

  return (
    <main className="app-main">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <h1 className="text-h1">Board pack</h1>
      </div>
      <p className="text-body" style={{ marginBottom: 24 }}>
        A snapshot for principals and board members — {d.monthLabel}.
      </p>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 32 }}>
        {kpis.map(k => (
          <div key={k.label} className="app-card">
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 6 }}>
              {k.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)' }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Repeated absences */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
          Students with repeated absences ({d.repeatedAbsenceStudents.length})
        </h2>
        {d.repeatedAbsenceStudents.length === 0 ? (
          <EmptyState icon="check" title="No repeated absences" body="No student currently has two absences in a row or three or more in the last 30 days." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.repeatedAbsenceStudents.map(s => (
              <Link key={s.studentId} href={`/admin/students/${s.studentId}`} className="app-card-link">
                <div className="app-card is-interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{s.studentName}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {s.twoInARow && <span className="badge badge-absent">2 in a row</span>}
                    {s.threeIn30Days && <span className="badge badge-late">3+ in 30 days</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Parent engagement */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Parent engagement</h2>
        <div className="app-card" style={{ fontSize: 14 }}>
          {d.notificationReadRatePct === null ? (
            <span style={{ color: 'var(--muted)' }}>No notifications sent yet.</span>
          ) : (
            <span>
              <strong style={{ color: 'var(--fg)' }}>{d.notificationReadRatePct}%</strong> of in-app
              notifications have been opened by guardians.
            </span>
          )}
        </div>
      </div>

      {/* Recent adab wins */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Recent adab wins</h2>
        {d.adabHighlights.length === 0 ? (
          <EmptyState icon="sparkle" title="No adab highlights yet" body="Recent praise moments from teachers will appear here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.adabHighlights.map(n => (
              <div key={n.id} className="app-card" style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{n.student?.fullName ?? 'Student'}</span>
                {n.category && <span className="badge badge-praise" style={{ marginLeft: 8 }}>{n.category}</span>}
                <p style={{ margin: '6px 0 0', color: 'var(--fg-2)' }}>&ldquo;{n.content}&rdquo;</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent contact-form leads */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Recent inquiries</h2>
        {d.recentLeads.length === 0 ? (
          <EmptyState icon="msg" title="No recent inquiries" body="New contact-form submissions will show up here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.recentLeads.map(l => (
              <div key={l.id} className="app-card" style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{l.schoolName}</span>
                <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{l.contactName} · {l.email}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exports */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Export for the board packet</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <ExportButton href="/api/admin/exports/students" label="↓ Roster CSV" />
          <ExportButton href="/api/admin/exports/attendance" label="↓ Attendance CSV" />
          <ExportButton href="/api/admin/exports/payments" label="↓ Tuition Ledger CSV" />
          <ExportButton href="/api/admin/exports/hifz" label="↓ Hifz Progress CSV" />
        </div>
      </div>
    </main>
  );
}
