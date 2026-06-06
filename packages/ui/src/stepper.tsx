import { cn } from './cn';

type Step = { label: string };

type StepperProps = {
  steps: Step[];
  current: number; // 0-based
};

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="stepper">
      {steps.map((step, i) => (
        <div key={step.label} style={{ display: 'contents' }}>
          <div
            className={cn(
              'stepper-step',
              i === current && 'active',
              i < current && 'done',
            )}
          >
            <div className="stepper-dot">
              {i < current ? '✓' : i + 1}
            </div>
            <span>{step.label}</span>
          </div>
          {i < steps.length - 1 && <div className="stepper-line" />}
        </div>
      ))}
    </div>
  );
}
