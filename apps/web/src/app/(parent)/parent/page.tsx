import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { env } from '@/env';
import { getGuardianStudents, getStudentFeed, getParentTuition, getStudentHomework, getAnnouncements } from '../actions';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/marketing/icon';
import { buildAttentionItems } from '@/lib/parent-attention';

export default async function ParentHome() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [publicUser, students] = await Promise.all([
    db.query.users.findFirst({ where: eq(schema.users.id, user.id), columns: { fullName: true } }),
    getGuardianStudents(user.id),
  ]);

  if (students.length === 0) {
    return (
      <main className="app-main">
        <div className="feed-empty" style={{ marginTop: 48 }}>
          <h3>No students linked</h3>
          <p>Contact your school to link your children to your account.</p>
        </div>
      </main>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const [childData, announcements] = await Promise.all([
    Promise.all(students.map(async student => {
      const [{ attendance }, tuition, homework] = await Promise.all([
        getStudentFeed(student.id, today),
        getParentTuition(student.id),
        getStudentHomework(student.id),
      ]);
      const nextHomework = homework[0] ?? null;
      const attention = buildAttentionItems({
        basePath: `/parent/${student.id}`,
        attendance,
        nextHomework,
        tuition,
        today,
      }).map(item => ({ ...item, label: `${student.fullName.split(' ')[0]}: ${item.label}` }));
      return { student, attendance, tuition, nextHomework, attention };
    })),
    getAnnouncements(env.NEXT_PUBLIC_ORG_ID),
  ]);

  const allAttention = childData.flatMap(c => c.attention);
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const parentName = publicUser?.fullName?.split(' ')[0];

  return (
    <main className="app-main-wide">
      <div className="teacher-greeting" style={{ marginTop: 24, marginBottom: 24 }}>
        <div>
          <h1>Assalamu alaikum{parentName ? `, ${parentName}` : ''}</h1>
          <p className="sub">Here&apos;s an overview of your family.</p>
        </div>
        <div className="date-card">
          <span className="cal"><Icon name="cal" size={20} /></span>
          <div className="d1">{dateLabel}</div>
        </div>
      </div>

      <h2 className="text-h2" style={{ marginBottom: 10 }}>Needs your attention</h2>
      {allAttention.length > 0 ? (
        <div className="attention-list" style={{ marginBottom: 28 }}>
          {allAttention.map(item => (
            <a key={item.href + item.label} href={item.href} className={`attention-row tone-${item.tone}`}>
              <span className="attention-row-icon"><Icon name={item.icon} size={16} /></span>
              <span className="attention-row-label">{item.label}</span>
              <Icon name="chevron-right" size={14} />
            </a>
          ))}
        </div>
      ) : (
        <div className="app-card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <span style={{ color: 'var(--accent-700)', display: 'flex' }}><Icon name="check" size={18} /></span>
          <span style={{ fontSize: 14, color: 'var(--fg-2)' }}>Your family is all caught up.</span>
        </div>
      )}

      <h2 className="text-h2" style={{ marginBottom: 10 }}>Your children</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 28 }}>
        {childData.map(({ student, attendance, tuition, nextHomework }) => (
          <div key={student.id} className="app-card">
            <Link href={`/parent/${student.id}`} style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', textDecoration: 'none', display: 'block', marginBottom: 10 }}>
              {student.fullName}
            </Link>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {attendance && (
                <span className={`badge badge-${attendance.status}`} style={{ textTransform: 'capitalize' }}>{attendance.status} today</span>
              )}
              {tuition && (
                <span className={`badge badge-${tuition.status}`} style={{ textTransform: 'capitalize' }}>{tuition.status.replace('_', ' ')}</span>
              )}
            </div>
            {nextHomework && (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
                Homework due {new Date(`${nextHomework.dueDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 14 }}>
              <Link href={`/parent/${student.id}/report`} className="btn-link" style={{ fontSize: 13 }}>Progress report →</Link>
              <Link href={`/parent/${student.id}/journal`} className="btn-link" style={{ fontSize: 13 }}>Adab journal →</Link>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        <Link href="/parent/billing" className="quick-action">
          <span className="quick-action-icon"><Icon name="money" size={18} /></span>
          <span>
            <span className="quick-action-label" style={{ display: 'block' }}>Billing</span>
            <span className="quick-action-sub">View payments &amp; pay tuition</span>
          </span>
        </Link>
      </div>

      {announcements.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 className="text-h2" style={{ marginBottom: 10 }}>School announcements</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {announcements.slice(0, 3).map(a => (
              <div key={a.threadId} className="app-card">
                <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55, margin: '0 0 8px' }}>{a.content}</p>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
