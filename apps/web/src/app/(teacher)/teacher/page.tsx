import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { getTeacherClasses, getTeacherRecentActivity } from '../actions';
import Link from 'next/link';
import { toHijriString } from '@/lib/hijri';
import { ayahOfTheDay } from '@/lib/ayah';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/marketing/icon';
import { shortDate, relativeTime, ACTIVITY_ICON } from '../activity-format';

export default async function TeacherHome() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [publicUser, classes, recentActivity] = await Promise.all([
    db.query.users.findFirst({ where: eq(schema.users.id, user.id) }),
    getTeacherClasses(user.id),
    getTeacherRecentActivity(user.id, 3),
  ]);

  const name = publicUser?.fullName?.trim();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const hijri = toHijriString(now);
  const ayah = ayahOfTheDay(now);

  return (
    <>
      {/* Greeting + date */}
      <div className="teacher-greeting">
        <div>
          <h1>Assalamu alaykum{name ? `, ${name}` : ''}</h1>
          <p className="sub">Here are your classes for today.</p>
        </div>
        <div className="date-card">
          <span className="cal"><Icon name="cal" size={20} /></span>
          <div>
            <div className="d1">{dateLabel}</div>
            {hijri && <div className="d2">{hijri}</div>}
          </div>
        </div>
      </div>

      {/* Today's classes */}
      <h2 className="text-h2" style={{ marginBottom: 4 }}>Today&apos;s classes</h2>
      <p className="text-body" style={{ marginBottom: 16 }}>
        Select a class to take attendance and record today&apos;s updates.
      </p>

      {classes.length === 0 ? (
        <EmptyState
          icon="principal"
          title="No classes assigned yet"
          body="Once your principal assigns you to a class, it will appear here and you can start today's class session."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {classes.map(cls => {
            const meta = [
              cls.academicYear,
              cls.gradeLevel,
            ].filter(Boolean);
            const wrappedToday = cls.lastSession?.date === today;

            return (
              <div key={cls.id} className="tclass">
                <div className={`tclass-icon ${cls.accent}`}>
                  <Icon name="book" size={20} />
                </div>
                <div className="tclass-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div className="tclass-name">{cls.name}</div>
                    {wrappedToday && <span className="badge badge-present">Wrapped today</span>}
                  </div>
                  <div className="tclass-meta">
                    {meta.length > 0 && (
                      <span><Icon name="cal" size={13} />{meta.join(' · ')}</span>
                    )}
                    <span><Icon name="users" size={13} />{cls.studentCount} student{cls.studentCount !== 1 ? 's' : ''}</span>
                  </div>

                  {cls.lastSession && (
                    <div className="tclass-session">
                      <div className={`tclass-session-head ${cls.accent}`}>
                        <Icon name="check" size={14} />
                        Last session ({shortDate(cls.lastSession.date)})
                      </div>
                      <div className="tclass-session-sub">
                        {cls.lastSession.present} present · {cls.lastSession.hifz} hifz update{cls.lastSession.hifz !== 1 ? 's' : ''} · {cls.lastSession.notes} note{cls.lastSession.notes !== 1 ? 's' : ''} sent
                      </div>
                    </div>
                  )}
                </div>
                <div className="tclass-cta">
                  <Link
                    href={`/teacher/${cls.id}/attendance`}
                    className={`btn ${cls.accent === 'green' ? 'btn-accent' : 'btn-outline-sky'}`}
                  >
                    {wrappedToday ? 'Update today’s session' : 'Start class session'} <Icon name="arrow" size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent activity — only when data already exists */}
      {recentActivity.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div className="section-head-row">
            <h2 className="text-h2" style={{ margin: 0 }}>Recent activity</h2>
            <Link href="/teacher/activity" className="link-arrow">
              View all activity <Icon name="arrow" size={13} />
            </Link>
          </div>
          <div className="app-card">
            <div className="activity-list">
              {recentActivity.map(a => (
                <Link key={a.id} href="/teacher/activity" className="activity-row">
                  <span className={`activity-icon ${a.kind}`}>
                    <Icon name={ACTIVITY_ICON[a.kind]} size={16} />
                  </span>
                  <span className="activity-main">
                    <span className="activity-title">{a.title}</span>
                    <span className="activity-time">{relativeTime(a.at)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ayah of the day */}
      <div className="ayah-card">
        <div className="ayah-eyebrow">Ayah of the day</div>
        <div className="ayah-arabic">{ayah.arabic}</div>
        <p className="ayah-translation">&ldquo;{ayah.translation}&rdquo;</p>
        <div className="ayah-ref">{ayah.reference}</div>
      </div>
    </>
  );
}
