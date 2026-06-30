import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeacherClasses } from '../actions';
import Link from 'next/link';
import { toHijriString } from '@/lib/hijri';
import { EmptyState } from '@/components/ui/empty-state';

export default async function TeacherHome() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const classes = await getTeacherClasses(user.id);

  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const hijri = toHijriString(now);

  return (
    <main className="app-main">
      <p className="feed-date" style={{ marginTop: 24 }}>{today}</p>
      {hijri && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, marginTop: -8 }}>{hijri}</p>}
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--fg)' }}>
        Your classes
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>
        Select a class to begin the 60-second wrap.
      </p>

      {classes.length === 0 ? (
        <EmptyState
          icon="principal"
          title="No classes assigned yet"
          body="Once your principal assigns you to a class, it will appear here and you can start the 60-second wrap."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {classes.map(cls => (
            <Link
              key={cls.id}
              href={`/teacher/${cls.id}/attendance`}
              className="app-card is-interactive"
              style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{cls.name}</div>
              {cls.academicYear && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{cls.academicYear}</div>
              )}
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--accent-700)', fontWeight: 500 }}>
                Start class wrap →
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
