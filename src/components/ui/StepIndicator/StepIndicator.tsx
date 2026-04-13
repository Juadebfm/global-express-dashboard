import type { ReactElement } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils';

export interface StepIndicatorItem {
  id: string;
  label: string;
}

interface StepIndicatorProps {
  steps: StepIndicatorItem[];
  currentIndex: number;
  onStepSelect?: (index: number) => void;
  isStepEnabled?: (index: number, currentIndex: number) => boolean;
  className?: string;
}

export function StepIndicator({
  steps,
  currentIndex,
  onStepSelect,
  isStepEnabled,
  className,
}: StepIndicatorProps): ReactElement {
  return (
    <ol
      className={cn('flex items-start gap-2', className)}
      aria-label="Progress"
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const stepEnabled = isStepEnabled
          ? isStepEnabled(index, currentIndex)
          : index <= currentIndex;
        const isClickable = Boolean(onStepSelect) && stepEnabled && !isCurrent;
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step.id}
            className={cn('flex items-center', !isLast && 'flex-1')}
          >
            <button
              type="button"
              onClick={() => onStepSelect?.(index)}
              disabled={!isClickable}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'group inline-flex min-w-[84px] flex-col items-center gap-2 rounded-md p-1 text-center transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                isCurrent && 'text-brand-600',
                isCompleted && 'text-brand-600',
                !isCurrent && !isCompleted && 'text-gray-400',
                isClickable && 'cursor-pointer',
                !isClickable && !isCurrent && 'cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition',
                  isCompleted && 'border-brand-500 bg-brand-500 text-white',
                  isCurrent && 'border-brand-500 bg-white text-brand-600',
                  !isCurrent && !isCompleted && 'border-gray-300 bg-white text-gray-400',
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  'max-w-[120px] text-xs font-medium leading-tight sm:text-sm',
                  isCurrent && 'text-brand-600',
                  isCompleted && 'text-brand-600',
                  !isCurrent && !isCompleted && 'text-gray-400',
                )}
              >
                {step.label}
              </span>
            </button>

            {!isLast && (
              <div
                aria-hidden="true"
                className={cn(
                  'mx-2 mb-7 h-0.5 flex-1 rounded-full',
                  index < currentIndex ? 'bg-brand-500' : 'bg-gray-200',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

