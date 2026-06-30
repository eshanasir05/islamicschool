'use client';

import { useFormStatus } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Submit button that shows a spinner and disables itself while the parent
 * form's server action is pending. Must be rendered inside a `<form>`.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = 'btn btn-accent',
  style,
  disabled = false,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} style={style} disabled={pending || disabled} aria-busy={pending}>
      {pending && <span className="btn-spinner" aria-hidden="true" />}
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}
