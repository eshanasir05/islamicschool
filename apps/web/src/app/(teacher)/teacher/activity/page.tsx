import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeacherRecentActivity } from '../../actions';
import { Icon } from '@/components/marketing/icon';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { relativeTime, ACTIVITY_ICON } from '../../activity-format';

export default async function TeacherActivityPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const activity = await getTeacherRecentActivity(user.id, 50);

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/teacher' },
          { label: 'Recent activity' },
        ]}
      />
      <h1 className="text-h1" style={{ marginBottom: 4 }}>Recent activity</h1>
      <p className="text-body" style={{ marginBottom: 20 }}>
        Attendance, hifz, and notes recorded across your classes.
      </p>

      {activity.length === 0 ? (
        <EmptyState
          icon="activity"
          title="No activity yet"
          body="Once you take attendance or record hifz and notes, they'll show up here."
        />
      ) : (
        <div className="app-card">
          <div className="activity-list">
            {activity.map(a => (
              <div key={a.id} className="activity-row">
                <span className={`activity-icon ${a.kind}`}>
                  <Icon name={ACTIVITY_ICON[a.kind]} size={16} />
                </span>
                <span className="activity-main">
                  <span className="activity-title" style={{ whiteSpace: 'normal' }}>{a.title}</span>
                  <span className="activity-time">{a.detail} · {relativeTime(a.at)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
