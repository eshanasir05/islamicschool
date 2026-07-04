'use client';

import { useEffect, useRef } from 'react';
import { markBoardPackViewed } from '@/app/(admin)/actions';

/**
 * Records (via a durable cookie) that this admin has actually opened the
 * Board Pack at least once — the one onboarding checklist item with no
 * natural "real data" completion signal of its own.
 */
export function MarkBoardPackViewed() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void markBoardPackViewed();
  }, []);
  return null;
}
