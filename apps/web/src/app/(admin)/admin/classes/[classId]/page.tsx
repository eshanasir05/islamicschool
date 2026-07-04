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
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { ToastOnParam } from '@/components/ui/toast-on-param';
import { SubmitButton } from '@/components/ui/submit-button';
import { EmptyState } from '@/components/ui/empty-state';

type Props = { params: Promise<{ classId: string }>; searchParams: Promise<{ notice?: string }> };

export default async function ClassDetailPage({ params, searchParams }: Props) {
  const { classId } = await params;
  const { notice } = await searchParams;
  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const [{ cls, sessions, homework }, allStudents] = await Promise.all([
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
      <ToastOnParam notice={notice} />
      <Breadcrumb
        items={[
          { label: 'Classes', href: '/admin/classes' },
          { label: cls.name },
        ]}
      />

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
                <ConfirmSubmit
                  label="Archive"
                  title="Archive this class?"
                  body="Archived classes are hidden from active lists and the dashboard. Enrollment and history are kept, and you can restore it later."
                  confirmLabel="Archive class"
                  variant="danger"
                  className="btn btn-ghost"
                  buttonStyle={{ fontSize: 13, padding: '4px 12px', color: 'var(--muted)' }}
                />
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
                    <ConfirmSubmit
                      label="Remove"
                      title="Remove from class?"
                      body={`${e.student?.fullName ?? 'This student'} will be unenrolled from ${cls.name}. You can add them back anytime.`}
                      confirmLabel="Remove student"
                      variant="danger"
                      className="btn btn-ghost"
                      buttonStyle={{ fontSize: 12, padding: '3px 10px', color: 'var(--muted)', height: 'auto' }}
                    />
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
              <SubmitButton className="btn btn-accent" style={{ flexShrink: 0 }} pendingLabel="Adding…">
                Add
              </SubmitButton>
            </form>
          )}

          {unenrolledStudents.length === 0 && cls.enrollments.length === 0 && (
            <EmptyState
              icon="users"
              title="No students enrolled"
              body="Add students from the Students page first, then enroll them into this class."
              cta={{ label: 'Go to Students', href: '/admin/students' }}
            />
          )}
        </div>
      )}

      {/* Recent homework */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
          Recent homework ({homework.length})
        </h2>
        {homework.length === 0 ? (
          <EmptyState
            icon="book"
            title="No homework assigned yet"
            body="Once the teacher assigns homework for this class, it will appear here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {homework.map(hw => (
              <div key={hw.id} className="app-card" style={{ fontSize: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{hw.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    Due {new Date(`${hw.dueDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {hw.description && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>{hw.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session history */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
          Session history ({sessions.length})
        </h2>
        {sessions.length === 0 ? (
          <EmptyState
            icon="cal"
            title="No sessions yet"
            body="Once a teacher wraps a class, attendance sessions will appear here."
          />
        ) : (
          <div className="table-scroll">
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
