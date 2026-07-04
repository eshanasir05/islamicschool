import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStudentFeed, getGuardianStudents, getAnnouncements, getParentTuition, createParentPaymentSession, getStudentHomework, getStudentMilestones } from '../../actions';
import AudioPlayer from './audio-player';
import { toHijriString } from '@/lib/hijri';
import { env } from '@/env';
import { EmptyState } from '@/components/ui/empty-state';

type Props = { params: Promise<{ studentId: string }>; searchParams: Promise<{ payment?: string }> };

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Al-Imran', 4: 'An-Nisa',
  5: 'Al-Maidah', 36: 'Ya-Sin', 67: 'Al-Mulk', 112: 'Al-Ikhlas',
};
function surahName(n: number) { return SURAH_NAMES[n] ?? `Surah ${n}`; }

export default async function ParentFeedPage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const { payment } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Verify this parent is linked to this student
  const students = await getGuardianStudents(user.id);
  const student = students.find(s => s?.id === studentId);
  if (!student) redirect('/parent');

  const today = new Date().toISOString().slice(0, 10);
  const [{ attendance, hifz, audioSignedUrl, notes }, announcements, tuition, homework, milestones] = await Promise.all([
    getStudentFeed(studentId, today),
    getAnnouncements(env.NEXT_PUBLIC_ORG_ID),
    getParentTuition(studentId),
    getStudentHomework(studentId),
    getStudentMilestones(studentId),
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

  async function payNowAction() {
    'use server';
    if (tuition) await createParentPaymentSession(tuition.id, studentId);
  }

  return (
    <main className="app-main">
      {payment === 'success' && (
        <div className="banner banner-success" style={{ marginTop: 16 }}>
          Payment received — JazakAllah khayran! Your billing is now active.
        </div>
      )}
      <p className="feed-date" style={{ marginTop: 24 }}>{todayLabel}</p>
      {hijri && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, marginTop: -12 }}>{hijri}</p>}
      <h1 className="text-h1" style={{ marginBottom: 24 }}>
        {student.fullName}&apos;s day
      </h1>

      {!hasContent ? (
        <EmptyState
          icon="cal"
          title="No class today yet"
          body="Check back after the next session. Your teacher will send a summary — attendance, hifz, and praise — as soon as class wraps."
        />
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
                Teacher note
              </div>
              <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.55, margin: 0 }}>{note.content}</p>
            </div>
          ))}
        </>
      )}

      {homework.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Homework</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {homework.map(hw => (
              <div key={hw.id} className="app-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{hw.title}</span>
                  <span className="badge badge-homework" style={{ whiteSpace: 'nowrap' }}>
                    Due {new Date(`${hw.dueDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {hw.description && (
                  <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5, margin: '8px 0 0' }}>{hw.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {milestones.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Hifz milestones</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {milestones.map(m => (
              <div key={m.id} className="app-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{m.label}</span>
                  <span className="badge badge-sabak" style={{ whiteSpace: 'nowrap' }}>
                    {new Date(`${m.achievedDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {m.teacherNotes && (
                  <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5, margin: '8px 0 0' }}>{m.teacherNotes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tuition && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Billing</h2>
          <div className="app-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--fg)' }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: tuition.currency }).format(tuition.amountCents / 100)}
                  <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--muted)' }}>
                    {' '}/ {tuition.frequency === 'one_time' ? 'one time' : tuition.frequency}
                  </span>
                </div>
              </div>
              <span className={
                tuition.status === 'active' ? 'badge badge-present' :
                tuition.status === 'past_due' ? 'badge badge-absent' :
                'badge badge-late'
              } style={{ textTransform: 'capitalize' }}>
                {tuition.status.replace('_', ' ')}
              </span>
            </div>

            {tuition.status === 'pending_payment' && (
              <div style={{ marginTop: 12, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                <p style={{ fontSize: 13, color: '#92400e', margin: '0 0 10px' }}>
                  Your tuition plan is ready. Complete your payment to activate it.
                </p>
                <form action={payNowAction}>
                  <button type="submit" className="btn btn-accent" style={{ fontSize: 13, padding: '8px 18px' }}>
                    Pay now →
                  </button>
                </form>
              </div>
            )}

            {tuition.status === 'past_due' && (
              <div style={{ marginTop: 12, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
                <p style={{ fontSize: 13, color: '#991b1b', margin: '0 0 10px' }}>
                  A recent payment failed. Please update your payment method to continue.
                </p>
                <form action={payNowAction}>
                  <button type="submit" className="btn btn-accent" style={{ fontSize: 13, padding: '8px 18px' }}>
                    Update billing →
                  </button>
                </form>
              </div>
            )}

            {tuition.payments.length > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 8 }}>
                  Recent payments
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tuition.payments.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                      <div style={{ color: 'var(--fg)' }}>
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: 'var(--fg)', fontWeight: 500 }}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency }).format(p.amountCents / 100)}
                        </span>
                        {p.receiptUrl && (
                          <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 12 }}>
                            Receipt
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {announcements.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
            School announcements
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
