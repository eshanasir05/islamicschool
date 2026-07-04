'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/marketing/icon';

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/teacher', label: 'Dashboard', icon: 'home' },
  { href: '/teacher/homework', label: 'Homework', icon: 'book' },
  { href: '/teacher/milestones', label: 'Hifz milestones', icon: 'star' },
  { href: '/teacher/trials', label: 'Trial placements', icon: 'cal' },
  { href: '/teacher/activity', label: 'Recent activity', icon: 'activity' },
  { href: '/account', label: 'Account', icon: 'settings' },
];

export default function TeacherNav() {
  const pathname = usePathname();
  return (
    <aside className="teacher-sidebar">
      <div className="teacher-nav-label">Menu</div>
      {NAV.map(item => {
        const active = item.href === '/teacher'
          ? pathname === '/teacher'
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`teacher-sidebar-link${active ? ' is-active' : ''}`}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
