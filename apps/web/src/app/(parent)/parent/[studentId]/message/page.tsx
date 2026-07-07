import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGuardianStudents, getNotesToTeacher, getGeneralNotesForStudent, sendNoteToTeacher } from '../../../actions';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { SubmitButton } from '@/components/ui/submit-button';
import { ToastOnParam } from '@/components/ui/toast-on-param';

type Props = { params: Promise<{ studentId: string }>; searchParams: Promise<{ notice?: string }> };

function shortDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function ParentMessageTeacherPage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const { notice } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const students = await getGuardianStudents(user.id);
  const student = students.find(s => s?.id === studentId);
  if (!student) notFound();

  const [notesToTeacher, generalNotes] = await Promise.all([
    getNotesToTeacher(studentId),
    getGeneralNotesForStudent(studentId),
  ]);

  async function sendNoteAction(formData: FormData) {
    'use server';
    const content = formData.get('content') as string;
    if (!content?.trim()) return;
    await sendNoteToTeacher(studentId, content);
  }

  return (
    <main className="app-main">
      <ToastOnParam notice={notice} />
      <Breadcrumb items={[{ label: student.fullName, href: `/parent/${studentId}` }, { label: 'Message teacher' }]} />
      <h1 className="text-h1" style={{ marginBottom: 6 }}>Message {student.fullName.split(' ')[0]}&apos;s teacher</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        Ask about hifz, homework, or anything else — the teacher gets notified right away.
      </p>

      <div className="app-card" style={{ marginBottom: 24 }}>
        <form action={sendNoteAction} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            name="content"
            required
            rows={3}
            placeholder={`Ask about ${student.fullName.split(' ')[0]}'s hifz, homework, or anything else…`}
            className="form-input"
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
          <SubmitButton className="btn btn-accent" style={{ alignSelf: 'flex-start', fontSize: 13, padding: '7px 16px' }} pendingLabel="Sending…">
            Send note
          </SubmitButton>
        </form>
      </div>

      {generalNotes.length > 0 && (
        <>
          <h2 className="text-h2" style={{ marginBottom: 10 }}>Notes from the teacher</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {generalNotes.map(note => (
              <div key={note.id} className="app-card">
                <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55, margin: 0 }}>{note.content}</p>
                <div style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 6 }}>
                  {note.createdAt ? shortDate(note.createdAt.toISOString().slice(0, 10)) : ''}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-h2" style={{ marginBottom: 10 }}>Message history</h2>
      {notesToTeacher.length === 0 ? (
        <EmptyState
          icon="msg"
          title="No messages yet"
          body="Send a note above and it'll show up here, along with the teacher's reply."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notesToTeacher.map(m => (
            <div key={m.id} className="app-card" style={{ fontSize: 14 }}>
              <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 4 }}>
                {m.senderUserId === user.id ? 'You' : (m.sender?.fullName ?? 'Teacher')} · {shortDate(m.createdAt.toISOString().slice(0, 10))}
              </div>
              <div style={{ color: 'var(--fg-2)' }}>{m.content}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
