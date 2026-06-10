import type { ReactElement } from 'react';
import { useState } from 'react';
import { Copy, MoreHorizontal, Plane, Ship, ArrowRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/utils';
import type { OrderView } from '../types';
import {
  statusLabel,
  getStageInfo,
  getAdvanceBlockReason,
  nextStatus,
  TOTAL_STAGES,
  EXCEPTION_STATUSES,
} from '../types';

interface OrderDetailHeaderProps {
  view: OrderView;
  onAdvance: (nextStatusV2: string) => void;
  onBack?: () => void;
  advanceLoading?: boolean;
}

function TransportIcon({ mode }: { mode: string }): ReactElement {
  if (mode === 'sea') return <Ship className="h-4 w-4 text-blue-500" />;
  return <Plane className="h-4 w-4 text-brand-500" />;
}

export function OrderDetailHeader({
  view,
  onAdvance,
  onBack,
  advanceLoading = false,
}: OrderDetailHeaderProps): ReactElement {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const stage = getStageInfo(view.statusV2);
  const blockReason = getAdvanceBlockReason(view.statusV2, view.paymentCollectionStatus);
  const next = nextStatus(view.statusV2, view.transportMode, view.shipmentType);
  const isException = EXCEPTION_STATUSES.has(view.statusV2);
  const canAdvance = !blockReason && !!next && !isException;

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(view.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const progressPct = (stage.index / TOTAL_STAGES) * 100;

  return (
    <div className="space-y-3">
      {/* ── Tracking row ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"
              aria-label="Back to queue"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <TransportIcon mode={view.transportMode || view.shipmentType} />
            <span className="text-lg font-semibold text-gray-900">{view.trackingNumber}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>{view.origin}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span>{view.destination}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy ID'}
          </button>
        </div>
      </div>

      {/* ── Status card ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            {/* Stage label + counter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Current status
              </span>
              {!isException && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                  Stage {stage.index} of {TOTAL_STAGES}
                </span>
              )}
            </div>

            {/* Progress bar */}
            {!isException && (
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            {/* Status name */}
            <div className="space-y-0.5">
              <p className="text-base font-semibold text-gray-900">
                {statusLabel(view.statusV2)}
              </p>
              <p className="text-sm text-gray-500">{stage.label}</p>
            </div>

            {/* Block warning */}
            {blockReason === 'verify_first' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Complete warehouse verification before advancing this order.
              </div>
            )}
            {blockReason === 'payment_required' && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
                Payment must be collected in full before releasing for pickup.
              </div>
            )}

            {/* Exception badge */}
            {isException && (
              <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                {statusLabel(view.statusV2)}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {!isException && (
              <button
                type="button"
                disabled={!canAdvance || advanceLoading}
                onClick={() => {
                  if (canAdvance && next) onAdvance(next);
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                  canAdvance
                    ? 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800'
                    : 'cursor-not-allowed bg-gray-100 text-gray-400',
                )}
              >
                {advanceLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : null}
                Advance
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Place on hold
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Cancel order
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
