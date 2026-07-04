import { env } from '@/env';
import { getAttendanceFollowUp } from '../../actions';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';

const REASON_LABEL: Record<string, string> = {
  sick: 'Sick',
  travel: 'Travel',
  family_emergency: 'Family emergency',
  forgot: 'Forgot',
  other: 'Other',
};

export default async function AttendanceFollowUpPage() {
  const followUps = await getAttendanceFollowUp(env.NEXT_PUBLIC_ORG_ID);

  return (
    <main className="app-main">
      <h1 className="text-h1" style={{ marginTop: 24, marginBottom: 6 }}>Attendance follow-up</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        Students with an absence pattern that may need a check-in — two absences in a row, three
        or more in the last 30 days, or an absence with no reason from a guardian yet.
      </p>

      {followUps.length === 0 ? (
        <EmptyState
          icon="check"
          title="No attendance concerns right now"
          body="Students with repeated absences or unexplained absences will show up here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {followUps.map(f => (
            <div key={f.studentId} className="app-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <Link href={`/admin/students/${f.studentId}`} style={{ fontWeight: 600, color: 'var(--fg)', textDecoration: 'none' }}>
                  {f.studentName}
                </Link>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {f.twoInARow && <span className="badge badge-absent">2 absences in a row</span>}
                  {f.threeIn30Days && <span className="badge badge-late">3+ in 30 days</span>}
                  {f.noResponse && <span className="badge badge-needs_review">No parent response</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {f.recentAbsences.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>{a.sessionDate}</span>
                    <span style={{ color: a.guardianReason ? 'var(--fg)' : '#991b1b' }}>
                      {a.guardianReason
                        ? (REASON_LABEL[a.guardianReason] ?? a.guardianReason) + (a.guardianReasonNote ? ` — "${a.guardianReasonNote}"` : '')
                        : 'No reason given'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
