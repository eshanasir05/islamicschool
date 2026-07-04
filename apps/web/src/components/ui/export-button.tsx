'use client';

import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Downloads a CSV via fetch so the pending state reflects the real request,
 * not a guessed timeout. A plain `<a href download>` can't be awaited, so
 * we fetch the bytes ourselves and trigger the save via an object URL.
 */
export function ExportButton({ href, label }: { href: string; label: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(href);
      if (!res.ok) {
        toast.error('Export failed. Please try again.');
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] ?? 'export.csv';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-accent"
      style={{ fontSize: 13, padding: '7px 14px', whiteSpace: 'nowrap', flexShrink: 0 }}
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {loading ? 'Preparing…' : label}
    </button>
  );
}
