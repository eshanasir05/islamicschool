import Link from 'next/link';
import { env } from '@/env';
import { getAdminParents } from '../../actions';
import { EmptyState } from '@/components/ui/empty-state';

export default async function ParentsPage() {
  const parents = await getAdminParents(env.NEXT_PUBLIC_ORG_ID);

  return (
    <main className="app-main">
      <div className="page-heading">
        <h1 className="text-h1">Parents</h1>
        <Link href="/admin/parents/invite" className="btn btn-accent" style={{ fontSize: 13, padding: '7px 14px' }}>
          + Invite parent
        </Link>
      </div>
      <p className="text-body" style={{ marginBottom: 24 }}>
        {parents.length} parent{parents.length !== 1 ? 's' : ''} with portal access
      </p>

      {parents.length === 0 ? (
        <EmptyState
          icon="parent"
          title="No parents yet"
          body="Invite a parent and link them to their child. They'll see daily attendance, hifz, and tuition in their portal."
          cta={{ label: 'Invite parent', href: '/admin/parents/invite' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {parents.map(p => (
            <div key={p.userId} className="app-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{p.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {p.students.length > 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--fg)' }}>
                    {p.students.map(s => s.name).join(', ')}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>No student linked</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
