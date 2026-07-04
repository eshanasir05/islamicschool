import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { getAdminStats, getOnboardingChecklist, getAttendanceFollowUp, getAdminTuition, getAdminTrials } from '../actions';
import { getActivityLog, describeActivity } from '@/lib/activity-log';
import { Icon, type IconName } from '@/components/marketing/icon';
import { EmptyState } from '@/components/ui/empty-state';
import { OnboardingChecklist } from '@/components/ui/onboarding-checklist';

const QUICK_ACTIONS: { href: string; icon: IconName; label: string; sub: string }[] = [
  { href: '/admin/students/new', icon: 'plus', label: 'Add student', sub: 'Enroll a new student' },
  { href: '/admin/teachers/invite', icon: 'teacher', label: 'Invite teacher', sub: 'Send an email invite' },
  { href: '/admin/announcements', icon: 'msg', label: 'Post announcement', sub: 'Message all parents' },
];

function timeAgo(date: Date) {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function AdminHome() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const orgId = env.NEXT_PUBLIC_ORG_ID;
  const [stats, attendanceFollowUp, tuitionStudents, trials, recentActivity] = await Promise.all([
    getAdminStats(orgId),
    getAttendanceFollowUp(orgId),
    getAdminTuition(orgId),
    getAdminTrials(orgId),
    getActivityLog(orgId),
  ]);
  const cookieStore = await cookies();
  const checklistDismissed = cookieStore.get('onboarding_dismissed')?.value === 'true';
  const checklist = checklistDismissed ? null : await getOnboardingChecklist(orgId);

  const tuitionConcerns = tuitionStudents.filter(s =>
    s.tuitionPlans.some(p => p.status === 'past_due' || p.status === 'pending_payment'),
  ).length;
  const pendingTrials = trials.filter(t => t.status === 'scheduled' || t.status === 'assessed').length;
  const attentionItems = [
    attendanceFollowUp.length > 0 && {
      href: '/admin/attendance-follow-up',
      icon: 'shield' as IconName,
      label: `${attendanceFollowUp.length} student${attendanceFollowUp.length === 1 ? '' : 's'} need attendance follow-up`,
      tone: 'danger' as const,
    },
    tuitionConcerns > 0 && {
      href: '/admin/tuition',
      icon: 'money' as IconName,
      label: `${tuitionConcerns} tuition plan${tuitionConcerns === 1 ? '' : 's'} past due or pending payment`,
      tone: 'warn' as const,
    },
    pendingTrials > 0 && {
      href: '/admin/trials',
      icon: 'cal' as IconName,
      label: `${pendingTrials} trial${pendingTrials === 1 ? '' : 's'} awaiting assessment or placement`,
      tone: 'info' as const,
    },
  ].filter((x): x is Exclude<typeof x, false> => !!x);

  const attendanceColor =
    stats.attendancePct >= 80 ? 'var(--accent-700)' :
    stats.attendancePct >= 50 ? '#b45309' :
    '#991b1b';

  return (
    <main className="app-main">
      <h1 className="text-h1" style={{ marginTop: 24, marginBottom: 4 }}>
        Dashboard
      </h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {checklist && checklist.some(i => !i.done) && <OnboardingChecklist items={checklist} />}

      {attentionItems.length > 0 && (
        <div className="attention-list">
          {attentionItems.map(item => (
            <Link key={item.href + item.label} href={item.href} className={`attention-row tone-${item.tone}`}>
              <span className="attention-row-icon"><Icon name={item.icon} size={16} /></span>
              <span className="attention-row-label">{item.label}</span>
              <Icon name="chevron-right" size={14} />
            </Link>
          ))}
        </div>
      )}

      <div className="quick-actions">
        {QUICK_ACTIONS.map(a => (
          <Link key={a.href} href={a.href} className="quick-action">
            <span className="quick-action-icon">
              <Icon name={a.icon} size={18} />
            </span>
            <span>
              <span className="quick-action-label" style={{ display: 'block' }}>{a.label}</span>
              <span className="quick-action-sub">{a.sub}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat">
          <div className="admin-stat-label">Attendance this week</div>
          <div className="admin-stat-value" style={{ color: attendanceColor }}>
            {stats.attendancePct}%
          </div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Hifz wins this week</div>
          <div className="admin-stat-value">{stats.hifzWins}</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Classes wrapped today</div>
          <div className="admin-stat-value">
            <span style={{ color: stats.classesWrapped === stats.classes.length && stats.classes.length > 0 ? 'var(--accent-700)' : 'var(--fg)' }}>
              {stats.classesWrapped}
            </span>
            <span style={{ fontSize: 18, fontWeight: 400, color: 'var(--muted)' }}>
              {' '}/ {stats.classes.length}
            </span>
          </div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Active tuition plans</div>
          <div className="admin-stat-value">{stats.activeTuition}</div>
        </div>
      </div>

      <h2 className="text-h2" style={{ margin: '28px 0 12px' }}>Classes</h2>
      {stats.classes.length === 0 ? (
        <EmptyState
          icon="principal"
          title="No classes yet"
          body="Create your first class and assign a teacher to start tracking attendance and hifz."
          cta={{ label: 'Add class', href: '/admin/classes/new' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stats.classes.map(cls => (
            <Link key={cls.id} href={`/admin/classes/${cls.id}`} className="app-card-link">
              <div className="app-card is-interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>{cls.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{cls.teacherName}</div>
                </div>
                {cls.wrappedToday ? (
                  <span className="badge badge-present">Wrapped</span>
                ) : (
                  <span className="badge badge-late">Pending</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="section-head-row" style={{ margin: '28px 0 10px' }}>
        <h2 className="text-h2">Recent activity</h2>
        <Link href="/admin/activity" className="link-arrow">
          View full log <Icon name="arrow" size={12} />
        </Link>
      </div>
      {recentActivity.length === 0 ? (
        <p className="text-body">Nothing recorded yet — activity shows up here as your school uses Talibly.</p>
      ) : (
        <div className="activity-list" style={{ marginBottom: 12 }}>
          {recentActivity.slice(0, 5).map(entry => (
            <div key={entry.id} className="activity-row">
              <span className="activity-main">
                <span className="activity-title">
                  <strong>{entry.actorName}</strong> {describeActivity(entry)}
                </span>
                <span className="activity-time">{timeAgo(new Date(entry.createdAt))}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <Link href="/admin/board-pack" className="link-arrow" style={{ marginBottom: 24, display: 'inline-flex' }}>
        View Board Pack <Icon name="arrow" size={12} />
      </Link>
    </main>
  );
}
