import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { env } from '@/env';
import Link from 'next/link';
import PasswordForm from './password-form';
import { SubmitButton } from '@/components/ui/submit-button';

function roleHome(role: string) {
  if (role === 'teacher') return '/teacher';
  if (role === 'parent') return '/parent';
  return '/admin';
}

type Props = { searchParams: Promise<{ updated?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const { updated: updatedParam } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [publicUser, membership] = await Promise.all([
    db.query.users.findFirst({ where: eq(schema.users.id, user.id) }),
    db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, user.id),
        eq(schema.memberships.organizationId, env.NEXT_PUBLIC_ORG_ID),
        eq(schema.memberships.status, 'active'),
      ),
    }),
  ]);

  const backHref = membership ? roleHome(membership.role) : '/';

  async function updateNameAction(formData: FormData) {
    'use server';
    const fullName = (formData.get('fullName') as string | null)?.trim() ?? '';
    if (!fullName) return;
    const supabase2 = await createSupabaseServerClient();
    const { data: { user: caller } } = await supabase2.auth.getUser();
    if (!caller) redirect('/sign-in');
    await db
      .update(schema.users)
      .set({ fullName })
      .where(eq(schema.users.id, caller.id));
    redirect('/account?updated=1');
  }

  const updated = updatedParam === '1';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header className="app-header">
        <Link className="app-header-logo" href={backHref}>
          <span className="mark">T</span>
          <span>talibly</span>
        </Link>
        <div className="app-header-right">
          <a className="app-logout" href="/auth/signout">Sign out</a>
        </div>
      </header>

      <main className="app-main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 20 }}>
          <Link href={backHref} style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
            ← Back
          </Link>
        </div>

        <h1 className="text-h1" style={{ marginBottom: 24 }}>Account</h1>

        {updated && (
          <div className="banner banner-success">Display name updated.</div>
        )}

        {/* Profile */}
        <div className="app-card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 16px' }}>Profile</h2>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</div>
            <div style={{ fontSize: 14, color: 'var(--fg)' }}>{user.email}</div>
          </div>

          <form action={updateNameAction} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label htmlFor="fullName" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Display name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                defaultValue={publicUser?.fullName ?? ''}
                required
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', fontSize: 14,
                  background: 'var(--surface)', color: 'var(--fg)',
                  boxSizing: 'border-box', maxWidth: 360,
                }}
              />
            </div>
            <SubmitButton className="btn btn-accent" style={{ alignSelf: 'flex-start', fontSize: 13, padding: '7px 14px' }} pendingLabel="Saving…">
              Save name
            </SubmitButton>
          </form>
        </div>

        {/* Password */}
        <div className="app-card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 16px' }}>Change password</h2>
          <PasswordForm />
        </div>

        {/* Role info */}
        {membership && (
          <div className="app-card">
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 12px' }}>Role</h2>
            <div style={{ fontSize: 14, color: 'var(--fg)', textTransform: 'capitalize' }}>
              {membership.role}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Contact your administrator to change your role.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
