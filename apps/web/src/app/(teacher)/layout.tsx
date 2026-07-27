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
import TeacherNav from './teacher-nav';
import TeacherUserMenu from './teacher-user-menu';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [publicUser, membership] = await Promise.all([
    db.query.users.findFirst({
      where: eq(schema.users.id, user.id),
    }),
    db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, user.id),
        eq(schema.memberships.organizationId, env.NEXT_PUBLIC_ORG_ID),
        eq(schema.memberships.role, 'teacher'),
        eq(schema.memberships.status, 'active'),
      ),
      columns: { id: true },
    }),
  ]);
  if (!membership) redirect('/sign-in?error=no-access');

  const name = publicUser?.fullName?.trim() || user.email || 'Teacher';
  const initials = initialsOf(name);

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="app-header-logo" href="/teacher">
          <TaliblyLogo iconSize={24} />
        </Link>
        <div className="app-header-right">
          <HelpLink />
          <NotificationBell />
          <TeacherUserMenu name={name} initials={initials} avatarUrl={publicUser?.avatarUrl} />
        </div>
      </header>
      <div className="teacher-shell">
        <TeacherNav />
        <div className="teacher-content">
          <Suspense fallback={<SkeletonPage />}>{children}</Suspense>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
