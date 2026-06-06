import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { getAdminStats } from '../actions';

export default async function AdminHome() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const stats = await getAdminStats(env.NEXT_PUBLIC_ORG_ID);

  return (
    <main className="app-main">
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '24px 0 4px', color: 'var(--fg)' }}>
        Dashboard
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      <div className="admin-stat-grid">
        <div className="app-card stat-card">
          <div className="stat-label">Attendance this week</div>
          <div className="stat-value">{stats.attendancePct}%</div>
        </div>
        <div className="app-card stat-card">
          <div className="stat-label">Hifz wins this week</div>
          <div className="stat-value">{stats.hifzWins}</div>
        </div>
        <div className="app-card stat-card">
          <div className="stat-label">Classes wrapped today</div>
          <div className="stat-value">{stats.classesWrapped} / {stats.classes.length}</div>
        </div>
        <div className="app-card stat-card">
          <div className="stat-label">Active tuition plans</div>
          <div className="stat-value">{stats.activeTuition}</div>
        </div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, margin: '28px 0 12px', color: 'var(--fg)' }}>Classes</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stats.classes.map(cls => (
          <div key={cls.id} className="app-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>{cls.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{cls.teacherName}</div>
            </div>
            {cls.wrappedToday ? (
              <span className="badge badge-present">Wrapped ✓</span>
            ) : (
              <span className="badge badge-absent">Pending</span>
            )}
          </div>
        ))}
        {stats.classes.length === 0 && (
          <div className="feed-empty">
            <p>No classes found for this organization.</p>
          </div>
        )}
      </div>
    </main>
  );
}
