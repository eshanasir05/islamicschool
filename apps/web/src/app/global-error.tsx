'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fafaf9' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Something went wrong</h2>
          <p style={{ color: '#71717a', fontSize: 14, maxWidth: 360, margin: 0 }}>
            Talibly hit an unexpected error. Please refresh the page or contact support.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: '10px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
