import { cn } from './cn';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('app-card', className)} {...props}>
      {children}
    </div>
  );
}
