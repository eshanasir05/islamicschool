import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStudentFeed, getGuardianStudents, getAnnouncements, getParentTuition, createParentPaymentSession, getStudentHomework, getStudentMilestones, submitAbsenceReason } from '../../actions';
import AudioPlayer from './audio-player';
import { toHijriString } from '@/lib/hijri';
import { env } from '@/env';
import { EmptyState } from '@/components/ui/empty-state';
import { ToastOnParam } from '@/components/ui/toast-on-param';
import { SubmitButton } from '@/components/ui/submit-button';

type Props = { params: Promise<{ studentId: string }>; searchParams: Promise<{ payment?: string; notice?: string }> };

const ABSENCE_REASONS: { value: 'sick' | 'travel' | 'family_emergency' | 'forgot' | 'other'; label: string }[] = [
  { value: 'sick', label: 'Sick' },
  { value: 'travel', label: 'Travel' },
  { value: 'family_emergency', label: 'Family emergency' },
  { value: 'forgot', label: 'Forgot' },
  { value: 'other', label: 'Other' },
];
const ABSENCE_REASON_LABEL: Record<string, string> = Object.fromEntries(ABSENCE_REASONS.map(r => [r.value, r.label]));

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Al-Imran', 4: 'An-Nisa',
  5: 'Al-Maidah', 36: 'Ya-Sin', 67: 'Al-Mulk', 112: 'Al-Ikhlas',
};
function surahName(n: number) { return SURAH_NAMES[n] ?? `Surah ${n}`; }

function practiceSuggestion(hifz: { stream: string; surahNumber: number; ayahStart: number; ayahEnd: number } | null | undefined): string | null {
  if (!hifz) return null;
  const range = `${surahName(hifz.surahNumber)} ${hifz.ayahStart}–${hifz.ayahEnd}`;
  if (hifz.stream === 'sabak') return `Review ${range} twice after Maghrib.`;
  if (hifz.stream === 'sabqi') return `Revise ${range} once tonight.`;
  return `Give ${range} a quick recap before bed.`;
}

export default async function ParentFeedPage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const { payment, notice } = await searchParams;
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
  const homeworkNotes = uniqueNotes.filter(n => n.noteType === 'homework');
  const todayPraise = uniqueNotes.find(n => n.noteType === 'praise' && n.createdAt && new Date(n.createdAt).toISOString().slice(0, 10) === today);
  const praiseNotes = uniqueNotes.filter(n => n.noteType === 'praise' && n.id !== todayPraise?.id);

  const hasTonight = !!(attendance || hifz || todayPraise);
  const suggestion = practiceSuggestion(hifz);
  const nextHomework = homework[0];

  async function payNowAction() {
    'use server';
    if (tuition) await createParentPaymentSession(tuition.id, studentId);
  }

  async function submitReasonAction(formData: FormData) {
    'use server';
    const attendanceId = formData.get('attendanceId') as string;
    const reason = formData.get('reason') as 'sick' | 'travel' | 'family_emergency' | 'forgot' | 'other';
    const note = formData.get('note') as string;
    if (!attendanceId || !reason) return;
    await submitAbsenceReason(attendanceId, studentId, reason, note);
  }

  return (
    <main className="app-main">
      <ToastOnParam notice={notice} />
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

      {!hasTonight ? (
        <EmptyState
          icon="cal"
          title="No class update yet today"
          body="Check back after the next session. Your teacher will send a summary — attendance, hifz, and praise — as soon as class wraps."
        />
      ) : (
        <div className="app-card" style={{ marginBottom: 12, border: '1px solid var(--accent-200, #a7f3d0)' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)', marginBottom: 10 }}>
            Tonight with {student.fullName.split(' ')[0]}
          </div>

          {attendance && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={`badge badge-${attendance.status}`} style={{ textTransform: 'capitalize' }}>{attendance.status}</span>
                {attendance.arrivalTime && (
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                    Arrived {new Date(attendance.arrivalTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {attendance.status === 'absent' && !attendance.guardianReason && (
                <form action={submitReasonAction} style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }}>
                  <input type="hidden" name="attendanceId" value={attendance.id} />
                  <p style={{ fontSize: 13, color: '#991b1b', margin: '0 0 8px' }}>
                    Let the school know why {student.fullName.split(' ')[0]} was absent today.
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <select name="reason" required className="sign-in-input" style={{ marginBottom: 0, flex: 1 }} defaultValue="">
                      <option value="" disabled>— Select a reason —</option>
                      {ABSENCE_REASONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    name="note"
                    placeholder="Any additional detail (optional)"
                    className="sign-in-input"
                    style={{ marginBottom: 8 }}
                  />
                  <SubmitButton className="btn btn-accent" style={{ fontSize: 13, padding: '7px 16px' }} pendingLabel="Sending…">
                    Send to school
                  </SubmitButton>
                </form>
              )}

              {attendance.status === 'absent' && attendance.guardianReason && (
                <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
                  Reason shared: <strong style={{ color: 'var(--fg)' }}>{ABSENCE_REASON_LABEL[attendance.guardianReason] ?? attendance.guardianReason}</strong>
                  {attendance.guardianReasonNote && <> — &ldquo;{attendance.guardianReasonNote}&rdquo;</>}
                </div>
              )}
            </div>
          )}

          {hifz && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: audioSignedUrl ? 10 : 0, flexWrap: 'wrap' }}>
                <span className={`badge badge-${hifz.stream}`} style={{ textTransform: 'capitalize' }}>{hifz.stream}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>
                  {surahName(hifz.surahNumber)} {hifz.ayahStart}–{hifz.ayahEnd}
                </span>
                <span className={`badge badge-${hifz.status}`} style={{ textTransform: 'capitalize' }}>{hifz.status.replace('_', ' ')}</span>
              </div>
              {audioSignedUrl && <AudioPlayer src={audioSignedUrl} />}
              {!audioSignedUrl && hifz.audioUrl && (
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>Audio recorded (link expired — refresh to replay)</p>
              )}
            </div>
          )}

          {suggestion && (
            <div style={{ background: 'var(--accent-soft, #ecfdf5)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-700)', marginBottom: 4 }}>
                Practice tonight
              </div>
              <p style={{ fontSize: 14, color: 'var(--fg)', margin: 0 }}>{suggestion}</p>
            </div>
          )}

          {todayPraise && (
            <div style={{ marginBottom: nextHomework ? 14 : 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>Teacher note</div>
                {todayPraise.category && <span className="badge badge-praise">{todayPraise.category}</span>}
              </div>
              <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.55, margin: 0 }}>&ldquo;{todayPraise.content}&rdquo;</p>
            </div>
          )}

          {nextHomework && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Due next class: </span>
              <span style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{nextHomework.title}</span>
            </div>
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

      <Link href={`/parent/${studentId}/journal`} className="btn-link" style={{ marginBottom: 20, display: 'inline-block' }}>
        View {student.fullName.split(' ')[0]}&apos;s full adab journal →
      </Link>

      {homeworkNotes.slice(0, 2).map(note => (
        <div key={note.id} className="app-card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>
            Teacher note
          </div>
          <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.55, margin: 0 }}>{note.content}</p>
        </div>
      ))}

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
                {tuition.baseAmountCents && (
                  <div style={{ fontSize: 12, color: 'var(--accent-700)', marginTop: 2 }}>
                    {tuition.discountReason ?? 'Discount applied'} — was{' '}
                    <span style={{ textDecoration: 'line-through' }}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: tuition.currency }).format(tuition.baseAmountCents / 100)}
                    </span>
                  </div>
                )}
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
