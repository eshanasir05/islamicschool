import { env } from '@/env';
import {
  getAdminClassDetail,
  getAdminStudents,
  archiveClass,
  restoreClass,
  enrollStudent,
  unenrollStudent,
} from '../../../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';

type Props = { params: Promise<{ classId: string }> };

export default async function ClassDetailPage({ params }: Props) {
  const { classId } = await params;
  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const [{ cls, sessions }, allStudents] = await Promise.all([
    getAdminClassDetail(classId, orgId),
    getAdminStudents(orgId),
  ]);
  if (!cls) notFound();

  const enrolledIds = new Set(cls.enrollments.map(e => e.studentId));
  const unenrolledStudents = allStudents.filter(s => !enrolledIds.has(s.id) && s.status === 'active');

  const archiveAction = async () => {
    'use server';
    await archiveClass(classId, env.NEXT_PUBLIC_ORG_ID);
  };
  const restoreAction = async () => {
    'use server';
    await restoreClass(classId, env.NEXT_PUBLIC_ORG_ID);
  };
  const enrollAction = async (formData: FormData) => {
    'use server';
    const studentId = formData.get('studentId') as string;
    if (!studentId) return;
    await enrollStudent(classId, studentId);
  };
  const unenrollAction = async (formData: FormData) => {
    'use server';
    const studentId = formData.get('studentId') as string;
    if (!studentId) return;
    await unenrollStudent(classId, studentId);
  };

  const isArchived = !!cls.deletedAt;

  return (
    <main className="app-main">
      <Link
        href="/admin/classes"
        style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', display: 'inline-block', marginTop: 16, marginBottom: 16 }}
      >
        ← All classes
      </Link>

      {/* Class info card */}
      <div className="app-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 20, color: 'var(--fg)' }}>{cls.name}</div>
            {isArchived && <span className="badge badge-absent" style={{ marginTop: 4, display: 'inline-block' }}>Archived</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {!isArchived && (
              <Link
                href={`/admin/classes/${classId}/edit`}
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: '4px 12px', textDecoration: 'none' }}
              >
                Edit
              </Link>
            )}
            {isArchived ? (
              <form action={restoreAction}>
                <button type="submit" className="btn btn-ghost" style={{ fontSize: 13, padding: '4px 12px' }}>
                  Restore
                </button>
              </form>
            ) : (
              <form action={archiveAction}>
                <button type="submit" className="btn btn-ghost" style={{ fontSize: 13, padding: '4px 12px', color: 'var(--muted)' }}>
                  Archive
                </button>
              </form>
            )}
          </div>
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>
          {cls.primaryTeacher?.fullName ?? 'No teacher assigned'}
          {cls.gradeLevel ? ` · ${cls.gradeLevel}` : ''}
          {cls.academicYear ? ` · ${cls.academicYear}` : ''}
          {cls.capacity ? ` · Capacity: ${cls.capacity}` : ''}
        </div>
      </div>

      {/* Enrolled students */}
      {!isArchived && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
            Students ({cls.enrollments.length})
          </h2>
          {cls.enrollments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {cls.enrollments.map(e => (
                <div
                  key={e.studentId}
                  className="app-card"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}
                >
                  <Link href={`/admin/students/${e.studentId}`} style={{ fontWeight: 500, color: 'var(--fg)', textDecoration: 'none' }}>
                    {e.student?.fullName ?? '—'}
                  </Link>
                  <form action={unenrollAction}>
                    <input type="hidden" name="studentId" value={e.studentId} />
                    <button type="submit" className="btn btn-ghost" style={{ fontSize: 12, padding: '3px 10px', color: 'var(--muted)', height: 'auto' }}>
                      Remove
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          {unenrolledStudents.length > 0 && (
            <form action={enrollAction} style={{ display: 'flex', gap: 8 }}>
              <select name="studentId" className="sign-in-input" style={{ flex: 1, marginBottom: 0 }}>
                <option value="">— Select student to add —</option>
                {unenrolledStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
              <button type="submit" className="btn btn-accent" style={{ flexShrink: 0 }}>
                Add
              </button>
            </form>
          )}

          {unenrolledStudents.length === 0 && cls.enrollments.length === 0 && (
            <div className="feed-empty" style={{ marginTop: 0 }}>
              <p>No students enrolled. Create students first from the Students page.</p>
            </div>
          )}
        </div>
      )}

      {/* Session history */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
          Session history ({sessions.length})
        </h2>
        {sessions.length === 0 ? (
          <div className="feed-empty" style={{ marginTop: 0 }}>
            <p>No sessions recorded yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Date', 'Present', 'Late', 'Absent', 'Total'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Date' ? 'left' : 'center', padding: '6px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.date} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 8px', color: 'var(--fg)' }}>{s.date}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      <span className="badge badge-present">{s.present}</span>
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      {s.late > 0 ? <span className="badge badge-late">{s.late}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      {s.absent > 0 ? <span className="badge badge-absent">{s.absent}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'center', color: 'var(--muted)' }}>{s.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
