import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { getAnnouncements, createAnnouncement } from '../../actions';

export default async function AnnouncementsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

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
  };

  return (
    <main className="app-main">
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '24px 0 4px', color: 'var(--fg)' }}>
        Announcements
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
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
          <button type="submit" className="btn btn-accent" style={{ width: '100%' }}>
            Post to all parents
          </button>
        </div>
      </form>

      {announcements.length === 0 ? (
        <div className="feed-empty">
          <p>No announcements yet. Post one above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {announcements.map(a => (
            <div key={a.id} className="app-card">
              <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.55, margin: '0 0 10px' }}>{a.content}</p>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {a.senderName} · {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
