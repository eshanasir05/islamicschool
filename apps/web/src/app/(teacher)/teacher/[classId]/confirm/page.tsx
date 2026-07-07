import { db, schema } from '@/lib/db';
import { and, eq, isNull } from 'drizzle-orm';
import { env } from '@/env';
import Link from 'next/link';
import { Stepper } from '@skooly/ui';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { LogoMark } from '@/components/ui/logo';
import { notifyParents, eraseClassSession } from '../../../actions';

type Props = { params: Promise<{ classId: string }>; searchParams: Promise<{ sent?: string }> };

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Al-Imran', 4: 'An-Nisa',
  5: 'Al-Maidah', 36: 'Ya-Sin', 67: 'Al-Mulk', 112: 'Al-Ikhlas',
};

function surahName(n: number) {
  return SURAH_NAMES[n] ?? `Surah ${n}`;
}

export default async function ConfirmPage({ params, searchParams }: Props) {
  const { classId } = await params;
  const { sent } = await searchParams;
  const STEPS = [
    { label: 'Attendance', href: `/teacher/${classId}/attendance` },
    { label: 'Hifz', href: `/teacher/${classId}/hifz` },
    { label: 'Notes', href: `/teacher/${classId}/notes` },
    { label: 'Confirm', href: `/teacher/${classId}/confirm` },
  ];
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
        isNull(schema.studentNotes.deletedAt),
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

  const eraseAction = async () => {
    'use server';
    await eraseClassSession(classId, today);
  };

  if (sent) {
    return (
      <main className="app-main">
        <div className="success-screen" style={{ paddingTop: 64 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <LogoMark size={48} />
          </div>
          <h2>Class session complete!</h2>
          <p>Parents have been notified. JazakAllah khair.</p>
          <div className="success-actions">
            <Link href="/teacher" className="btn btn-accent">Back to dashboard</Link>
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

      <div className="app-card confirm-section">
        <div className="confirm-section-title">Attendance ({attendance.length} students)</div>
        {attendance.map(r => (
          <div key={r.id} className="confirm-row">
            <span>{r.student?.fullName}</span>
            <span className={`badge badge-${r.status}`} style={{ textTransform: 'capitalize' }}>{r.status}</span>
          </div>
        ))}
      </div>

      <div className="app-card confirm-section">
        <div className="confirm-section-title">Hifz ({hifz.length} entries)</div>
        {hifz.map(h => (
          <div key={h.id} className="confirm-row">
            <span>{h.student?.fullName}</span>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
              {surahName(h.surahNumber)} {h.ayahStart}–{h.ayahEnd} · <span style={{ textTransform: 'capitalize' }}>{h.stream}</span>
              {h.audioUrl && <span style={{ fontSize: 11, color: 'var(--accent-700)', marginLeft: 4 }}>(audio)</span>}
            </span>
          </div>
        ))}
      </div>

      {todayNotes.length > 0 && (
        <div className="app-card confirm-section">
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
        <ConfirmSubmit
          label="Send to parents"
          title="Send today's updates to parents?"
          body="Every guardian with notifications enabled will be emailed immediately. This can't be undone."
          confirmLabel="Yes, send now"
          className="btn btn-accent btn-block"
        />
      </form>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <form action={eraseAction}>
          <ConfirmSubmit
            label="Erase class session"
            title="Erase today's class session?"
            body="This permanently deletes today's attendance, hifz, and notes for this class so you can start over. This can't be undone."
            confirmLabel="Yes, erase everything"
            variant="danger"
            className="btn btn-ghost"
            buttonStyle={{ fontSize: 11, padding: '2px 8px', color: 'var(--subtle)' }}
          />
        </form>
      </div>
    </main>
  );
}
