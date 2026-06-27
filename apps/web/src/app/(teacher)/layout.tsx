import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { env } from '@/env';
import Link from 'next/link';
import SkeletonPage from '@/components/skeleton-page';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const publicUser = await db.query.users.findFirst({
    where: eq(schema.users.id, user.id),
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="app-header-logo" href="/teacher">
          <span className="mark">T</span>
          <span>talibly</span>
        </Link>
        <div className="app-header-right">
          <span className="app-header-user">{publicUser?.fullName ?? user.email}</span>
          <a className="app-logout" href="/auth/signout">Sign out</a>
        </div>
      </header>
      <Suspense fallback={<SkeletonPage />}>{children}</Suspense>
    </div>
  );
}
