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

export async function requireAdminForOrg(organizationId: string): Promise<AdminActorContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(schema.memberships.userId, user.id),
      eq(schema.memberships.organizationId, organizationId),
      eq(schema.memberships.status, 'active'),
      or(eq(schema.memberships.role, 'admin'), eq(schema.memberships.role, 'principal')),
    ),
    with: { user: { columns: { fullName: true, email: true } } },
  });

  if (!membership) {
    throw new Error('Forbidden');
  }

  return {
    userId: user.id,
    name: membership.user?.fullName ?? membership.user?.email ?? 'Admin',
    role: membership.role as AdminRole,
  };
}
