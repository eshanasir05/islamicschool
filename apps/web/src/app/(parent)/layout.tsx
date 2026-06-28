import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import SkeletonPage from '@/components/skeleton-page';

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

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="app-header-logo" href="/parent">
          <span className="mark">T</span>
          <span>talibly</span>
        </Link>
        <div className="app-header-right">
          <Link href="/account" className="app-header-user" style={{ textDecoration: 'none', color: 'inherit' }}>{publicUser?.fullName ?? user.email}</Link>
          <a className="app-logout" href="/auth/signout">Sign out</a>
        </div>
      </header>
      {students.length > 0 && (
        <div className="child-tabs">
          {students.map(s => s && (
            <Link key={s.id} href={`/parent/${s.id}`} className="child-tab">
              {s.fullName}
            </Link>
          ))}
        </div>
      )}
      <Suspense fallback={<SkeletonPage />}>{children}</Suspense>
    </div>
  );
}
