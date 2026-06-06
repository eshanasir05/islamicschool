import { cn } from './cn';

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className, ...props }: TextAreaProps) {
  return (
    <textarea
      className={cn('note-textarea', className)}
      {...props}
    />
  );
}
