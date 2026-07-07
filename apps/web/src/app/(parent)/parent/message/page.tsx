import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGuardianStudents, sendNoteToAllTeachers } from '../../actions';
import { EmptyState } from '@/components/ui/empty-state';
import { SubmitButton } from '@/components/ui/submit-button';
import { ToastOnParam } from '@/components/ui/toast-on-param';
import { Icon } from '@/components/marketing/icon';

type Props = { searchParams: Promise<{ notice?: string }> };

export default async function ParentMessageChooserPage({ searchParams }: Props) {
  const { notice } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const students = await getGuardianStudents(user.id);

  if (students.length === 0) {
    return (
      <main className="app-main">
        <EmptyState
          icon="msg"
          title="No students linked"
          body="Contact your school to link your children to your account."
        />
      </main>
    );
  }

  // A single child — no need to make them choose, go straight there.
  if (students.length === 1) {
    redirect(`/parent/${students[0]!.id}/message`);
  }

  async function sendToAllAction(formData: FormData) {
    'use server';
    const content = formData.get('content') as string;
    if (!content?.trim()) return;
    await sendNoteToAllTeachers(content);
  }

  return (
    <main className="app-main">
      <ToastOnParam notice={notice} />
      <h1 className="text-h1" style={{ marginBottom: 6 }}>Message a teacher</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        Choose which child&apos;s teacher you&apos;d like to message.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {students.map(s => (
          <Link key={s.id} href={`/parent/${s.id}/message`} className="quick-action">
            <span className="quick-action-icon"><Icon name="users" size={18} /></span>
            <span>
              <span className="quick-action-label" style={{ display: 'block' }}>{s.fullName}</span>
              <span className="quick-action-sub">Message {s.fullName.split(' ')[0]}&apos;s teacher</span>
            </span>
          </Link>
        ))}
      </div>

      <h2 className="text-h2" style={{ marginBottom: 10 }}>Message all teachers</h2>
      <div className="app-card">
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px' }}>
          Sends the same note to every one of your children&apos;s teachers at once.
        </p>
        <form action={sendToAllAction} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            name="content"
            required
            rows={3}
            placeholder="Write a note to all of your children's teachers…"
            className="form-input"
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
          <SubmitButton className="btn btn-accent" style={{ alignSelf: 'flex-start', fontSize: 13, padding: '7px 16px' }} pendingLabel="Sending…">
            Send to all teachers
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
