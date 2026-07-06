import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGuardianStudents, getStudentReportCard } from '../../../actions';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { PrintButton } from '@/components/ui/print-button';

type Props = { params: Promise<{ studentId: string }>; searchParams: Promise<{ month?: string }> };

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Al-Imran', 4: 'An-Nisa',
  5: 'Al-Maidah', 36: 'Ya-Sin', 67: 'Al-Mulk', 112: 'Al-Ikhlas',
};
function surahName(n: number) { return SURAH_NAMES[n] ?? `Surah ${n}`; }

function shortDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function StudentReportPage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const { month: monthParam } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const students = await getGuardianStudents(user.id);
  const guardianStudent = students.find(s => s?.id === studentId);
  if (!guardianStudent) notFound();

  const month = monthParam ?? new Date().toISOString().slice(0, 7);
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const { student, className, attendanceSummary, hifz, milestones, notes } = await getStudentReportCard(studentId, month);
  if (!student) notFound();

  const [year, mon] = month.split('-').map(Number);
  const prevDate = new Date(year!, mon! - 2, 1);
  const nextDate = new Date(year!, mon!, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentOrFuture = nextDate > new Date();

  const hasAnything = attendanceSummary.total > 0 || hifz.length > 0 || milestones.length > 0 || notes.length > 0;

  return (
    <main className="app-main">
      <Breadcrumb items={[{ label: student.fullName, href: `/parent/${studentId}` }, { label: 'Progress report' }]} />

      <div className="report-header">
        <div>
          <h1 className="text-h1" style={{ marginBottom: 4 }}>{student.fullName}&apos;s progress report</h1>
          <p className="text-body">{className ? `${className} · ` : ''}{monthLabel}</p>
        </div>
        <PrintButton />
      </div>

      <div className="report-card">
        <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <Link href={`/parent/${studentId}/report?month=${prevMonth}`} className="btn btn-ghost btn-sm">← Previous month</Link>
          {!isCurrentOrFuture && (
            <Link href={`/parent/${studentId}/report?month=${nextMonth}`} className="btn btn-ghost btn-sm">Next month →</Link>
          )}
        </div>

        {!hasAnything ? (
          <EmptyState
            icon="cal"
            title="No activity recorded this month"
            body="Once attendance, hifz, or notes are recorded for this student in this month, they'll show up here."
          />
        ) : (
          <>
            <div className="text-label" style={{ marginBottom: 8 }}>Attendance</div>
            <div className="report-stat-grid">
              <div className="stat-card">
                <div className="stat-card-label">Present</div>
                <div className="stat-card-value">{attendanceSummary.present}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Late</div>
                <div className="stat-card-value">{attendanceSummary.late}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Absent</div>
                <div className="stat-card-value">{attendanceSummary.absent}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Excused</div>
                <div className="stat-card-value">{attendanceSummary.excused}</div>
              </div>
            </div>

            {milestones.length > 0 && (
              <>
                <div className="text-label" style={{ marginBottom: 8 }}>Hifz milestones</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {milestones.map(m => (
                    <div key={m.id} className="app-card" style={{ fontSize: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{m.label}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{shortDate(m.achievedDate)}</span>
                      </div>
                      {m.teacherNotes && <div style={{ color: 'var(--fg-2)', marginTop: 6 }}>{m.teacherNotes}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {hifz.length > 0 && (
              <>
                <div className="text-label" style={{ marginBottom: 8 }}>Hifz progress ({hifz.length} session{hifz.length !== 1 ? 's' : ''})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {hifz.map(h => (
                    <div key={h.id} className="app-card" style={{ fontSize: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontWeight: 500, color: 'var(--fg)' }}>
                          {surahName(h.surahNumber)} {h.ayahStart}–{h.ayahEnd}
                        </span>
                        <span className={`badge badge-${h.status}`} style={{ textTransform: 'capitalize' }}>{h.status.replace('_', ' ')}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, textTransform: 'capitalize' }}>
                        {h.stream} · {shortDate(h.sessionDate)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {notes.length > 0 && (
              <>
                <div className="text-label" style={{ marginBottom: 8 }}>Teacher notes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {notes.map(n => (
                    <div key={n.id} className="app-card" style={{ fontSize: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge badge-${n.noteType}`} style={{ textTransform: 'capitalize' }}>{n.noteType}</span>
                        {n.category && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{n.category}</span>}
                        <span style={{ fontSize: 12, color: 'var(--subtle)', marginLeft: 'auto' }}>
                          {n.createdAt ? shortDate(n.createdAt.toISOString().slice(0, 10)) : ''}
                        </span>
                      </div>
                      <div style={{ color: 'var(--fg-2)', marginTop: 6 }}>{n.content}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
