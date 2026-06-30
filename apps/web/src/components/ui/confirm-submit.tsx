'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { CSSProperties } from 'react';

type Props = {
  /** Trigger button label, e.g. "Archive" */
  label: string;
  /** Dialog heading, e.g. "Archive this student?" */
  title: string;
  /** Dialog explanatory body */
  body: string;
  /** Confirm button label inside the dialog. Defaults to `label`. */
  confirmLabel?: string;
  /** `danger` renders a red confirm button for destructive actions. */
  variant?: 'danger' | 'default';
  /** className for the trigger button */
  className?: string;
  /** inline style for the trigger button */
  buttonStyle?: CSSProperties;
};

// The confirm button reads the parent form's pending state so it can show a
// spinner while the server action runs. Lives in its own component because
// useFormStatus only reflects the nearest enclosing <form>.
function ConfirmButton({ variant, label }: { variant: 'danger' | 'default'; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={variant === 'danger' ? 'btn btn-danger' : 'btn btn-accent'}
      disabled={pending}
      aria-busy={pending}
    >
      {pending && <span className="btn-spinner" aria-hidden="true" />}
      {label}
    </button>
  );
}

/**
 * A submit button that first asks for confirmation. Rendered INSIDE a
 * `<form action={serverAction}>`; the dialog's confirm button is a real
 * `type="submit"`, so the parent form's server action runs on confirm.
 */
export function ConfirmSubmit({
  label,
  title,
  body,
  confirmLabel,
  variant = 'default',
  className = 'btn btn-ghost',
  buttonStyle,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} style={buttonStyle} onClick={() => setOpen(true)}>
        {label}
      </button>

      {open && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label={title}>
          <button
            type="button"
            className="confirm-backdrop"
            aria-label="Cancel"
            onClick={() => setOpen(false)}
          />
          <div className="confirm-dialog">
            <h3 className="confirm-title">{title}</h3>
            <p className="confirm-body">{body}</p>
            <div className="confirm-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <ConfirmButton variant={variant} label={confirmLabel ?? label} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
