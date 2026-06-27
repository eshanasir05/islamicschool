'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/students', label: 'Students' },
  { href: '/admin/classes', label: 'Classes' },
  { href: '/admin/teachers', label: 'Teachers' },
  { href: '/admin/tuition', label: 'Tuition' },
  { href: '/admin/announcements', label: 'Announcements' },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 0, maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        {NAV.map(item => {
          const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--accent)' : 'var(--muted)',
                textDecoration: 'none',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
