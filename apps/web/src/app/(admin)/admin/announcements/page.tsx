import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../../actions';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { SubmitButton } from '@/components/ui/submit-button';
import { ToastOnParam } from '@/components/ui/toast-on-param';

type Props = { searchParams: Promise<{ notice?: string }> };

export default async function AnnouncementsPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { notice } = await searchParams;
  const orgId = env.NEXT_PUBLIC_ORG_ID;
  const announcements = await getAnnouncements(orgId);

  const postAction = async (formData: FormData) => {
    'use server';
    const content = (formData.get('content') as string | null)?.trim();
    if (!content) return;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await createAnnouncement(env.NEXT_PUBLIC_ORG_ID, user.id, content);
    redirect('/admin/announcements?notice=announcement_posted');
  };

  const deleteAction = async (formData: FormData) => {
    'use server';
    const threadId = formData.get('threadId') as string | null;
    if (!threadId) return;
    await deleteAnnouncement(threadId);
    redirect('/admin/announcements?notice=announcement_deleted');
  };

  return (
    <main className="app-main">
      <ToastOnParam notice={notice} />
      <h1 className="text-h1" style={{ marginTop: 24, marginBottom: 4 }}>
        Announcements
      </h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        School-wide messages visible to all parents.
      </p>

      <form action={postAction} style={{ marginBottom: 32 }}>
        <div className="app-card">
          <label style={{ display: 'block', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>
            New announcement
          </label>
          <textarea
            name="content"
            className="note-textarea"
            placeholder="Assalamu alaykum! This Sunday's class will…"
            rows={3}
            required
            style={{ marginBottom: 12 }}
          />
          <SubmitButton className="btn btn-accent" style={{ width: '100%' }} pendingLabel="Posting…">
            Post to all parents
          </SubmitButton>
        </div>
      </form>

      {announcements.length === 0 ? (
        <EmptyState
          icon="msg"
          title="No announcements yet"
          body="Post a school-wide message above and every parent will see it in their feed."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {announcements.map(a => (
            <div key={a.id} className="app-card">
              <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.55, margin: '0 0 10px' }}>{a.content}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {a.senderName} · {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                </div>
                <form action={deleteAction}>
                  <input type="hidden" name="threadId" value={a.id} />
                  <ConfirmSubmit
                    label="Delete"
                    title="Delete this announcement?"
                    body="It will be removed from every parent's feed. This cannot be undone."
                    confirmLabel="Delete announcement"
                    variant="danger"
                    className="btn btn-ghost"
                    buttonStyle={{ fontSize: 12, padding: '3px 10px', color: 'var(--muted)', height: 'auto' }}
                  />
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
