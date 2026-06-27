import { db, schema } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { env } from '@/env';
import Link from 'next/link';
import { Stepper } from '@skooly/ui';
import { notifyParents } from '../../../actions';

type Props = { params: Promise<{ classId: string }>; searchParams: Promise<{ sent?: string }> };

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Al-Imran', 4: 'An-Nisa',
  5: 'Al-Maidah', 36: 'Ya-Sin', 67: 'Al-Mulk', 112: 'Al-Ikhlas',
};

function surahName(n: number) {
  return SURAH_NAMES[n] ?? `Surah ${n}`;
}

const STEPS = [{ label: 'Attendance' }, { label: 'Hifz' }, { label: 'Notes' }, { label: 'Confirm' }];

export default async function ConfirmPage({ params, searchParams }: Props) {
  const { classId } = await params;
  const { sent } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const [attendance, hifz, notes, cls] = await Promise.all([
    db.query.attendanceRecords.findMany({
      where: and(
        eq(schema.attendanceRecords.classId, classId),
        eq(schema.attendanceRecords.sessionDate, today),
        eq(schema.attendanceRecords.organizationId, orgId),
      ),
      with: { student: true },
    }),
    db.query.hifzRecords.findMany({
      where: and(
        eq(schema.hifzRecords.classId, classId),
        eq(schema.hifzRecords.sessionDate, today),
        eq(schema.hifzRecords.organizationId, orgId),
      ),
      with: { student: true },
    }),
    db.query.studentNotes.findMany({
      where: and(
        eq(schema.studentNotes.classId, classId),
        eq(schema.studentNotes.organizationId, orgId),
      ),
      with: { student: true },
      orderBy: (n, { desc }) => desc(n.createdAt),
    }),
    db.query.classes.findFirst({ where: eq(schema.classes.id, classId) }),
  ]);

  const todayNotes = notes.filter(n => n.createdAt && new Date(n.createdAt).toISOString().slice(0, 10) === today);

  const notifyAction = async () => {
    'use server';
    await notifyParents(classId, today);
  };

  if (sent) {
    return (
      <main className="app-main">
        <div className="success-screen" style={{ paddingTop: 64 }}>
          <div className="success-icon">✅</div>
          <h2>Class wrapped!</h2>
          <p>Parents have been notified. JazakAllah khair.</p>
          <div className="success-actions">
            <Link href="/teacher" className="btn btn-ghost">Wrap another class</Link>
            <Link href="/parent" className="btn btn-accent">View as parent →</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-main">
      <div style={{ marginTop: 24 }}>
        <Stepper steps={STEPS} current={3} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: 'var(--fg)' }}>
        Review &amp; confirm
      </h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
        {cls?.name} · {today}
      </p>

      <div className="confirm-section">
        <div className="confirm-section-title">Attendance ({attendance.length} students)</div>
        {attendance.map(r => (
          <div key={r.id} className="confirm-row">
            <span>{r.student?.fullName}</span>
            <span className={`badge badge-${r.status}`} style={{ textTransform: 'capitalize' }}>{r.status}</span>
          </div>
        ))}
      </div>

      <div className="confirm-section">
        <div className="confirm-section-title">Hifz ({hifz.length} entries)</div>
        {hifz.map(h => (
          <div key={h.id} className="confirm-row">
            <span>{h.student?.fullName}</span>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
              {surahName(h.surahNumber)} {h.ayahStart}–{h.ayahEnd} · <span style={{ textTransform: 'capitalize' }}>{h.stream}</span>
              {h.audioUrl && ' 🎙'}
            </span>
          </div>
        ))}
      </div>

      {todayNotes.length > 0 && (
        <div className="confirm-section">
          <div className="confirm-section-title">Notes ({todayNotes.length})</div>
          {todayNotes.map(n => (
            <div key={n.id} className="confirm-row">
              <span>{n.student?.fullName}</span>
              <span style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'right', maxWidth: '60%' }}>
                {n.category && <strong>{n.category}: </strong>}{n.content.slice(0, 60)}{n.content.length > 60 ? '…' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      <form action={notifyAction} style={{ marginTop: 32 }}>
        <button type="submit" className="btn btn-accent" style={{ width: '100%' }}>
          Send to parents
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <Link href="/teacher" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
          Skip &amp; finish
        </Link>
      </div>
    </main>
  );
}
