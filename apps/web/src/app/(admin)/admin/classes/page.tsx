import { env } from '@/env';
import { getAdminClasses } from '../../actions';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { ToastOnParam } from '@/components/ui/toast-on-param';

type Props = { searchParams: Promise<{ notice?: string }> };

export default async function ClassesPage({ searchParams }: Props) {
  const { notice } = await searchParams;
  const classes = await getAdminClasses(env.NEXT_PUBLIC_ORG_ID);
  const active = classes.filter(c => !c.deletedAt);
  const archived = classes.filter(c => c.deletedAt);

  return (
    <main className="app-main">
      <ToastOnParam notice={notice} />
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Classes</h1>
          <p className="page-description">{active.length} class{active.length !== 1 ? 'es' : ''}</p>
        </div>
        <div className="page-actions">
          <Link href="/admin/classes/new" className="btn btn-accent">
            Add class
          </Link>
        </div>
      </div>

      {active.length === 0 ? (
        <EmptyState
          icon="principal"
          title="No classes yet"
          body="Add your first class, assign a teacher, and enroll students to start tracking sessions."
          cta={{ label: 'Add class', href: '/admin/classes/new' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {active.map(cls => (
            <Link key={cls.id} href={`/admin/classes/${cls.id}`} className="app-card-link">
              <div className="app-card is-interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <div className="text-label" style={{ marginBottom: 8 }}>Archived</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {archived.map(cls => (
              <Link key={cls.id} href={`/admin/classes/${cls.id}`} style={{ textDecoration: 'none' }}>
                <div className="app-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.6, cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>{cls.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{cls.teacherName}</div>
                  </div>
                  <span className="badge badge-neutral">Archived</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
