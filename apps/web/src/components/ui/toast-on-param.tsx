'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { NOTICES } from './notices';

/**
 * Fires a one-time toast when a page is reached with a `?notice=<key>`.
 * The notice value is read server-side and passed in as a prop, so this
 * never needs `useSearchParams` (no Suspense boundary required). After
 * firing, the `notice` param is stripped from the URL.
 */
export function ToastOnParam({ notice }: { notice?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const fired = useRef<string | null>(null);

  useEffect(() => {
    if (!notice || fired.current === notice) return;
    const entry = NOTICES[notice];
    if (!entry) return;
    fired.current = notice;
    toast[entry.type](entry.message);
    // Strip the notice param so a refresh doesn't re-fire the toast.
    router.replace(pathname, { scroll: false });
  }, [notice, pathname, router]);

  return null;
}
