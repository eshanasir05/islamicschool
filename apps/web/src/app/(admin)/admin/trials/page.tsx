import { env } from '@/env';
import Link from 'next/link';
import { getAdminTrials } from '../../actions';
import { EmptyState } from '@/components/ui/empty-state';
import { ToastOnParam } from '@/components/ui/toast-on-param';

const statusBadge: Record<string, string> = {
  scheduled: 'badge badge-late',
  assessed: 'badge badge-sabqi',
  converted: 'badge badge-present',
  cancelled: 'badge badge-absent',
};

type Props = { searchParams: Promise<{ notice?: string }> };

export default async function AdminTrialsPage({ searchParams }: Props) {
  const { notice } = await searchParams;
  const trials = await getAdminTrials(env.NEXT_PUBLIC_ORG_ID);

  return (
    <main className="app-main">
      <ToastOnParam notice={notice} />
      <div className="page-heading">
        <h1 className="text-h1">Trial classes</h1>
        <Link href="/admin/trials/new" className="btn btn-accent" style={{ fontSize: 13, padding: '7px 14px' }}>
          + New trial
        </Link>
      </div>
      <p className="text-body" style={{ marginBottom: 24 }}>
        {trials.length} trial{trials.length !== 1 ? 's' : ''} on record
      </p>

      {trials.length === 0 ? (
        <EmptyState
          icon="cal"
          title="No trials scheduled yet"
          body="Schedule a trial class for a family who reached out, assign a teacher for the placement assessment, and convert them to an enrolled student when ready."
          cta={{ label: 'New trial', href: '/admin/trials/new' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {trials.map(t => (
            <Link key={t.id} href={`/admin/trials/${t.id}`} className="app-card-link">
              <div className="app-card is-interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--fg)' }}>{t.studentFirstName} {t.studentLastName}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {t.guardianName} · {t.assignedTeacher?.fullName ?? 'No teacher assigned'}
                    {t.scheduledDate ? ` · ${t.scheduledDate}` : ''}
                  </div>
                </div>
                <span className={statusBadge[t.status] ?? 'badge'} style={{ textTransform: 'capitalize' }}>{t.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
