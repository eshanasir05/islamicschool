'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/marketing/icon';

export default function ParentNav({ students }: { students: { id: string; fullName: string }[] }) {
  const pathname = usePathname();
  const activeStudentId = students.find(s => pathname.startsWith(`/parent/${s.id}`))?.id ?? students[0]?.id;
  const billingHref = activeStudentId ? `/parent/${activeStudentId}#billing` : '/parent';

  return (
    <aside className="teacher-sidebar">
      <div className="teacher-nav-label">Menu</div>
      <Link
        href="/parent"
        className={`teacher-sidebar-link${pathname === '/parent' ? ' is-active' : ''}`}
      >
        <Icon name="home" size={18} />
        Dashboard
      </Link>

      {students.length > 0 && (
        <>
          <div className="teacher-nav-label" style={{ marginTop: 16 }}>Children</div>
          {students.map(s => {
            const href = `/parent/${s.id}`;
            const active = pathname.startsWith(href);
            return (
              <Link
                key={s.id}
                href={href}
                className={`teacher-sidebar-link${active ? ' is-active' : ''}`}
              >
                <Icon name="users" size={18} />
                {s.fullName}
              </Link>
            );
          })}
        </>
      )}

      <div className="teacher-nav-label" style={{ marginTop: 16 }}>Settings</div>
      <Link
        href="/account"
        className={`teacher-sidebar-link${pathname === '/account' ? ' is-active' : ''}`}
      >
        <Icon name="settings" size={18} />
        Account
      </Link>
      <Link href={billingHref} className="teacher-sidebar-link">
        <Icon name="money" size={18} />
        Billing
      </Link>
    </aside>
  );
}
