import type { ReactElement, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils';

export type QueueKind = 'preorder' | 'arrival' | 'verify' | 'holds' | 'batch' | 'payment' | 'escalated';

const QUEUE_LABELS: Record<QueueKind, string> = {
  preorder: 'New orders',
  arrival: 'Awaiting arrivals',
  verify: 'Verify packages',
  holds: 'Resolve holds',
  batch: 'Assign to batch',
  payment: 'Collect payment',
  escalated: 'Supervisor review',
};

interface QueueShellProps {
  queueType: QueueKind;
  currentIndex: number;
  totalCount: number;
  onExit: () => void;
  onSkip?: () => void;
  hint?: string | null;
  primaryLabel: string;
  primaryDisabled?: boolean;
  isPending?: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  secondaryDisabled?: boolean;
  onSecondary?: () => void;
  children: ReactNode;
}

export function QueueShell({
  queueType,
  currentIndex,
  totalCount,
  onExit,
  onSkip,
  hint,
  primaryLabel,
  primaryDisabled = false,
  isPending = false,
  onPrimary,
  secondaryLabel,
  secondaryDisabled = false,
  onSecondary,
  children,
}: QueueShellProps): ReactElement {
  const label = QUEUE_LABELS[queueType];
  const canSkip = !!onSkip && totalCount > 1;

  return (
    <div>
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onExit}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
        >
          Back
        </button>

        <span className="hidden flex-1 text-center text-sm font-semibold text-gray-800 sm:block">
          {label}
        </span>

        <div className="flex flex-1 items-center justify-center gap-1 sm:flex-none sm:flex-grow-0">
          {totalCount > 0 && Array.from({ length: Math.min(totalCount, 10) }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i < currentIndex
                  ? 'w-1.5 bg-brand-300'
                  : i === currentIndex
                  ? 'w-3 bg-brand-500'
                  : 'w-1.5 bg-gray-200',
              )}
            />
          ))}
          {totalCount > 10 && (
            <span className="ml-1 text-xs text-gray-400">+{totalCount - 10}</span>
          )}
        </div>

        <span className="shrink-0 text-xs text-gray-400">
          {currentIndex + 1} / {totalCount}
        </span>

        {canSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            Skip
          </button>
        )}
      </div>

      {/* Content */}
      {children}

      {/* Bottom action bar — sticky to the containing panel (not the
          viewport), so it stays within the right pane's own width/scroll on
          desktop and naturally spans full width on mobile where the panel
          already is the full viewport. */}
      <div className="sticky bottom-0 z-20 mt-4 border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {hint && (
            <p className="min-w-0 flex-1 truncate text-sm text-gray-500">
              {hint}
            </p>
          )}
          <div className={cn('flex shrink-0 items-center gap-2', !hint && 'ml-auto')}>
            {secondaryLabel && onSecondary && (
              <button
                type="button"
                onClick={onSecondary}
                disabled={secondaryDisabled || isPending}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {secondaryLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onPrimary}
              disabled={primaryDisabled || isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
