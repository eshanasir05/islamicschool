import { env } from '@/env';
import { getAdminClasses } from '../../actions';
import Link from 'next/link';

export default async function ClassesPage() {
  const classes = await getAdminClasses(env.NEXT_PUBLIC_ORG_ID);
  const active = classes.filter(c => !c.deletedAt);
  const archived = classes.filter(c => c.deletedAt);

  return (
    <main className="app-main">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>Classes</h1>
        <Link href="/admin/classes/new" className="btn btn-accent" style={{ fontSize: 13, padding: '6px 14px', textDecoration: 'none' }}>
          Add class
        </Link>
      </div>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
        {active.length} class{active.length !== 1 ? 'es' : ''}
      </p>

      {active.length === 0 ? (
        <div className="feed-empty"><p>No classes found. Add a class to get started.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {active.map(cls => (
            <Link key={cls.id} href={`/admin/classes/${cls.id}`} style={{ textDecoration: 'none' }}>
              <div className="app-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>{cls.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {cls.teacherName} · {cls.studentCount} student{cls.studentCount !== 1 ? 's' : ''}
                    {cls.academicYear ? ` · ${cls.academicYear}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {cls.wrappedToday ? (
                    <span className="badge badge-present">Wrapped</span>
                  ) : (
                    <span className="badge badge-late">Pending</span>
                  )}
                  <span style={{ color: 'var(--muted)', fontSize: 18 }}>›</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Archived</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {archived.map(cls => (
              <Link key={cls.id} href={`/admin/classes/${cls.id}`} style={{ textDecoration: 'none' }}>
                <div className="app-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.6, cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>{cls.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{cls.teacherName}</div>
                  </div>
                  <span className="badge badge-absent">Archived</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
