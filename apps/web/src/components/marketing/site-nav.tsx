'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './icon';

const NAV_PAGES = [
  { href: '/', label: 'Home', key: 'home' as const },
  {
    href: '/for-parents',
    label: 'Features',
    key: 'features' as const,
    matches: ['parents', 'teachers', 'principals'],
  },
  { href: '/pricing', label: 'Pricing', key: 'pricing' as const },
  { href: '#resources', label: 'Resources', key: 'resources' as const },
  { href: '#contact', label: 'Contact us', key: 'contact' as const },
];

const PERSONA_PAGES = [
  { href: '/for-parents', label: 'For parents', key: 'parents' as const },
  { href: '/for-teachers', label: 'For teachers', key: 'teachers' as const },
  { href: '/for-principals', label: 'For principals', key: 'principals' as const },
];

export type PageKey = 'home' | 'parents' | 'teachers' | 'principals' | 'pricing';

export function currentPageKey(pathname: string | null): PageKey {
  if (!pathname) return 'home';
  if (pathname.startsWith('/for-parents')) return 'parents';
  if (pathname.startsWith('/for-teachers')) return 'teachers';
  if (pathname.startsWith('/for-principals')) return 'principals';
  if (pathname.startsWith('/pricing')) return 'pricing';
  return 'home';
}

export function SiteNav() {
  const pathname = usePathname();
  const active = currentPageKey(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link className="nav-logo" href="/">
          <span className="mark">S</span>
          talibly
        </Link>
        <div className="nav-links">
          {NAV_PAGES.map((p) => {
            const isActive = active === p.key || p.matches?.includes(active);
            return (
              <Link key={p.key} href={p.href} className={isActive ? 'is-active' : ''}>
                {p.label}
              </Link>
            );
          })}
        </div>
        <div className="nav-cta">
          <Link className="btn btn-ghost btn-login" href="#login">
            Login
          </Link>
          <Link className="btn btn-primary hide-sm" href="#demo">
            Book a demo
            <Icon name="arrow" size={14} />
          </Link>
          <button
            type="button"
            className="nav-hamburger"
            aria-label="Open menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Icon name={mobileOpen ? 'x' : 'menu'} size={18} />
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="nav-mobile">
          <div className="container">
            {NAV_PAGES.map((p) => (
              <Link key={p.key} href={p.href} onClick={() => setMobileOpen(false)}>
                {p.label}
              </Link>
            ))}
            <div className="nav-mobile-personas">
              {PERSONA_PAGES.map((p) => (
                <Link key={p.key} href={p.href} onClick={() => setMobileOpen(false)}>
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
