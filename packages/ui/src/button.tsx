import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'accent' | 'primary' | 'ghost' | 'danger';
  loading?: boolean;
};

// Maps to the `.btn` design-system classes defined in the web app's globals.css,
// so the shared Button stays a single source of truth with the rest of the UI.
const variantClass: Record<NonNullable<ButtonProps['variant']>, string> = {
  accent: 'btn-accent',
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export function Button({
  className,
  variant = 'accent',
  loading = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn('btn', variantClass[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
