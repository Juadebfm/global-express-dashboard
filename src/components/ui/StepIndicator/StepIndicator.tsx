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
    <ol className={cn('flex items-center gap-2', className)} aria-label="Progress">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const stepEnabled = isStepEnabled
          ? isStepEnabled(index, currentIndex)
          : index <= currentIndex;
        const isClickable = Boolean(onStepSelect) && stepEnabled && !isCurrent;
        const isLast = index === steps.length - 1;

        return (
          <li key={step.id} className={cn('flex min-w-0 items-center', !isLast && 'flex-1')}>
            <button
              type="button"
              onClick={() => onStepSelect?.(index)}
              disabled={!isClickable}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'group flex min-w-0 items-center gap-3 rounded-2xl p-2 text-left transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                isClickable && 'cursor-pointer',
                !isClickable && !isCurrent && 'cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold shadow-sm',
                  isCurrent && 'border-brand-500 bg-brand-500 text-white',
                  isCompleted && 'border-brand-500 bg-brand-500 text-white',
                  !isCurrent && !isCompleted && 'border-gray-200 bg-white text-gray-500',
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-[10px] font-semibold uppercase tracking-[0.16em]',
                    (isCurrent || isCompleted) ? 'text-brand-600' : 'text-gray-400',
                  )}
                >
                  Step {index + 1}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block truncate text-sm font-semibold',
                    (isCurrent || isCompleted) ? 'text-gray-900' : 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
              </span>
            </button>

            {!isLast && (
              <span
                aria-hidden="true"
                className={cn('mx-2 h-px flex-1 rounded-full', index < currentIndex ? 'bg-brand-300' : 'bg-gray-200')}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
