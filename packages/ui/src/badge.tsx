import { cn } from './cn';

type BadgeVariant =
  | 'present' | 'late' | 'absent' | 'excused'
  | 'sabak' | 'sabqi' | 'manzil'
  | 'praise' | 'homework';

type BadgeProps = {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
};

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={cn('badge', `badge-${variant}`, className)}>
      {children}
    </span>
  );
}
