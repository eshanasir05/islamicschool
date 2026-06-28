import Link from 'next/link';
import { env } from '@/env';
import { getAdminParents } from '../../actions';

export default async function ParentsPage() {
  const parents = await getAdminParents(env.NEXT_PUBLIC_ORG_ID);

  return (
    <main className="app-main">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--fg)' }}>Parents</h1>
        <Link href="/admin/parents/invite" className="btn btn-accent" style={{ fontSize: 13, padding: '7px 14px' }}>
          + Invite parent
        </Link>
      </div>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
        {parents.length} parent{parents.length !== 1 ? 's' : ''} with portal access
      </p>

      {parents.length === 0 ? (
        <div className="feed-empty">
          <p>No parents yet. Invite one to get started.</p>
        </div>
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
