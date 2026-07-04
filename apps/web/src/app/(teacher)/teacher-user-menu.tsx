'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/marketing/icon';

export default function TeacherUserMenu({ name, initials }: { name: string; initials: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="user-menu">
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="avatar">{initials}</span>
        <span className="user-menu-name">
          <span className="n">{name}</span>
          <span className="r">Teacher</span>
        </span>
        <span className="user-menu-chevron"><Icon name="chevron-down" size={16} /></span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="user-menu-backdrop"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="user-menu-pop" role="menu">
            <Link href="/account" role="menuitem" onClick={() => setOpen(false)}>
              <Icon name="settings" size={16} /> Account settings
            </Link>
            <a href="/auth/signout" role="menuitem">
              <Icon name="x" size={16} /> Sign out
            </a>
          </div>
        </>
      )}
    </div>
  );
}
