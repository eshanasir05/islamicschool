import { env } from '@/env';
import { getFamilyProfile } from '../../../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

const statusBadge: Record<string, string> = {
  active: 'badge badge-present',
  pending_payment: 'badge badge-late',
  past_due: 'badge badge-absent',
};

type Props = { params: Promise<{ guardianUserId: string }> };

export default async function FamilyProfilePage({ params }: Props) {
  const { guardianUserId } = await params;
  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const family = await getFamilyProfile(guardianUserId, orgId);
  if (!family) notFound();

  const { guardian, coGuardians, students, tuitionPlans, recentNotes, recentHomework, recentHifz, attendanceConcerns } = family;

  return (
    <main className="app-main">
      <Breadcrumb items={[{ label: 'Parents', href: '/admin/parents' }, { label: guardian.fullName }]} />
      <h1 className="text-h1" style={{ marginBottom: 6 }}>{guardian.fullName}&apos;s family</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>{guardian.email}</p>

      {/* Guardians */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Guardians</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="app-card" style={{ fontSize: 14 }}>
            <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{guardian.fullName}</span>
            <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{guardian.email}</span>
          </div>
          {coGuardians.map(g => (
            <Link key={g.id} href={`/admin/families/${g.id}`} className="app-card-link">
              <div className="app-card is-interactive" style={{ fontSize: 14 }}>
                <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{g.fullName}</span>
                <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{g.email}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Students */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
          Students ({students.length})
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {students.map(s => (
            <Link key={s.id} href={`/admin/students/${s.id}`} className="app-card-link">
              <div className="app-card is-interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{s.fullName}</span>
                <span style={{ color: 'var(--muted)' }}>{s.className}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Attendance concerns */}
      {attendanceConcerns.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Attendance concerns</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attendanceConcerns.map(c => (
              <div key={c.studentId} className="app-card" style={{ fontSize: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{c.studentName}</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {c.twoInARow && <span className="badge badge-absent">2 in a row</span>}
                    {c.threeIn30Days && <span className="badge badge-late">3+ in 30 days</span>}
                    {c.noResponse && <span className="badge badge-needs_review">No response</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tuition plans */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Tuition plans</h2>
        {tuitionPlans.length === 0 ? (
          <EmptyState icon="money" title="No active tuition plans" body="This family has no active or pending tuition plans." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tuitionPlans.map(p => (
              <div key={p.id} className="app-card" style={{ fontSize: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{p.student?.fullName ?? 'Student'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>
                      {formatAmount(p.amountCents, p.currency)}
                      {p.baseAmountCents && <span className="badge badge-present" style={{ marginLeft: 6, fontSize: 10 }}>discount</span>}
                    </span>
                    <span className={statusBadge[p.status] ?? 'badge'} style={{ textTransform: 'capitalize' }}>{p.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Recent activity</h2>
        {recentNotes.length === 0 && recentHomework.length === 0 && recentHifz.length === 0 ? (
          <EmptyState icon="activity" title="No recent activity yet" body="Notes, homework, and hifz updates for this family's students will appear here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentNotes.map(n => (
              <div key={`note-${n.id}`} className="app-card" style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>{n.student?.fullName ?? 'Student'} · </span>
                <span style={{ textTransform: 'capitalize' }}>{n.noteType}</span>
                {n.category && <span> · {n.category}</span>}
              </div>
            ))}
            {recentHomework.map(h => (
              <div key={`hw-${h.id}`} className="app-card" style={{ fontSize: 13 }}>
                Homework: {h.title} — due {h.dueDate}
              </div>
            ))}
            {recentHifz.map(h => (
              <div key={`hifz-${h.id}`} className="app-card" style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>{h.student?.fullName ?? 'Student'} · </span>
                Hifz on {h.sessionDate} — {h.status.replace('_', ' ')}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
