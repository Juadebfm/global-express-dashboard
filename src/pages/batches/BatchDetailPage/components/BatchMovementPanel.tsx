import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Loader2,
  MoreHorizontal,
  PauseCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { formatDate } from '@/utils';
import { cn } from '@/utils';
import type {
  BatchMovement,
  BatchMovementAction,
  BatchMovementHistory,
} from '@/types';
import { buildStages, type Stage, type StageState } from './buildStages';

/**
 * Statuses the backend treats as permanent. Once a batch reaches one of these
 * it exposes no further actions and there is no route to reverse it, so the
 * frontend asks the user to type the batch's tracking number first.
 */
const PERMANENT_STATUSES = new Set(['CANCELLED', 'RESTRICTED_ITEM_REJECTED']);

/** Only a user holding restricted_items.override may send this one. */
const OVERRIDE_STATUS = 'RESTRICTED_ITEM_OVERRIDE_APPROVED';

function StageDot({ state }: { state: StageState }): ReactElement {
  if (state === 'done' || state === 'done-undated') {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 ring-4 ring-brand-100">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 bg-white" />
  );
}

function MovementTimeline({ stages }: { stages: Stage[] }): ReactElement {
  const doneCount = stages.filter((s) => s.state !== 'upcoming').length;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Stage {doneCount} of {stages.length}
      </p>
      <ol className="mt-3">
        {stages.map((stage, index) => (
          <li key={stage.statusV2} className="flex gap-3">
            {/* Dot and connecting line */}
            <div className="flex flex-col items-center">
              <StageDot state={stage.state} />
              {index < stages.length - 1 && (
                <span
                  className={cn(
                    'w-0.5 flex-1 min-h-6',
                    stage.state === 'upcoming' ? 'bg-gray-200' : 'bg-emerald-200',
                  )}
                />
              )}
            </div>

            <div className={cn('pb-4', index === stages.length - 1 && 'pb-0')}>
              <p
                className={cn(
                  'text-sm',
                  stage.state === 'current'
                    ? 'font-semibold text-gray-900'
                    : stage.state === 'upcoming'
                      ? 'text-gray-400'
                      : 'font-medium text-gray-700',
                )}
              >
                {stage.label}
              </p>
              {stage.occurredAt && (
                <p className="mt-0.5 text-xs text-gray-400">
                  {formatDate(stage.occurredAt, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ExceptionBanner({
  movement,
}: {
  movement: BatchMovement;
}): ReactElement | null {
  const status = movement.currentStatus;
  if (!status) return null;

  if (status === 'ON_HOLD') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">
          This batch is on hold. Moving it on will resume from the stage after{' '}
          <span className="font-medium">{movement.heldFromStatus ?? 'its last recorded stage'}</span>.
        </p>
      </div>
    );
  }

  if (status === OVERRIDE_STATUS) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
        <p className="text-sm text-blue-800">
          A restricted-item override was approved for this batch. It can now continue
          along its normal route.
        </p>
      </div>
    );
  }

  if (PERMANENT_STATUSES.has(status)) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <p className="text-sm text-red-800">
          <span className="font-semibold">{movement.currentStatusLabel}</span> — this is
          final. The batch cannot be moved any further.
        </p>
      </div>
    );
  }

  return null;
}

function ExceptionMenu({
  actions,
  onSelect,
}: {
  actions: BatchMovementAction[];
  onSelect: (action: BatchMovementAction) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const reversible = actions.filter((a) => !PERMANENT_STATUSES.has(a.statusV2));
  const permanent = actions.filter((a) => PERMANENT_STATUSES.has(a.statusV2));

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="mr-1.5 h-4 w-4" />
        More actions
        <ChevronDown className="ml-1.5 h-4 w-4" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {reversible.map((action) => (
            <button
              key={action.statusV2}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect(action);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              {action.label}
            </button>
          ))}

          {reversible.length > 0 && permanent.length > 0 && (
            <div className="my-1 border-t border-gray-100" />
          )}

          {permanent.map((action) => (
            <button
              key={action.statusV2}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect(action);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface BatchMovementPanelProps {
  movement: BatchMovement;
  history: BatchMovementHistory | undefined;
  isHistoryLoading: boolean;
  historyError: unknown;
  onRetryHistory: () => void;
  masterTrackingNumber: string;
  totalOrders: number;
  canManage: boolean;
  canOverrideRestriction: boolean;
  isSubmitting: boolean;
  onConfirmAction: (action: BatchMovementAction) => void;
}

export function BatchMovementPanel({
  movement,
  history,
  isHistoryLoading,
  historyError,
  onRetryHistory,
  masterTrackingNumber,
  totalOrders,
  canManage,
  canOverrideRestriction,
  isSubmitting,
  onConfirmAction,
}: BatchMovementPanelProps): ReactElement {
  const [pendingAction, setPendingAction] = useState<BatchMovementAction | null>(null);
  const [typedConfirmation, setTypedConfirmation] = useState('');

  // The backend rejects a restricted-item override without its own capability,
  // so never offer the action to someone who cannot complete it.
  const visibleActions = movement.allowedActions.filter(
    (action) => action.statusV2 !== OVERRIDE_STATUS || canOverrideRestriction,
  );
  const advanceAction = visibleActions.find((a) => a.kind === 'advance') ?? null;
  const exceptionActions = visibleActions.filter((a) => a.kind === 'exception');

  const needsTypedConfirmation = pendingAction
    ? PERMANENT_STATUSES.has(pendingAction.statusV2)
    : false;
  const typedConfirmationSatisfied =
    !needsTypedConfirmation || typedConfirmation.trim() === masterTrackingNumber;

  const closeConfirmation = (): void => {
    setPendingAction(null);
    setTypedConfirmation('');
  };

  return (
    <>
      <Card className="p-4 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">Batch movement</p>
            <p className="mt-1 text-sm text-gray-500">
              Current stage:{' '}
              <span className="font-medium text-gray-700">
                {movement.currentStatusLabel ?? 'No movement stage recorded'}
              </span>
            </p>
          </div>

          {canManage && (advanceAction || exceptionActions.length > 0) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {advanceAction && (
                <Button size="sm" onClick={() => setPendingAction(advanceAction)}>
                  {advanceAction.label}
                </Button>
              )}
              {exceptionActions.length > 0 && (
                <ExceptionMenu actions={exceptionActions} onSelect={setPendingAction} />
              )}
            </div>
          )}
        </div>

        <ExceptionBanner movement={movement} />

        {/* Timeline */}
        {isHistoryLoading && (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading movement history…
          </div>
        )}

        {!isHistoryLoading && historyError != null && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-600">
              The movement history could not be loaded.
            </p>
            <Button variant="secondary" size="sm" onClick={onRetryHistory}>
              Retry
            </Button>
          </div>
        )}

        {!isHistoryLoading && historyError == null && history && history.flow.length > 0 && (
          <MovementTimeline stages={buildStages(history, movement.currentStatus)} />
        )}

        {canManage && movement.allowedActions.length === 0 && (
          <p className="text-sm text-gray-500">
            {movement.currentStatus === 'IN_TRANSIT_TO_LAGOS_OFFICE'
              ? 'No further batch-level movement is available. Pickup and local delivery are managed per order.'
              : PERMANENT_STATUSES.has(movement.currentStatus ?? '')
                ? 'This batch has reached a final state and cannot be moved.'
                : 'No batch movement action is currently available.'}
          </p>
        )}
      </Card>

      {/* Confirmation */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md space-y-4 rounded-3xl p-6">
            <div className="flex items-start gap-3">
              {needsTypedConfirmation && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </span>
              )}
              <h2 className="text-lg font-semibold text-gray-900">
                {pendingAction.kind === 'advance'
                  ? `Move batch to ${pendingAction.label}?`
                  : `${pendingAction.label}?`}
              </h2>
            </div>

            <p className="text-sm text-gray-500">{pendingAction.description}</p>
            <p className="text-sm text-gray-500">
              This applies to all{' '}
              <span className="font-medium text-gray-700">{totalOrders} orders</span> in
              this batch.
            </p>

            {needsTypedConfirmation && (
              <div className="space-y-2 rounded-2xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-800">
                  This cannot be undone.
                </p>
                <label
                  htmlFor="batch-movement-confirm"
                  className="block text-sm text-red-800"
                >
                  Type <span className="font-mono font-semibold">{masterTrackingNumber}</span>{' '}
                  to confirm.
                </label>
                <input
                  id="batch-movement-confirm"
                  type="text"
                  autoComplete="off"
                  value={typedConfirmation}
                  onChange={(e) => setTypedConfirmation(e.target.value)}
                  className="w-full rounded-xl border border-red-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className={cn(
                  'flex-1',
                  needsTypedConfirmation && 'bg-red-600 hover:bg-red-700 focus:ring-red-200',
                )}
                disabled={isSubmitting || !typedConfirmationSatisfied}
                onClick={() => {
                  onConfirmAction(pendingAction);
                  closeConfirmation();
                }}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm
              </Button>
              <Button variant="secondary" onClick={closeConfirmation}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
