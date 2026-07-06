import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import AdminNav from './admin-nav';
import SkeletonPage from '@/components/skeleton-page';
import { Toaster } from '@/components/ui/toaster';
import { NotificationBell } from '@/components/ui/notification-bell';
import { HelpLink } from '@/components/ui/help-link';
import { TaliblyLogo } from '@/components/ui/logo';
import { initialsOf } from '@/lib/initials';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const publicUser = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="app-header-logo" href="/admin">
          <TaliblyLogo iconSize={24} />
        </Link>
        <div className="app-header-right">
          <HelpLink />
          <NotificationBell />
          <Link href="/account" className="app-header-user" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
            <span className="avatar" style={{ width: 26, height: 26, fontSize: 11, overflow: 'hidden' }}>
              {publicUser?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={publicUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initialsOf(publicUser?.fullName ?? user.email ?? '?')
              )}
            </span>
            {publicUser?.fullName ?? user.email}
          </Link>
          <a className="app-logout" href="/auth/signout">Sign out</a>
        </div>
      </header>
      <AdminNav />
      <Suspense fallback={<SkeletonPage />}>{children}</Suspense>
      <Toaster />
    </div>
  );
}
