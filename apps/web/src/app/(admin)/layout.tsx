import SkeletonPage from '@/components/skeleton-page';
import { HelpLink } from '@/components/ui/help-link';
import { TaliblyLogo } from '@/components/ui/logo';
import { NotificationBell } from '@/components/ui/notification-bell';
import { Toaster } from '@/components/ui/toaster';
import { env } from '@/env';
import { db, schema } from '@/lib/db';
import { initialsOf } from '@/lib/initials';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { and, eq, inArray } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import AdminNav from './admin-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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
        eq(schema.memberships.status, 'active'),
        inArray(schema.memberships.role, ['admin', 'principal']),
      ),
      columns: { id: true },
    }),
  ]);
  if (!membership) redirect('/sign-in?error=no-access');

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="app-header-logo" href="/admin">
          <TaliblyLogo iconSize={24} />
        </Link>
        <div className="app-header-right">
          <HelpLink />
          <NotificationBell />
          <Link
            href="/account"
            className="app-header-user"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <span
              className="avatar"
              style={{ width: 26, height: 26, fontSize: 11, overflow: 'hidden' }}
            >
              {publicUser?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={publicUser.avatarUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initialsOf(publicUser?.fullName ?? user.email ?? '?')
              )}
            </span>
            {publicUser?.fullName ?? user.email}
          </Link>
          <a className="app-logout" href="/auth/signout">
            Sign out
          </a>
        </div>
      </header>
      <AdminNav />
      <Suspense fallback={<SkeletonPage />}>{children}</Suspense>
      <Toaster />
    </div>
  );
}
