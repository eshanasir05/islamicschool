import { SubmitButton } from '@/components/ui/submit-button';
import { ToastOnParam } from '@/components/ui/toast-on-param';
import { env } from '@/env';
import { requireAdminForOrg } from '@/lib/admin-auth';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { restoreOnboardingChecklist } from '../../actions';

type Props = { searchParams: Promise<{ notice?: string }> };

const TYPE_LABELS: Record<string, string> = {
  weekend_school: 'Weekend school',
  full_time: 'Full-time school',
  tutor: 'Tutor / small group',
};

export default async function AdminSettingsPage({ searchParams }: Props) {
  const { notice } = await searchParams;
  const orgId = env.NEXT_PUBLIC_ORG_ID;
  await requireAdminForOrg(orgId);

  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, orgId),
  });

  if (!org)
    return (
      <main className="app-main">
        <p>Organization not found.</p>
      </main>
    );

  const address = (org.address ?? {}) as {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  const cookieStore = await cookies();
  const checklistDismissed = cookieStore.get('onboarding_dismissed')?.value === 'true';

  async function updateOrgAction(formData: FormData) {
    'use server';
    const name = (formData.get('name') as string | null)?.trim() ?? '';
    if (!name) redirect('/admin/settings');

    const orgId = env.NEXT_PUBLIC_ORG_ID;
    await requireAdminForOrg(orgId);

    const street = (formData.get('street') as string | null)?.trim() ?? '';
    const city = (formData.get('city') as string | null)?.trim() ?? '';
    const state = (formData.get('state') as string | null)?.trim() ?? '';
    const zip = (formData.get('zip') as string | null)?.trim() ?? '';
    const hasAddress = street || city || state || zip;

    await db
      .update(schema.organizations)
      .set({ name, address: hasAddress ? { street, city, state, zip } : null })
      .where(eq(schema.organizations.id, orgId));

    redirect('/admin/settings?notice=settings_saved');
  }

  return (
    <main className="app-main">
      <ToastOnParam notice={notice} />
      <h1 className="text-h1" style={{ margin: '24px 0' }}>
        Settings
      </h1>

      {/* Org info */}
      <div className="app-card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 16px' }}>
          Organization
        </h2>

        <form
          action={updateOrgAction}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}
        >
          <div>
            <label
              htmlFor="orgName"
              className="text-label"
              style={{ display: 'block', marginBottom: 4 }}
            >
              School name
            </label>
            <input
              id="orgName"
              name="name"
              type="text"
              defaultValue={org.name}
              required
              className="form-input"
              style={{ maxWidth: 400 }}
            />
          </div>

          <div>
            <label
              htmlFor="street"
              className="text-label"
              style={{ display: 'block', marginBottom: 4 }}
            >
              Street address
            </label>
            <input
              id="street"
              name="street"
              type="text"
              defaultValue={address.street ?? ''}
              placeholder="123 Main St"
              className="form-input"
              style={{ maxWidth: 400 }}
            />
          </div>

          <div className="form-grid-3">
            <div>
              <label
                htmlFor="city"
                className="text-label"
                style={{ display: 'block', marginBottom: 4 }}
              >
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={address.city ?? ''}
                className="form-input"
              />
            </div>
            <div>
              <label
                htmlFor="state"
                className="text-label"
                style={{ display: 'block', marginBottom: 4 }}
              >
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                defaultValue={address.state ?? ''}
                className="form-input"
              />
            </div>
            <div>
              <label
                htmlFor="zip"
                className="text-label"
                style={{ display: 'block', marginBottom: 4 }}
              >
                ZIP
              </label>
              <input
                id="zip"
                name="zip"
                type="text"
                defaultValue={address.zip ?? ''}
                className="form-input"
              />
            </div>
          </div>

          <SubmitButton
            className="btn btn-accent"
            style={{ alignSelf: 'flex-start', fontSize: 13, padding: '7px 14px' }}
            pendingLabel="Saving…"
          >
            Save
          </SubmitButton>
        </form>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 4,
              }}
            >
              Type
            </div>
            <div style={{ fontSize: 14, color: 'var(--fg)' }}>
              {TYPE_LABELS[org.type] ?? org.type}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 4,
              }}
            >
              Timezone
            </div>
            <div style={{ fontSize: 14, color: 'var(--fg)' }}>{org.timezone}</div>
          </div>
          {org.ein && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 4,
                }}
              >
                EIN
              </div>
              <div style={{ fontSize: 14, color: 'var(--fg)' }}>{org.ein}</div>
            </div>
          )}
          <div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 4,
              }}
            >
              501(c)(3)
            </div>
            <div style={{ fontSize: 14, color: 'var(--fg)' }}>{org.is501c3 ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>

      {/* Account shortcut */}
      <div className="app-card">
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 12px' }}>
          Your account
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 12px' }}>
          Update your display name or change your password.
        </p>
        <a
          href="/account"
          className="btn btn-ghost"
          style={{ fontSize: 13, display: 'inline-block' }}
        >
          Go to Account →
        </a>
      </div>

      <div className="app-card" style={{ marginTop: 16 }}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--fg)',
            margin: '0 0 4px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Ramadan &amp; holiday schedule
          <span className="badge-coming-soon">COMING SOON</span>
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          Set Ramadan hours, holiday closures, and automatic attendance adjustments for irregular
          calendars — so a closure day never shows up as an absence. On the roadmap for a future
          release.
        </p>
      </div>

      {checklistDismissed && (
        <div className="app-card" style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 12px' }}>
            Getting started checklist
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 12px' }}>
            You dismissed the setup checklist from the dashboard.
          </p>
          <form
            action={async () => {
              'use server';
              await restoreOnboardingChecklist();
            }}
          >
            <button type="submit" className="btn btn-ghost" style={{ fontSize: 13 }}>
              Show it again
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
