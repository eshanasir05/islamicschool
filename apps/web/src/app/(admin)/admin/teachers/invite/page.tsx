import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { env } from '@/env';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { SubmitButton } from '@/components/ui/submit-button';
import { logActivity } from '@/lib/activity-log';

type Props = { searchParams: Promise<{ status?: string; msg?: string }> };

const STATUS_MESSAGES: Record<string, { text: string; variant: 'success' | 'warn' | 'error' }> = {
  invited:        { text: 'Invite sent! The teacher will receive an email with a sign-in link.', variant: 'success' },
  added:          { text: 'Teacher already has an account — added to this school as a teacher.', variant: 'success' },
  already_member: { text: 'This teacher is already a member of this school.', variant: 'warn' },
  invalid_email:  { text: 'Please enter a valid email address.', variant: 'error' },
  not_admin:      { text: 'Permission denied. Only admins can invite teachers.', variant: 'error' },
};

export default async function InviteTeacherPage({ searchParams }: Props) {
  const { status, msg } = await searchParams;
  const statusInfo = status ? STATUS_MESSAGES[status] : null;
  const errorMsg = status === 'error' ? decodeURIComponent(msg ?? 'Something went wrong.') : null;

  async function inviteAction(formData: FormData) {
    'use server';

    const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? '';
    const fullName = (formData.get('fullName') as string | null)?.trim() ?? '';
    const orgId = env.NEXT_PUBLIC_ORG_ID;

    // Basic email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      redirect('/admin/teachers/invite?status=invalid_email');
    }

    // Verify the calling user is admin or principal
    const supabase = await createSupabaseServerClient();
    const { data: { user: caller } } = await supabase.auth.getUser();
    if (!caller) redirect('/sign-in');

    const callerMembership = await db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, caller.id),
        eq(schema.memberships.organizationId, orgId),
        eq(schema.memberships.status, 'active'),
      ),
    });
    if (!callerMembership || !['admin', 'principal'].includes(callerMembership.role)) {
      redirect('/admin/teachers/invite?status=not_admin');
    }

    const callerUser = await db.query.users.findFirst({ where: eq(schema.users.id, caller.id), columns: { fullName: true } });
    const actorName = callerUser?.fullName ?? 'Unknown';

    // Check if this email already exists in public.users
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (existingUser) {
      // Check for existing teacher membership in this org
      const existingMembership = await db.query.memberships.findFirst({
        where: and(
          eq(schema.memberships.userId, existingUser.id),
          eq(schema.memberships.organizationId, orgId),
          eq(schema.memberships.role, 'teacher'),
        ),
      });
      if (existingMembership) {
        redirect('/admin/teachers/invite?status=already_member');
      }

      // Existing user, no teacher membership yet — just add it
      await db
        .insert(schema.memberships)
        .values({ userId: existingUser.id, organizationId: orgId, role: 'teacher', status: 'active' })
        .onConflictDoNothing();

      await logActivity({
        organizationId: orgId, actorUserId: caller.id, actorName,
        action: 'teacher.linked', targetType: 'teacher', targetId: existingUser.id,
        metadata: { targetLabel: existingUser.fullName },
      });

      redirect('/admin/teachers/invite?status=added');
    }

    // New user — send a Supabase invite email
    const serviceClient = await createSupabaseServiceClient();
    const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: { full_name: fullName || email.split('@')[0] },
    });

    if (error || !data.user) {
      // Supabase returns an error if auth user exists but wasn't in public.users.
      // Try to recover by fetching the user list and matching by email — unlikely
      // but gracefully surfaced to the admin.
      const errMsg = encodeURIComponent(error?.message ?? 'Failed to send invite.');
      redirect(`/admin/teachers/invite?status=error&msg=${errMsg}`);
    }

    const newUserId = data.user.id;
    const displayName = fullName || (email.split('@')[0] ?? email);

    // Insert into public.users (use the Supabase auth UUID as PK)
    await db
      .insert(schema.users)
      .values({ id: newUserId, email, fullName: displayName })
      .onConflictDoNothing();

    // Insert teacher membership
    await db
      .insert(schema.memberships)
      .values({ userId: newUserId, organizationId: orgId, role: 'teacher', status: 'active' })
      .onConflictDoNothing();

    await logActivity({
      organizationId: orgId, actorUserId: caller.id, actorName,
      action: 'teacher.invited', targetType: 'teacher', targetId: newUserId,
      metadata: { targetLabel: displayName },
    });

    redirect('/admin/teachers/invite?status=invited');
  }

  return (
    <main className="app-main">
      <Breadcrumb
        items={[
          { label: 'Teachers', href: '/admin/teachers' },
          { label: 'Invite' },
        ]}
      />

      <h1 className="text-h1" style={{ marginBottom: 6 }}>Invite a teacher</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        They&apos;ll receive an email with a link to sign in. No password required on your end.
      </p>

      {statusInfo && (
        <div className={`banner banner-${statusInfo.variant}`}>
          {statusInfo.text}
        </div>
      )}

      {errorMsg && (
        <div className="banner banner-error">
          {errorMsg}
        </div>
      )}

      <div className="app-card" style={{ maxWidth: 480 }}>
        <form action={inviteAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>
              Email address <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="teacher@school.org"
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)', fontSize: 14,
                background: 'var(--surface)', color: 'var(--fg)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>
              Full name
            </label>
            <input
              name="fullName"
              type="text"
              placeholder="Sister Amina"
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)', fontSize: 14,
                background: 'var(--surface)', color: 'var(--fg)',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Optional — used for display. Teacher can update it after signing in.
            </p>
          </div>

          <SubmitButton
            className="btn btn-accent"
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
            pendingLabel="Sending…"
          >
            Send invite
          </SubmitButton>
        </form>
      </div>

      <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--surface-2, #f8f9fa)', borderRadius: 8, fontSize: 13, color: 'var(--muted)', maxWidth: 480 }}>
        <strong style={{ color: 'var(--fg)' }}>How it works:</strong> The teacher receives a sign-in link from Supabase.
        Clicking it logs them in directly and lands them on the teacher dashboard.
        They can set a password later using &ldquo;Forgot password&rdquo; on the sign-in page.
      </div>
    </main>
  );
}
