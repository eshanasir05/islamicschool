import { env } from '@/env';
import { getAdminStudent } from '../../../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Al-Imran', 4: 'An-Nisa',
  5: 'Al-Maidah', 36: 'Ya-Sin', 67: 'Al-Mulk', 112: 'Al-Ikhlas',
};
function surahName(n: number) { return SURAH_NAMES[n] ?? `Surah ${n}`; }

type Props = { params: Promise<{ studentId: string }> };

export default async function StudentDetailPage({ params }: Props) {
  const { studentId } = await params;
  const { student, attendance, hifz, noteCount } = await getAdminStudent(studentId, env.NEXT_PUBLIC_ORG_ID);

  if (!student) notFound();

  const dob = student.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';
  const className = student.enrollments[0]?.class?.name ?? 'Not enrolled';

  return (
    <main className="app-main">
      <Link href="/admin/students" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', display: 'inline-block', marginTop: 16, marginBottom: 16 }}>
        ← All students
      </Link>

      <div className="app-card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 20, color: 'var(--fg)', marginBottom: 4 }}>{student.fullName}</div>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>
          {className} · DOB: {dob}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
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

      {student.guardians.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Guardians</h2>
          {student.guardians.map(g => (
            <div key={g.id} className="app-card" style={{ marginBottom: 8, fontSize: 14 }}>
              <div style={{ fontWeight: 500, color: 'var(--fg)' }}>{g.guardian?.fullName ?? '—'}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                {g.relationship} · {g.guardian?.email ?? '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {attendance.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Recent attendance</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {attendance.map(a => (
              <div key={a.id} className="app-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                <span style={{ color: 'var(--muted)' }}>{a.sessionDate}</span>
                <span className={`badge badge-${a.status}`} style={{ textTransform: 'capitalize' }}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hifz.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Recent hifz</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {hifz.map(h => (
              <div key={h.id} className="app-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                <span style={{ color: 'var(--muted)' }}>{h.sessionDate}</span>
                <span style={{ color: 'var(--fg)' }}>
                  {surahName(h.surahNumber)} {h.ayahStart}–{h.ayahEnd}
                  <span style={{ color: 'var(--muted)', marginLeft: 6, textTransform: 'capitalize' }}>· {h.stream}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
