import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGuardianStudents, getStudentHomework, setHomeworkDone, getHomeworkNotesForStudent } from '../../../actions';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { HomeworkFilters } from './filters';

type Props = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ status?: string; due?: string }>;
};

function shortDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(dateStr: string, today: string) {
  const a = new Date(`${dateStr}T00:00:00`).getTime();
  const b = new Date(`${today}T00:00:00`).getTime();
  return Math.round((a - b) / 86_400_000);
}

export default async function ParentHomeworkPage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const { status = 'all', due = 'all' } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const students = await getGuardianStudents(user.id);
  const student = students.find(s => s?.id === studentId);
  if (!student) notFound();

  const [allHomework, homeworkNotes] = await Promise.all([
    getStudentHomework(studentId),
    getHomeworkNotesForStudent(studentId),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  const homework = allHomework.filter(hw => {
    if (status === 'done' && !hw.done) return false;
    if (status === 'incomplete' && hw.done) return false;
    const days = daysUntil(hw.dueDate, today);
    if (due === 'due_soon' && !(days >= 0 && days <= 3)) return false;
    if (due === 'past_due' && !(days < 0 && !hw.done)) return false;
    return true;
  });

  async function toggleHomeworkAction(formData: FormData) {
    'use server';
    const homeworkAssignmentId = formData.get('homeworkAssignmentId') as string;
    const done = formData.get('done') === 'true';
    if (!homeworkAssignmentId) return;
    await setHomeworkDone(homeworkAssignmentId, studentId, done);
  }

  return (
    <main className="app-main">
      <Breadcrumb items={[{ label: student.fullName, href: `/parent/${studentId}` }, { label: 'Homework' }]} />
      <h1 className="text-h1" style={{ marginBottom: 6 }}>{student.fullName}&apos;s homework</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        Everything assigned across {student.fullName.split(' ')[0]}&apos;s classes.
      </p>

      {allHomework.length > 0 && (
        <HomeworkFilters pathname={`/parent/${studentId}/homework`} status={status} due={due} />
      )}

      {allHomework.length === 0 && homeworkNotes.length === 0 ? (
        <EmptyState
          icon="book"
          title="No homework assigned yet"
          body="Once a teacher assigns homework, it will show up here."
        />
      ) : homework.length === 0 && homeworkNotes.length === 0 ? (
        <EmptyState
          icon="book"
          title="No homework matches these filters"
          body="Try a different filter, or clear filters to see everything."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {homeworkNotes.map(note => (
            <div key={note.id} className="app-card">
              <div className="text-label" style={{ marginBottom: 6 }}>Teacher note</div>
              <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55, margin: 0 }}>{note.content}</p>
            </div>
          ))}
          {homework.map(hw => {
            const dueSoon = daysUntil(hw.dueDate, today) <= 3;
            return (
              <div key={hw.id} className={hw.done ? 'app-card' : dueSoon ? 'card-attention' : 'app-card'} style={hw.done ? { opacity: 0.7 } : undefined}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', textDecoration: hw.done ? 'line-through' : 'none' }}>{hw.title}</span>
                  <span className={`badge ${hw.done ? 'badge-completed' : 'badge-homework'}`} style={{ whiteSpace: 'nowrap' }}>
                    {hw.done ? 'Done' : `Due ${shortDate(hw.dueDate)}`}
                  </span>
                </div>
                {hw.class?.name && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{hw.class.name}</div>
                )}
                {hw.description && (
                  <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5, margin: '8px 0 0' }}>{hw.description}</p>
                )}
                <form action={toggleHomeworkAction} style={{ marginTop: 10 }}>
                  <input type="hidden" name="homeworkAssignmentId" value={hw.id} />
                  <input type="hidden" name="done" value={hw.done ? 'false' : 'true'} />
                  <button type="submit" className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}>
                    {hw.done ? 'Mark not done' : 'Mark as done'}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
