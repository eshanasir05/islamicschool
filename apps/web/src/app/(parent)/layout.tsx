import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import SkeletonPage from '@/components/skeleton-page';
import { Toaster } from '@/components/ui/toaster';
import { NotificationBell } from '@/components/ui/notification-bell';
import { HelpLink } from '@/components/ui/help-link';
import { TaliblyLogo } from '@/components/ui/logo';
import { initialsOf } from '@/lib/initials';
import ParentNav from './parent-nav';
import ParentUserMenu from './parent-user-menu';

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const publicUser = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });

  // Fetch children for the tab bar
  const guardianLinks = await db.query.studentGuardians.findMany({
    where: eq(schema.studentGuardians.guardianUserId, user.id),
    with: { student: true },
  });
  const studentMap = new Map<string, NonNullable<(typeof guardianLinks)[0]['student']>>();
  for (const g of guardianLinks) {
    if (g.student && !studentMap.has(g.student.id)) studentMap.set(g.student.id, g.student);
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
