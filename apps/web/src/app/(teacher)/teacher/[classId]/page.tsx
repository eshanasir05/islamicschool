import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeacherClassRoster, teacherEnrollStudent, teacherUnenrollStudent } from '../../actions';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { SubmitButton } from '@/components/ui/submit-button';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { ToastOnParam } from '@/components/ui/toast-on-param';
import { Icon } from '@/components/marketing/icon';

type Props = { params: Promise<{ classId: string }>; searchParams: Promise<{ notice?: string }> };

export default async function TeacherClassRosterPage({ params, searchParams }: Props) {
  const { classId } = await params;
  const { notice } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { cls, students, availableStudents } = await getTeacherClassRoster(classId, user.id);
  if (!cls) notFound();

  const enrollAction = async (formData: FormData) => {
    'use server';
    const studentId = formData.get('studentId') as string;
    if (!studentId) return;
    const supabase2 = await createSupabaseServerClient();
    const { data: { user: caller } } = await supabase2.auth.getUser();
    if (!caller) redirect('/sign-in');
    await teacherEnrollStudent(classId, studentId, caller.id);
  };

  return (
    <>
      <ToastOnParam notice={notice} />
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/teacher' },
          { label: cls.name },
        ]}
      />
      <h1 className="text-h1" style={{ marginBottom: 4 }}>{cls.name}</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        {students.length} student{students.length !== 1 ? 's' : ''} enrolled. Click a student for a quick profile.
      </p>

      {availableStudents.length > 0 && (
        <form action={enrollAction} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <select name="studentId" className="form-select" style={{ flex: 1 }}>
            <option value="">— Add a student to this class —</option>
            {availableStudents.map(s => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
          <SubmitButton className="btn btn-accent" style={{ flexShrink: 0 }} pendingLabel="Adding…">
            Add
          </SubmitButton>
        </form>
      )}

      {students.length === 0 ? (
        <EmptyState
          icon="users"
          title="No students enrolled"
          body="Add a student from the dropdown above to get started."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {students.map(s => {
            const unenrollAction = async () => {
              'use server';
              await teacherUnenrollStudent(classId, s.id, user.id);
            };
            return (
              <div
                key={s.id}
                className="app-card"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
              >
                <Link
                  href={`/teacher/${classId}/students/${s.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--fg)' }}
                >
                  <span className="tclass-icon green" style={{ width: 36, height: 36 }}>
                    <Icon name="users" size={16} />
                  </span>
                  <span>
                    <span style={{ fontWeight: 600, display: 'block' }}>{s.fullName}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {[s.gender, `${s.age} yrs`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </Link>
                <form action={unenrollAction}>
                  <ConfirmSubmit
                    label="Remove"
                    title="Remove from class?"
                    body={`${s.fullName} will be unenrolled from ${cls.name}. You can add them back anytime.`}
                    confirmLabel="Remove student"
                    variant="danger"
                    className="btn btn-ghost"
                    buttonStyle={{ fontSize: 12, padding: '3px 10px', color: 'var(--muted)', height: 'auto' }}
                  />
                </form>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
