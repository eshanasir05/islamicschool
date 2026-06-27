'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
        Something went wrong
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 360, margin: 0 }}>
        We hit an unexpected error. Please try again — if the problem continues, contact your school administrator.
      </p>
      <button
        type="button"
        className="btn btn-accent"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}
