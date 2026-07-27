import SkeletonPage from '@/components/skeleton-page';
import { HelpLink } from '@/components/ui/help-link';
import { TaliblyLogo } from '@/components/ui/logo';
import { NotificationBell } from '@/components/ui/notification-bell';
import { Toaster } from '@/components/ui/toaster';
import { env } from '@/env';
import { db, schema } from '@/lib/db';
import { initialsOf } from '@/lib/initials';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import ParentNav from './parent-nav';
import ParentUserMenu from './parent-user-menu';

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [publicUser, membership] = await Promise.all([
    db.query.users.findFirst({ where: eq(schema.users.id, user.id) }),
    db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, user.id),
        eq(schema.memberships.organizationId, env.NEXT_PUBLIC_ORG_ID),
        eq(schema.memberships.role, 'parent'),
        eq(schema.memberships.status, 'active'),
      ),
      columns: { id: true },
    }),
  ]);
  if (!membership) redirect('/sign-in?error=no-access');

  // Fetch children for the tab bar
  const guardianLinks = await db.query.studentGuardians.findMany({
    where: eq(schema.studentGuardians.guardianUserId, user.id),
    with: { student: true },
  });
  const studentMap = new Map<string, NonNullable<(typeof guardianLinks)[0]['student']>>();
  for (const g of guardianLinks) {
    if (
      g.student &&
      g.student.organizationId === env.NEXT_PUBLIC_ORG_ID &&
      !studentMap.has(g.student.id)
    ) {
      studentMap.set(g.student.id, g.student);
    }
  }
  const students = [...studentMap.values()];
  const name = publicUser?.fullName?.trim() || user.email || 'Parent';
  const initials = initialsOf(name);

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="app-header-logo" href="/parent">
          <TaliblyLogo iconSize={24} />
        </Link>
        <div className="app-header-right">
          <HelpLink />
          <NotificationBell />
          <ParentUserMenu name={name} initials={initials} avatarUrl={publicUser?.avatarUrl} />
        </div>
      </header>
      <div className="teacher-shell">
        <ParentNav students={students} />
        <div className="teacher-content">
          <Suspense fallback={<SkeletonPage />}>{children}</Suspense>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
