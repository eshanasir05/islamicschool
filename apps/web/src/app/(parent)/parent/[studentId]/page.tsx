import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStudentFeed, getGuardianStudents, getAnnouncements } from '../../actions';
import AudioPlayer from './audio-player';
import { toHijriString } from '@/lib/hijri';
import { env } from '@/env';

type Props = { params: Promise<{ studentId: string }> };

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Al-Imran', 4: 'An-Nisa',
  5: 'Al-Maidah', 36: 'Ya-Sin', 67: 'Al-Mulk', 112: 'Al-Ikhlas',
};
function surahName(n: number) { return SURAH_NAMES[n] ?? `Surah ${n}`; }

export default async function ParentFeedPage({ params }: Props) {
  const { studentId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Verify this parent is linked to this student
  const students = await getGuardianStudents(user.id);
  const student = students.find(s => s?.id === studentId);
  if (!student) redirect('/parent');

  const today = new Date().toISOString().slice(0, 10);
  const [{ attendance, hifz, audioSignedUrl, notes }, announcements] = await Promise.all([
    getStudentFeed(studentId, today),
    getAnnouncements(env.NEXT_PUBLIC_ORG_ID),
  ]);

  const now = new Date();
  const todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const hijri = toHijriString(now);
  const seenNoteIds = new Set<string>();
  const uniqueNotes = notes.filter(n => {
    if (seenNoteIds.has(n.id)) return false;
    seenNoteIds.add(n.id);
    return true;
  });
  const praiseNotes = uniqueNotes.filter(n => n.noteType === 'praise');
  const homeworkNotes = uniqueNotes.filter(n => n.noteType === 'homework');

  const hasContent = attendance || hifz || praiseNotes.length > 0 || homeworkNotes.length > 0;

  return (
    <main className="app-main">
      <p className="feed-date" style={{ marginTop: 24 }}>{todayLabel}</p>
      {hijri && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, marginTop: -12 }}>{hijri}</p>}
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 24px', color: 'var(--fg)' }}>
        {student.fullName}&apos;s day
      </h1>

      {!hasContent ? (
        <div className="feed-empty">
          <h3>No class today yet</h3>
          <p>Check back after Sunday&apos;s session. Your teacher will send a summary when class wraps.</p>
        </div>
      ) : (
        <>
          {attendance && (
            <div className="app-card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 6 }}>Attendance</div>
                  <span className={`badge badge-${attendance.status}`} style={{ textTransform: 'capitalize' }}>{attendance.status}</span>
                </div>
                {attendance.arrivalTime && (
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    Arrived {new Date(attendance.arrivalTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          )}

          {hifz && (
            <div className="app-card" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>Hifz</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: audioSignedUrl ? 12 : 0 }}>
                <span className={`badge badge-${hifz.stream}`} style={{ textTransform: 'capitalize' }}>{hifz.stream}</span>
                <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--fg)' }}>
                  {surahName(hifz.surahNumber)} {hifz.ayahStart}–{hifz.ayahEnd}
                </span>
              </div>
              {audioSignedUrl && <AudioPlayer src={audioSignedUrl} />}
              {!audioSignedUrl && hifz.audioUrl && (
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>Audio recorded (link expired — refresh to replay)</p>
              )}
            </div>
          )}

          {praiseNotes.slice(0, 3).map(note => (
            <div key={note.id} className="app-card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>Praise</div>
                {note.category && <span className="badge badge-praise">{note.category}</span>}
              </div>
              <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.55, margin: 0 }}>&ldquo;{note.content}&rdquo;</p>
            </div>
          ))}

          {homeworkNotes.slice(0, 2).map(note => (
            <div key={note.id} className="app-card" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>
                Homework
              </div>
              <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.55, margin: 0 }}>{note.content}</p>
            </div>
          ))}
        </>
      )}

      {announcements.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
            📢 School announcements
          </h2>
          {announcements.map(a => (
            <div key={a.threadId} className="app-card" style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55, margin: '0 0 8px' }}>{a.content}</p>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
