import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { env } from '@/env';
import { ToastOnParam } from '@/components/ui/toast-on-param';
import { SubmitButton } from '@/components/ui/submit-button';

type Props = { searchParams: Promise<{ notice?: string }> };

const TYPE_LABELS: Record<string, string> = {
  weekend_school: 'Weekend school',
  full_time: 'Full-time school',
  tutor: 'Tutor / small group',
};

export default async function AdminSettingsPage({ searchParams }: Props) {
  const { notice } = await searchParams;

  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, env.NEXT_PUBLIC_ORG_ID),
  });

  if (!org) return <main className="app-main"><p>Organization not found.</p></main>;

  async function updateOrgAction(formData: FormData) {
    'use server';
    const name = (formData.get('name') as string | null)?.trim() ?? '';
    if (!name) redirect('/admin/settings');

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/sign-in');

    const membership = await db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, user.id),
        eq(schema.memberships.organizationId, env.NEXT_PUBLIC_ORG_ID),
        eq(schema.memberships.status, 'active'),
      ),
    });
    if (!membership || !['admin', 'principal'].includes(membership.role)) {
      redirect('/admin/settings');
    }

    await db
      .update(schema.organizations)
      .set({ name })
      .where(eq(schema.organizations.id, env.NEXT_PUBLIC_ORG_ID));

    redirect('/admin/settings?notice=settings_saved');
  }

  return (
    <main className="app-main">
      <ToastOnParam notice={notice} />
      <h1 className="text-h1" style={{ margin: '24px 0' }}>Settings</h1>

      {/* Org info */}
      <div className="app-card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 16px' }}>Organization</h2>

        <form action={updateOrgAction} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <div>
            <label htmlFor="orgName" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              School name
            </label>
            <input
              id="orgName"
              name="name"
              type="text"
              defaultValue={org.name}
              required
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)', fontSize: 14,
                background: 'var(--surface)', color: 'var(--fg)',
                boxSizing: 'border-box', maxWidth: 400,
              }}
            />
          </div>
          <SubmitButton className="btn btn-accent" style={{ alignSelf: 'flex-start', fontSize: 13, padding: '7px 14px' }} pendingLabel="Saving…">
            Save
          </SubmitButton>
        </form>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Type</div>
            <div style={{ fontSize: 14, color: 'var(--fg)' }}>{TYPE_LABELS[org.type] ?? org.type}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Timezone</div>
            <div style={{ fontSize: 14, color: 'var(--fg)' }}>{org.timezone}</div>
          </div>
          {org.ein && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>EIN</div>
              <div style={{ fontSize: 14, color: 'var(--fg)' }}>{org.ein}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>501(c)(3)</div>
            <div style={{ fontSize: 14, color: 'var(--fg)' }}>{org.is501c3 ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>

      {/* Account shortcut */}
      <div className="app-card">
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 12px' }}>Your account</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 12px' }}>
          Update your display name or change your password.
        </p>
        <a href="/account" className="btn btn-ghost" style={{ fontSize: 13, display: 'inline-block' }}>
          Go to Account →
        </a>
      </div>
    </main>
  );
}
