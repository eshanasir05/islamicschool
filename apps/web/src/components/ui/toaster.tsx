'use client';

import { Toaster as SonnerToaster } from 'sonner';

/**
 * App-wide toast surface. Mounted once per role layout. Styling is tuned to
 * match the Talibly palette (emerald accent, navy text, soft borders).
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: 'var(--font-sans)',
          borderRadius: '12px',
        },
      }}
    />
  );
}
