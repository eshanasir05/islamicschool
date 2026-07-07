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
import { LogoMark } from '@/components/ui/logo';
import { Icon } from '@/components/marketing/icon';
import { buildAttentionItems, daysUntil } from '@/lib/parent-attention';

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

function shortDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const hijri = toHijriString(now);
  const firstName = student.fullName.split(' ')[0];

  const seenNoteIds = new Set<string>();
  const uniqueNotes = notes.filter(n => {
    if (seenNoteIds.has(n.id)) return false;
    seenNoteIds.add(n.id);
    return true;
  });
  const homeworkNotes = uniqueNotes.filter(n => n.noteType === 'homework');
  const generalNotes = uniqueNotes.filter(n => n.noteType === 'general' || n.noteType === 'concern');
  const todayPraise = uniqueNotes.find(n => n.noteType === 'praise' && n.createdAt && new Date(n.createdAt).toISOString().slice(0, 10) === today);
  const praiseNotes = uniqueNotes.filter(n => n.noteType === 'praise' && n.id !== todayPraise?.id);
  const featuredPraise = todayPraise ?? praiseNotes[0];
  const recentAdabMoments = (todayPraise ? praiseNotes : praiseNotes.slice(1)).slice(0, 2);

  const hasTonight = !!(attendance || hifz || todayPraise);
  const suggestion = practiceSuggestion(hifz);
  const nextHomework = homework[0];
  const latestMilestone = milestones[0];

  // "Needs your attention" — only real, actionable items, nothing fabricated.
  const attentionItems = buildAttentionItems({ basePath: '', attendance, nextHomework, tuition, today });

  const greetingPills: { label: string; badge: string }[] = [];
  if (attendance) greetingPills.push({ label: `${attendance.status.charAt(0).toUpperCase()}${attendance.status.slice(1)} today`, badge: `badge-${attendance.status}` });
  if (nextHomework) greetingPills.push({ label: `Homework due ${shortDate(nextHomework.dueDate)}`, badge: 'badge-homework' });
  if (tuition?.status === 'active') greetingPills.push({ label: 'Tuition active', badge: 'badge-active' });
  if (tuition?.status === 'pending_payment') greetingPills.push({ label: 'Tuition due', badge: 'badge-pending' });
  if (tuition?.status === 'past_due') greetingPills.push({ label: 'Tuition past due', badge: 'badge-past_due' });
  if (todayPraise) greetingPills.push({ label: 'New praise', badge: 'badge-praise' });

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
    <main className="app-main-wide">
      <ToastOnParam notice={notice} />
      {payment === 'success' && (
        <div className="banner banner-success" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={22} />
          <span>Payment received — JazakAllah khayran! Your billing is now active.</span>
        </div>
      )}

      {/* Greeting */}
      <div className="teacher-greeting" style={{ marginTop: 24, marginBottom: 24 }}>
        <div>
          <h1>Assalamu alaikum, {student.fullName.includes(' ') ? student.fullName : firstName}</h1>
          <p className="sub">Here&apos;s what&apos;s new for {firstName} today.</p>
          {greetingPills.length > 0 && (
            <div className="greeting-pills">
              {greetingPills.map(p => (
                <span key={p.label} className={`badge ${p.badge}`}>{p.label}</span>
              ))}
            </div>
          )}
        </div>
        <div className="date-card">
          <span className="cal"><Icon name="cal" size={20} /></span>
          <div>
            <div className="d1">{dateLabel}</div>
            {hijri && <div className="d2">{hijri}</div>}
          </div>
        </div>
      </div>

      <div className="parent-dash-grid">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="parent-dash-main">

          {/* Tonight's Practice — hero card */}
          {!hasTonight ? (
            <EmptyState
              icon="cal"
              title="No class update yet today"
              body="Check back after the next session. Your teacher will send a summary — attendance, hifz, and praise — as soon as class wraps."
            />
          ) : (
            <div className="card-highlight">
              <div style={{ marginBottom: 18 }}>
                <div className="text-label" style={{ color: 'var(--accent-700)', marginBottom: 4 }}>🌙 Tonight&apos;s practice</div>
                <h2 style={{ fontSize: 19, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>Tonight with {firstName}</h2>
              </div>

              {attendance && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className={`badge badge-${attendance.status}`} style={{ textTransform: 'capitalize' }}>{attendance.status}</span>
                    {attendance.arrivalTime && (
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                        Arrived {new Date(attendance.arrivalTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {attendance.status === 'absent' && !attendance.guardianReason && (
                    <form id="absence-reason" action={submitReasonAction} className="card-danger" style={{ marginTop: 10, scrollMarginTop: 24 }}>
                      <input type="hidden" name="attendanceId" value={attendance.id} />
                      <p style={{ fontSize: 13, color: 'var(--danger-fg)', margin: '0 0 8px' }}>
                        Let the school know why {firstName} was absent today.
                      </p>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <select name="reason" required className="form-select" style={{ flex: 1 }} defaultValue="">
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
                        className="form-input"
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
                <div style={{ marginBottom: 16 }}>
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
                <div style={{ background: 'var(--surface)', border: '1px solid var(--accent-soft-2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <div className="text-label" style={{ color: 'var(--accent-700)', marginBottom: 4 }}>
                    Practice tonight
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--fg)', margin: 0 }}>{suggestion}</p>
                </div>
              )}

              {todayPraise && (
                <div
                  style={{
                    marginBottom: nextHomework ? 16 : 0,
                    background: 'var(--surface)',
                    border: '1px solid var(--sand-border)',
                    borderRadius: 10,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <div className="text-label">Teacher note</div>
                    {todayPraise.category && <span className="badge badge-praise">{todayPraise.category}</span>}
                  </div>
                  <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--fg)', lineHeight: 1.5, margin: 0 }}>
                    &ldquo;{todayPraise.content}&rdquo;
                  </p>
                </div>
              )}

              {nextHomework && (
                <div style={{ borderTop: '1px solid var(--sand-border)', paddingTop: 12, marginTop: todayPraise ? 16 : 0 }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Due next class: </span>
                  <span style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{nextHomework.title}</span>
                </div>
              )}
            </div>
          )}

          {/* Needs your attention */}
          <div>
            <h2 className="text-h2" style={{ marginBottom: 10 }}>Needs your attention</h2>
            {attentionItems.length > 0 ? (
              <div className="attention-list" style={{ marginBottom: 0 }}>
                {attentionItems.map(item => (
                  <a key={item.href + item.label} href={item.href} className={`attention-row tone-${item.tone}`}>
                    <span className="attention-row-icon"><Icon name={item.icon} size={16} /></span>
                    <span className="attention-row-label">{item.label}</span>
                    <Icon name="chevron-right" size={14} />
                  </a>
                ))}
              </div>
            ) : (
              <div className="app-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--accent-700)', display: 'flex' }}><Icon name="check" size={18} /></span>
                <span style={{ fontSize: 14, color: 'var(--fg-2)' }}>You&apos;re all caught up.</span>
              </div>
            )}
          </div>

          {/* Homework */}
          {(homework.length > 0 || homeworkNotes.length > 0) && (
            <div id="homework" style={{ scrollMarginTop: 24 }}>
              <h2 className="text-h2" style={{ marginBottom: 10 }}>Homework</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {homework.map(hw => {
                  const dueSoon = daysUntil(hw.dueDate, today) <= 3;
                  return (
                    <div key={hw.id} className={dueSoon ? 'card-attention' : 'app-card'}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{hw.title}</span>
                        <span className="badge badge-homework" style={{ whiteSpace: 'nowrap' }}>
                          Due {shortDate(hw.dueDate)}
                        </span>
                      </div>
                      {hw.class?.name && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{hw.class.name}</div>
                      )}
                      {hw.description && (
                        <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5, margin: '8px 0 0' }}>{hw.description}</p>
                      )}
                    </div>
                  );
                })}
                {homeworkNotes.slice(0, 2).map(note => (
                  <div key={note.id} className="app-card">
                    <div className="text-label" style={{ marginBottom: 6 }}>Teacher note</div>
                    <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55, margin: 0 }}>{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quran / Hifz progress */}
          {milestones.length > 0 && (
            <div>
              <h2 className="text-h2" style={{ marginBottom: 10 }}>Quran progress</h2>
              <div className="app-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{latestMilestone!.label}</span>
                  <span className="badge badge-sabak" style={{ whiteSpace: 'nowrap' }}>{shortDate(latestMilestone!.achievedDate)}</span>
                </div>
                {latestMilestone!.teacherNotes && (
                  <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5, margin: '8px 0 0' }}>{latestMilestone!.teacherNotes}</p>
                )}
                {milestones.length > 1 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {milestones.slice(1, 4).map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--fg-2)' }}>{m.label}</span>
                        <span style={{ color: 'var(--muted)' }}>{shortDate(m.achievedDate)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Adab Growth preview */}
          {(featuredPraise || recentAdabMoments.length > 0) && (
            <div>
              <h2 className="text-h2" style={{ marginBottom: 10 }}>Adab growth</h2>
              <div className="app-card">
                {featuredPraise && (
                  <div style={{ marginBottom: recentAdabMoments.length > 0 ? 14 : 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <div className="text-label">Featured praise</div>
                      {featuredPraise.category && <span className="badge badge-praise">{featuredPraise.category}</span>}
                    </div>
                    <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--fg)', lineHeight: 1.5, margin: 0 }}>
                      &ldquo;{featuredPraise.content}&rdquo;
                    </p>
                  </div>
                )}
                {recentAdabMoments.length > 0 && (
                  <div style={{ paddingTop: featuredPraise ? 14 : 0, borderTop: featuredPraise ? '1px solid var(--border)' : 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {recentAdabMoments.map(note => (
                      <div key={note.id} style={{ fontSize: 13, color: 'var(--fg-2)' }}>
                        {note.category && <strong style={{ color: 'var(--fg)' }}>{note.category}: </strong>}
                        {note.content}
                      </div>
                    ))}
                  </div>
                )}
                <Link href={`/parent/${studentId}/journal`} className="btn-link" style={{ marginTop: 14, display: 'inline-block' }}>
                  View full Adab Journal →
                </Link>
              </div>
            </div>
          )}

          {/* Teacher note — general/concern notes with no other home */}
          {generalNotes.length > 0 && (
            <div>
              <h2 className="text-h2" style={{ marginBottom: 10 }}>Teacher note</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {generalNotes.slice(0, 2).map(note => (
                  <div key={note.id} className="app-card">
                    <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55, margin: 0 }}>{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right rail ───────────────────────────────────────────────── */}
        <div className="parent-dash-aside">

          {/* Attendance snapshot */}
          <div className="app-card">
            <div className="text-label" style={{ marginBottom: 10 }}>Attendance today</div>
            {attendance ? (
              <div className="attendance-snapshot-row">
                <span className={`badge badge-${attendance.status}`} style={{ textTransform: 'capitalize' }}>{attendance.status}</span>
                {attendance.arrivalTime && (
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {new Date(attendance.arrivalTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>No session recorded yet today.</p>
            )}
          </div>

          {/* Billing summary */}
          {tuition && (
            <div id="billing" className="app-card" style={{ scrollMarginTop: 24 }}>
              <div className="text-label" style={{ marginBottom: 10 }}>Billing</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--fg)' }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: tuition.currency }).format(tuition.amountCents / 100)}
                  <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--muted)' }}>
                    {' '}/ {tuition.frequency === 'one_time' ? 'one time' : tuition.frequency}
                  </span>
                </div>
                <span className={`badge badge-${tuition.status}`} style={{ textTransform: 'capitalize' }}>
                  {tuition.status.replace('_', ' ')}
                </span>
              </div>
              {tuition.baseAmountCents && (
                <div style={{ fontSize: 12, color: 'var(--accent-700)', marginBottom: 8 }}>
                  {tuition.discountReason ?? 'Discount applied'} — was{' '}
                  <span style={{ textDecoration: 'line-through' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: tuition.currency }).format(tuition.baseAmountCents / 100)}
                  </span>
                </div>
              )}

              {tuition.status === 'pending_payment' && (
                <div className="card-attention" style={{ marginTop: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 13, color: 'var(--warn-fg)', margin: '0 0 10px' }}>
                    Your tuition plan is ready. Complete your payment to activate it.
                  </p>
                  <form action={payNowAction}>
                    <button type="submit" className="btn btn-accent" style={{ fontSize: 13, padding: '8px 18px', width: '100%' }}>
                      Pay now →
                    </button>
                  </form>
                </div>
              )}

              {tuition.status === 'past_due' && (
                <div className="card-danger" style={{ marginTop: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 13, color: 'var(--danger-fg)', margin: '0 0 10px' }}>
                    A recent payment failed. Please update your payment method to continue.
                  </p>
                  <form action={payNowAction}>
                    <button type="submit" className="btn btn-accent" style={{ fontSize: 13, padding: '8px 18px', width: '100%' }}>
                      Update billing →
                    </button>
                  </form>
                </div>
              )}

              {tuition.status === 'active' && tuition.payments[0] && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                    Last payment {tuition.payments[0].paidAt
                      ? new Date(tuition.payments[0].paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </div>
                  <form action={payNowAction} style={{ marginTop: 10 }}>
                    <button type="submit" className="btn btn-ghost" style={{ fontSize: 13, padding: '7px 16px', width: '100%' }}>
                      Manage billing →
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* Quick links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href={`/parent/${studentId}/journal`} className="quick-action">
              <span className="quick-action-icon"><Icon name="sparkle" size={18} /></span>
              <span>
                <span className="quick-action-label" style={{ display: 'block' }}>Adab Journal</span>
                <span className="quick-action-sub">See praise and character growth</span>
              </span>
            </Link>
            <Link href={`/parent/${studentId}/report`} className="quick-action">
              <span className="quick-action-icon"><Icon name="book" size={18} /></span>
              <span>
                <span className="quick-action-label" style={{ display: 'block' }}>Progress Report</span>
                <span className="quick-action-sub">Quran, attendance &amp; homework</span>
              </span>
            </Link>
          </div>

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="app-card">
              <div className="text-label" style={{ marginBottom: 10 }}>School announcements</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {announcements.slice(0, 3).map(a => (
                  <div key={a.threadId}>
                    <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, margin: '0 0 4px' }}>{a.content}</p>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
