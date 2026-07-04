import { env } from '@/env';
import {
  getAdminStudent,
  setStudentStatus,
  linkGuardian,
  unlinkGuardian,
} from '../../../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { ToastOnParam } from '@/components/ui/toast-on-param';
import { SubmitButton } from '@/components/ui/submit-button';

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Al-Imran', 4: 'An-Nisa',
  5: 'Al-Maidah', 6: 'Al-Anam', 7: 'Al-Araf', 8: 'Al-Anfal',
  9: 'At-Tawbah', 10: 'Yunus', 11: 'Hud', 12: 'Yusuf',
  36: 'Ya-Sin', 67: 'Al-Mulk', 78: 'An-Naba', 112: 'Al-Ikhlas',
  113: 'Al-Falaq', 114: 'An-Nas',
};
function surahName(n: number) { return SURAH_NAMES[n] ?? `Surah ${n}`; }

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  marginBottom: 5,
};

type Props = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ notice?: string }>;
};

export default async function StudentDetailPage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const { notice } = await searchParams;
  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const { student, attendance, hifz, milestones, noteCount, retentionFlags } = await getAdminStudent(studentId, orgId);
  if (!student) notFound();

  const dob = student.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';
  const className = student.enrollments[0]?.class?.name ?? 'Not enrolled';

  // Inline server actions
  const archiveAction = async () => {
    'use server';
    await setStudentStatus(studentId, env.NEXT_PUBLIC_ORG_ID, 'inactive');
  };
  const restoreAction = async () => {
    'use server';
    await setStudentStatus(studentId, env.NEXT_PUBLIC_ORG_ID, 'active');
  };
  const unlinkAction = async (formData: FormData) => {
    'use server';
    const linkId = formData.get('linkId') as string;
    if (!linkId) return;
    await unlinkGuardian(linkId, studentId);
  };
  const linkAction = async (formData: FormData) => {
    'use server';
    const email = (formData.get('email') as string)?.trim();
    const relationship = (formData.get('relationship') as string) ?? '';
    const isPrimary = formData.get('isPrimary') === 'on';
    const receivesNotifications = formData.get('receivesNotifications') === 'on';
    if (!email) return;
    await linkGuardian(studentId, env.NEXT_PUBLIC_ORG_ID, email, relationship, isPrimary, receivesNotifications);
  };

  return (
    <main className="app-main">
      <ToastOnParam notice={notice} />
      <Breadcrumb
        items={[
          { label: 'Students', href: '/admin/students' },
          { label: student.fullName },
        ]}
      />

      {/* Profile card */}
      <div className="app-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div style={{ fontWeight: 600, fontSize: 20, color: 'var(--fg)' }}>{student.fullName}</div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link
              href={`/admin/students/${studentId}/edit`}
              className="btn btn-ghost"
              style={{ fontSize: 13, padding: '4px 12px', textDecoration: 'none' }}
            >
              Edit
            </Link>
            {student.status === 'active' ? (
              <form action={archiveAction}>
                <ConfirmSubmit
                  label="Archive"
                  title="Archive this student?"
                  body="Archived students are hidden from active rosters and reports. You can restore them at any time."
                  confirmLabel="Archive student"
                  variant="danger"
                  className="btn btn-ghost"
                  buttonStyle={{ fontSize: 13, padding: '4px 12px', color: 'var(--muted)' }}
                />
              </form>
            ) : (
              <form action={restoreAction}>
                <button type="submit" className="btn btn-ghost" style={{ fontSize: 13, padding: '4px 12px' }}>
                  Restore
                </button>
              </form>
            )}
          </div>
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>
          {className} · DOB: {dob}
          {student.status !== 'active' && (
            <span className="badge badge-absent" style={{ marginLeft: 8 }}>Inactive</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--fg)' }}>{attendance.length}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Sessions</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--fg)' }}>{hifz.length}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Hifz records</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--fg)' }}>{noteCount}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Notes</div>
          </div>
        </div>
      </div>

      {/* Guardians */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Guardians</h2>
        {student.guardians.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {student.guardians.map(g => (
              <div key={g.id} className="app-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--fg)' }}>{g.guardian?.fullName ?? '—'}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                    {g.relationship ?? 'Guardian'} · {g.guardian?.email ?? '—'}
                    {g.isPrimary && <span className="badge badge-present" style={{ marginLeft: 6, fontSize: 11 }}>Primary</span>}
                  </div>
                </div>
                <form action={unlinkAction}>
                  <input type="hidden" name="linkId" value={g.id} />
                  <ConfirmSubmit
                    label="Unlink"
                    title="Unlink this guardian?"
                    body={`${g.guardian?.fullName ?? 'This guardian'} will lose access to this student's feed. You can re-link them later.`}
                    confirmLabel="Unlink guardian"
                    variant="danger"
                    className="btn btn-ghost"
                    buttonStyle={{ fontSize: 12, padding: '3px 10px', color: 'var(--muted)', height: 'auto' }}
                  />
                </form>
              </div>
            ))}
          </div>
        )}

        {/* Link guardian form */}
        <form action={linkAction}>
          <div className="app-card">
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 10 }}>
              Link guardian
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Email address</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="parent@example.com"
                  className="sign-in-input"
                  style={{ marginBottom: 0 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Relationship (optional)</label>
                <select name="relationship" className="sign-in-input" style={{ marginBottom: 0 }}>
                  <option value="">— Select —</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Guardian</option>
                  <option value="grandparent">Grandparent</option>
                  <option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--fg)', cursor: 'pointer' }}>
                  <input type="checkbox" name="isPrimary" /> Primary contact
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--fg)', cursor: 'pointer' }}>
                  <input type="checkbox" name="receivesNotifications" defaultChecked /> Receives notifications
                </label>
              </div>
              <SubmitButton className="btn btn-accent" style={{ width: '100%' }} pendingLabel="Linking…">
                Link guardian
              </SubmitButton>
            </div>
          </div>
        </form>
      </div>

      {/* Attendance history */}
      {attendance.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>
            Attendance history
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {attendance.map(a => (
              <div
                key={a.id}
                className="app-card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}
              >
                <span style={{ color: 'var(--muted)' }}>{a.sessionDate}</span>
                <span className={`badge badge-${a.status}`} style={{ textTransform: 'capitalize' }}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hifz milestones */}
      {milestones.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Hifz milestones</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {milestones.map(m => (
              <div key={m.id} className="app-card" style={{ fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{m.label}</span>
                  <span style={{ color: 'var(--muted)' }}>{m.achievedDate}</span>
                </div>
                {m.teacherNotes && (
                  <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{m.teacherNotes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hifz retention flags */}
      {(retentionFlags.noReviewInWeeks || retentionFlags.repeatedWeak || retentionFlags.noUpdateInWeeks) && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {retentionFlags.noUpdateInWeeks && (
            <div style={{ fontSize: 13, color: '#991b1b', background: '#fee2e2', borderRadius: 8, padding: '8px 12px' }}>
              No hifz update in over 3 weeks.
            </div>
          )}
          {retentionFlags.noReviewInWeeks && !retentionFlags.noUpdateInWeeks && (
            <div style={{ fontSize: 13, color: '#92400e', background: 'var(--warn-soft)', borderRadius: 8, padding: '8px 12px' }}>
              No sabqi/manzil review recorded in over 3 weeks.
            </div>
          )}
          {retentionFlags.repeatedWeak && (
            <div style={{ fontSize: 13, color: '#92400e', background: 'var(--warn-soft)', borderRadius: 8, padding: '8px 12px' }}>
              Repeated weak or needs-review status in recent sessions.
            </div>
          )}
        </div>
      )}

      {/* Hifz records */}
      {hifz.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Hifz records</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {hifz.map(h => (
              <div
                key={h.id}
                className="app-card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, flexWrap: 'wrap', gap: 6 }}
              >
                <span style={{ color: 'var(--muted)' }}>{h.sessionDate}</span>
                <span style={{ color: 'var(--fg)' }}>
                  {surahName(h.surahNumber)} {h.ayahStart}–{h.ayahEnd}
                  <span style={{ color: 'var(--muted)', marginLeft: 6, textTransform: 'capitalize' }}>· {h.stream}</span>
                </span>
                <span className={`badge badge-${h.status}`} style={{ textTransform: 'capitalize' }}>{h.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
