import { redirect } from 'next/navigation';
import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { env } from '@/env';

type Props = { searchParams: Promise<{ status?: string }> };

const STATUS_MESSAGES: Record<string, { text: string; tone: 'success' | 'warn' | 'error' }> = {
  invited:         { text: 'Invite sent! The parent will receive an email with a sign-in link and will be linked to the selected student.', tone: 'success' },
  added:           { text: 'Parent already has an account — added as a parent and linked to the selected student.', tone: 'success' },
  already_linked:  { text: 'This parent is already linked to that student. No changes were made.', tone: 'warn' },
  invalid_email:   { text: 'Please enter a valid email address.', tone: 'error' },
  missing_student: { text: 'Please select a student to link this parent to.', tone: 'error' },
  not_admin:       { text: 'Permission denied. Only admins can invite parents.', tone: 'error' },
  error:           { text: 'Something went wrong. Please try again.', tone: 'error' },
};

const TONE_STYLES = {
  success: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
  warn:    { color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  error:   { color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
};

export default async function InviteParentPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const statusInfo = status ? STATUS_MESSAGES[status] : null;

  // Fetch active students for the dropdown
  const students = await db.query.students.findMany({
    where: and(
      eq(schema.students.organizationId, env.NEXT_PUBLIC_ORG_ID),
      eq(schema.students.status, 'active'),
    ),
    orderBy: (s, { asc }) => asc(s.fullName),
  });

  async function inviteParentAction(formData: FormData) {
    'use server';

    const email     = (formData.get('email') as string | null)?.trim().toLowerCase() ?? '';
    const fullName  = (formData.get('fullName') as string | null)?.trim() ?? '';
    const studentId = (formData.get('studentId') as string | null)?.trim() ?? '';
    const relationship = (formData.get('relationship') as string | null)?.trim() ?? null;
    const orgId = env.NEXT_PUBLIC_ORG_ID;

    // Validate inputs
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      redirect('/admin/parents/invite?status=invalid_email');
    }
    if (!studentId) {
      redirect('/admin/parents/invite?status=missing_student');
    }

    // Verify caller is admin or principal
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
      redirect('/admin/parents/invite?status=not_admin');
    }

    // Verify the submitted studentId belongs to this org (prevent cross-org injection)
    const student = await db.query.students.findFirst({
      where: and(
        eq(schema.students.id, studentId),
        eq(schema.students.organizationId, orgId),
      ),
    });
    if (!student) {
      redirect('/admin/parents/invite?status=missing_student');
    }

    // Check if this email already exists in public.users
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    let parentUserId: string;

    if (existingUser) {
      parentUserId = existingUser.id;

      // Upsert parent membership
      await db
        .insert(schema.memberships)
        .values({ userId: parentUserId, organizationId: orgId, role: 'parent', status: 'active' })
        .onConflictDoNothing();

      // Check if already linked to this student
      const existingLink = await db.query.studentGuardians.findFirst({
        where: and(
          eq(schema.studentGuardians.guardianUserId, parentUserId),
          eq(schema.studentGuardians.studentId, studentId),
        ),
      });
      if (existingLink) {
        redirect('/admin/parents/invite?status=already_linked');
      }

      // Link to student
      await db.insert(schema.studentGuardians).values({
        studentId,
        guardianUserId: parentUserId,
        relationship: relationship || null,
        isPrimary: true,
        receivesNotifications: true,
      });

      redirect('/admin/parents/invite?status=added');
    }

    // New user — send Supabase invite email
    const serviceClient = await createSupabaseServiceClient();
    const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: { full_name: fullName || email.split('@')[0] },
    });

    if (error || !data.user) {
      redirect('/admin/parents/invite?status=error');
    }

    parentUserId = data.user.id;
    const displayName = fullName || (email.split('@')[0] ?? email);

    // Insert public.users row
    await db
      .insert(schema.users)
      .values({ id: parentUserId, email, fullName: displayName })
      .onConflictDoNothing();

    // Insert parent membership
    await db
      .insert(schema.memberships)
      .values({ userId: parentUserId, organizationId: orgId, role: 'parent', status: 'active' })
      .onConflictDoNothing();

    // Link to student
    await db.insert(schema.studentGuardians).values({
      studentId,
      guardianUserId: parentUserId,
      relationship: relationship || null,
      isPrimary: true,
      receivesNotifications: true,
    });

    redirect('/admin/parents/invite?status=invited');
  }

  const toneStyle = statusInfo ? TONE_STYLES[statusInfo.tone] : null;

  return (
    <main className="app-main">
      <div style={{ marginTop: 24, marginBottom: 20 }}>
        <Link href="/admin/parents" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
          ← Parents
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 6px', color: 'var(--fg)' }}>Invite a parent</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
        The parent will receive an email with a sign-in link and will immediately be linked to the selected student.
      </p>

      {statusInfo && toneStyle && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 14,
          color: toneStyle.color, background: toneStyle.bg, border: `1px solid ${toneStyle.border}`,
        }}>
          {statusInfo.text}
        </div>
      )}

      <div className="app-card" style={{ maxWidth: 500 }}>
        <form action={inviteParentAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>
              Email address <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="parent@example.com"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--surface)', color: 'var(--fg)', boxSizing: 'border-box' }}
            />
          </div>

          {/* Full name */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>
              Full name
            </label>
            <input
              name="fullName"
              type="text"
              placeholder="Sister Fatima"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--surface)', color: 'var(--fg)', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Optional — parent can update after signing in.</p>
          </div>

          {/* Student select */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>
              Link to student <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            {students.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--muted)' }}>
                No students found.{' '}
                <Link href="/admin/students/new" style={{ color: 'var(--accent)' }}>Add a student first.</Link>
              </p>
            ) : (
              <select
                name="studentId"
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--surface)', color: 'var(--fg)', boxSizing: 'border-box' }}
              >
                <option value="">— Select a student —</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            )}
          </div>

          {/* Relationship */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>
              Relationship
            </label>
            <select
              name="relationship"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--surface)', color: 'var(--fg)', boxSizing: 'border-box' }}
            >
              <option value="">— Select —</option>
              <option value="mother">Mother</option>
              <option value="father">Father</option>
              <option value="guardian">Guardian</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-accent"
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
            disabled={students.length === 0}
          >
            Send invite
          </button>
        </form>
      </div>

      <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--surface-2, #f8f9fa)', borderRadius: 8, fontSize: 13, color: 'var(--muted)', maxWidth: 500 }}>
        <strong style={{ color: 'var(--fg)' }}>How it works:</strong> The parent receives a sign-in link by email.
        Clicking it logs them in directly and shows them their child&apos;s feed and billing information.
        They can set a password later via &ldquo;Forgot password&rdquo;.
      </div>
    </main>
  );
}
