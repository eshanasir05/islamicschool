import { db, schema } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { and, eq, or } from 'drizzle-orm';
import { redirect } from 'next/navigation';

type AdminRole = 'admin' | 'principal';

export type AdminActorContext = {
  userId: string;
  name: string;
  role: AdminRole;
};

async function resolveAdminActorForOrg(
  organizationId: string,
): Promise<{ hasSession: boolean; actor: AdminActorContext | null }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hasSession: false, actor: null };

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(schema.memberships.userId, user.id),
      eq(schema.memberships.organizationId, organizationId),
      eq(schema.memberships.status, 'active'),
      or(eq(schema.memberships.role, 'admin'), eq(schema.memberships.role, 'principal')),
    ),
    with: { user: { columns: { fullName: true, email: true } } },
  });

  if (!membership) return { hasSession: true, actor: null };

  return {
    hasSession: true,
    actor: {
      userId: user.id,
      name: membership.user?.fullName ?? membership.user?.email ?? 'Admin',
      role: membership.role as AdminRole,
    },
  };
}

export async function getAdminActorForOrg(
  organizationId: string,
): Promise<AdminActorContext | null> {
  const { actor } = await resolveAdminActorForOrg(organizationId);
  return actor;
}

export async function requireAdminForOrg(organizationId: string): Promise<AdminActorContext> {
  const { actor, hasSession } = await resolveAdminActorForOrg(organizationId);
  if (!hasSession) redirect('/sign-in');
  if (!actor) throw new Error('Forbidden');
  return actor;
}
