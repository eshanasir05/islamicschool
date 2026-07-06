import Link from 'next/link';
import { cn } from './cn';

type Step = { label: string; href?: string };

type StepperProps = {
  steps: Step[];
  current: number; // 0-based
};

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="stepper">
      {steps.map((step, i) => {
        const clickable = !!step.href && i !== current;
        const dotAndLabel = (
          <>
            <div className="stepper-dot">
              {i < current ? '✓' : i + 1}
            </div>
            <span>{step.label}</span>
          </>
        );
        return (
          <div key={step.label} style={{ display: 'contents' }}>
            {clickable ? (
              <Link
                href={step.href!}
                className={cn('stepper-step', 'stepper-step-link', i < current && 'done')}
              >
                {dotAndLabel}
              </Link>
            ) : (
              <div
                className={cn(
                  'stepper-step',
                  i === current && 'active',
                  i < current && 'done',
                )}
              >
                {dotAndLabel}
              </div>
            )}
            {i < steps.length - 1 && <div className="stepper-line" />}
          </div>
        );
      })}
    </div>
  );
}
