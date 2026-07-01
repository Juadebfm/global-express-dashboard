import type { ReactElement, ReactNode } from 'react';
import { Loader2, LogOut, SkipForward } from 'lucide-react';
import { cn } from '@/utils';

export type QueueKind = 'verify' | 'holds' | 'batch' | 'payment' | 'escalated';

const QUEUE_LABELS: Record<QueueKind, string> = {
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
    <div className="pb-24">
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onExit}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Exit
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
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            Skip
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      {children}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white px-6 py-3 lg:left-28">
        <div className="mx-auto flex max-w-screen-xl items-center gap-3">
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
