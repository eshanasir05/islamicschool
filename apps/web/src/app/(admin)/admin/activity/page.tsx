import { env } from '@/env';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { getActivityLog, describeActivity, ACTIVITY_LABELS, type ActivityAction } from '@/lib/activity-log';
import { EmptyState } from '@/components/ui/empty-state';

type Props = {
  searchParams: Promise<{ actor?: string; action?: string; from?: string; to?: string }>;
};

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
}

export default async function AdminActivityPage({ searchParams }: Props) {
  const { actor, action, from, to } = await searchParams;
  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const [entries, actors] = await Promise.all([
    getActivityLog(orgId, {
      actorUserId: actor || undefined,
      action: (action as ActivityAction) || undefined,
      fromDate: from || undefined,
      toDate: to || undefined,
    }),
    db.selectDistinct({ id: schema.activityLog.actorUserId, name: schema.activityLog.actorName })
      .from(schema.activityLog)
      .where(eq(schema.activityLog.organizationId, orgId))
      .orderBy(schema.activityLog.actorName),
  ]);

  const actorOptions = actors.filter(a => a.id !== null);

  return (
    <main className="app-main">
      <h1 className="text-h1" style={{ marginTop: 24, marginBottom: 6 }}>Activity Log</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        Who did what, and when — school-wide, for this org only.
      </p>

      <form method="get" className="app-card" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <label htmlFor="actor" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Actor
          </label>
          <select
            id="actor" name="actor" defaultValue={actor ?? ''}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface)', color: 'var(--fg)', minWidth: 160 }}
          >
            <option value="">All people</option>
            {actorOptions.map(a => (
              <option key={a.id} value={a.id ?? ''}>{a.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="action" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Action type
          </label>
          <select
            id="action" name="action" defaultValue={action ?? ''}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface)', color: 'var(--fg)', minWidth: 180 }}
          >
            <option value="">All actions</option>
            {(Object.keys(ACTIVITY_LABELS) as ActivityAction[]).map(a => (
              <option key={a} value={a}>{a.replace(/[._]/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="from" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            From
          </label>
          <input
            id="from" name="from" type="date" defaultValue={from ?? ''}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface)', color: 'var(--fg)' }}
          />
        </div>

        <div>
          <label htmlFor="to" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            To
          </label>
          <input
            id="to" name="to" type="date" defaultValue={to ?? ''}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface)', color: 'var(--fg)' }}
          />
        </div>

        <button type="submit" className="btn btn-accent" style={{ fontSize: 13, padding: '8px 16px' }}>Filter</button>
        {(actor || action || from || to) && (
          <a href="/admin/activity" className="btn btn-ghost" style={{ fontSize: 13, padding: '8px 14px' }}>Clear</a>
        )}
      </form>

      {entries.length === 0 ? (
        <EmptyState
          icon="activity"
          title="No activity yet"
          body="As admins and teachers use Talibly — adding students, posting announcements, recording hifz — it will show up here."
        />
      ) : (
        <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              style={{
                padding: '12px 16px',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{entry.actorName}</span>{' '}
                <span style={{ color: 'var(--muted)' }}>{describeActivity(entry)}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                {formatWhen(new Date(entry.createdAt))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
