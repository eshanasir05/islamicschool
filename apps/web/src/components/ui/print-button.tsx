'use client';

export function PrintButton({ label = 'Print / Save as PDF' }: { label?: string }) {
  return (
    <button type="button" className="btn btn-accent no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
