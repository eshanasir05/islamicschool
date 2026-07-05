import { env } from '@/env';
import { getAdminTeachers } from '../../actions';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';

export default async function TeachersPage() {
  const teachers = await getAdminTeachers(env.NEXT_PUBLIC_ORG_ID);

  return (
    <main className="app-main">
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Teachers</h1>
          <p className="page-description">{teachers.length} teacher{teachers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-actions">
          <Link href="/admin/teachers/invite" className="btn btn-accent">
            + Invite teacher
          </Link>
        </div>
      </div>

      {teachers.length === 0 ? (
        <EmptyState
          icon="teacher"
          title="No teachers yet"
          body="Invite your first teacher by email. They'll get a sign-in link and can start wrapping classes right away."
          cta={{ label: 'Invite teacher', href: '/admin/teachers/invite' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {teachers.map(t => (
            <div key={t.id} className="app-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {t.email}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {t.classes.length > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--fg)', marginBottom: 2 }}>
                    {t.classes.join(', ')}
                  </div>
                )}
                {t.lastSession && (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Last session: {t.lastSession}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
