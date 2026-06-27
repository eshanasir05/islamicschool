import { env } from '@/env';
import { getAdminClasses } from '../../actions';

export default async function ClassesPage() {
  const classes = await getAdminClasses(env.NEXT_PUBLIC_ORG_ID);

  return (
    <main className="app-main">
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '24px 0 4px', color: 'var(--fg)' }}>Classes</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
        {classes.length} class{classes.length !== 1 ? 'es' : ''}
      </p>

      {classes.length === 0 ? (
        <div className="feed-empty"><p>No classes found. Add a class to get started.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {classes.map(cls => (
            <div key={cls.id} className="app-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>{cls.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {cls.teacherName} · {cls.studentCount} student{cls.studentCount !== 1 ? 's' : ''}
                  {cls.academicYear ? ` · ${cls.academicYear}` : ''}
                </div>
              </div>
              {cls.wrappedToday ? (
                <span className="badge badge-present">Wrapped ✓</span>
              ) : (
                <span className="badge badge-late">Pending</span>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
