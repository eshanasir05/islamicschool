import { env } from '@/env';
import { getAdminTeachers } from '../../actions';

export default async function TeachersPage() {
  const teachers = await getAdminTeachers(env.NEXT_PUBLIC_ORG_ID);

  return (
    <main className="app-main">
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '24px 0 4px', color: 'var(--fg)' }}>Teachers</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
        {teachers.length} teacher{teachers.length !== 1 ? 's' : ''}
      </p>

      {teachers.length === 0 ? (
        <div className="feed-empty"><p>No teachers found.</p></div>
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
