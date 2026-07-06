import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import SkeletonPage from '@/components/skeleton-page';
import { Toaster } from '@/components/ui/toaster';
import TeacherNav from './teacher-nav';
import TeacherUserMenu from './teacher-user-menu';
import { NotificationBell } from '@/components/ui/notification-bell';
import { HelpLink } from '@/components/ui/help-link';
import { TaliblyLogo } from '@/components/ui/logo';
import { initialsOf } from '@/lib/initials';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const publicUser = await db.query.users.findFirst({
    where: eq(schema.users.id, user.id),
  });

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
