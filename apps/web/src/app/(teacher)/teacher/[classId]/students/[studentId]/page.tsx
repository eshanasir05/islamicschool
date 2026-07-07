import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeacherStudentDetail } from '../../../../actions';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';

type Props = { params: Promise<{ classId: string; studentId: string }> };

function shortDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function TeacherStudentDetailPage({ params }: Props) {
  const { classId, studentId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { student, className, age, hifz, notes, notesFromParent, retentionFlags, classPrefs } = await getTeacherStudentDetail(classId, studentId, user.id);
  if (!student) notFound();

  const hasRetentionWarning = classPrefs.showRetentionWarnings &&
    (retentionFlags.noReviewInWeeks || retentionFlags.repeatedWeak || retentionFlags.noUpdateInWeeks);

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/teacher' },
          { label: className ?? 'Class', href: `/teacher/${classId}` },
          { label: student.fullName },
        ]}
      />
      <h1 className="text-h1" style={{ marginBottom: 4 }}>{student.fullName}</h1>
      <p className="text-body" style={{ marginBottom: 20 }}>
        {[student.gender, age !== null ? `${age} years old` : null, className].filter(Boolean).join(' · ')}
      </p>

      <div className="app-card" style={{ marginBottom: 24 }}>
        <div className="form-grid">
          <div>
            <div className="text-label">Gender</div>
            <div style={{ color: 'var(--fg)', textTransform: 'capitalize' }}>{student.gender ?? '—'}</div>
          </div>
          <div>
            <div className="text-label">Age</div>
            <div style={{ color: 'var(--fg)' }}>{age !== null ? `${age} years` : '—'}</div>
          </div>
          <div>
            <div className="text-label">Enrolled</div>
            <div style={{ color: 'var(--fg)' }}>{student.enrolledAt ? shortDate(student.enrolledAt) : '—'}</div>
          </div>
          <div>
            <div className="text-label">Status</div>
            <div style={{ color: 'var(--fg)', textTransform: 'capitalize' }}>{student.status}</div>
          </div>
        </div>
        {student.medicalNotes && (
          <div style={{ marginTop: 16 }}>
            <div className="text-label">Medical notes</div>
            <div style={{ color: 'var(--fg-2)', fontSize: 14 }}>{student.medicalNotes}</div>
          </div>
        )}
      </div>

      {hasRetentionWarning && (
        <div className="banner banner-error" style={{ marginBottom: 20 }}>
          {retentionFlags.noUpdateInWeeks && 'No hifz recorded in over 3 weeks. '}
          {retentionFlags.noReviewInWeeks && 'No sabqi/manzil review in over 3 weeks. '}
          {retentionFlags.repeatedWeak && 'Recent sessions show repeated weak recall.'}
        </div>
      )}

      <h2 className="text-h2" style={{ marginBottom: 12 }}>Recent hifz</h2>
      {hifz.length === 0 ? (
        <EmptyState icon="book" title="No hifz recorded yet" body="Once you record hifz for this student, it will appear here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {hifz.map(h => (
            <div key={h.id} className="app-card" style={{ fontSize: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontWeight: 500, color: 'var(--fg)' }}>
                  Surah {h.surahNumber}{classPrefs.showAyahRanges ? ` · ${h.ayahStart}–${h.ayahEnd}` : ''}
                </span>
                <span className={`badge badge-${h.status}`} style={{ textTransform: 'capitalize' }}>
                  {h.status.replace('_', ' ')}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, textTransform: 'capitalize' }}>
                {h.stream} · {shortDate(h.sessionDate)}
              </div>
              {h.audioSignedUrl && (
                <audio controls src={h.audioSignedUrl} style={{ width: '100%', marginTop: 10, height: 36 }} />
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="text-h2" style={{ marginBottom: 12 }}>Recent notes</h2>
      {notes.length === 0 ? (
        <EmptyState icon="paper" title="No notes yet" body="Notes you send to parents for this student will appear here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {notes.map(n => (
            <div key={n.id} className="app-card" style={{ fontSize: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-sabak" style={{ textTransform: 'capitalize' }}>{n.noteType}</span>
                {n.category && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{n.category}</span>}
              </div>
              <div style={{ color: 'var(--fg-2)', marginTop: 6 }}>{n.content}</div>
              <div style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 6 }}>
                {n.createdAt ? shortDate(n.createdAt.toISOString().slice(0, 10)) : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {notesFromParent.length > 0 && (
        <>
          <h2 className="text-h2" style={{ marginBottom: 12 }}>Notes from parent</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notesFromParent.map(m => (
              <div key={m.id} className="app-card" style={{ fontSize: 14 }}>
                <div style={{ color: 'var(--fg-2)' }}>{m.content}</div>
                <div style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 6 }}>
                  {m.sender?.fullName ?? 'Parent'} · {shortDate(m.createdAt.toISOString().slice(0, 10))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
