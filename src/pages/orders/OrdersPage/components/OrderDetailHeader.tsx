import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Copy, MoreHorizontal, Plane, Ship, ChevronLeft, ArrowRight, AlertTriangle, CircleAlert, PackagePlus } from 'lucide-react';
import { cn } from '@/utils';
import type { OrderView } from '../types';
import {
  statusLabel,
  getStageInfo,
  getAdvanceBlockReason,
  getNextStageLabel,
  nextStatus,
  TOTAL_STAGES,
  EXCEPTION_STATUSES,
} from '../types';

function advanceActionLabel(statusV2: string, nextStageLabel: string | null): string {
  const s = statusV2.toUpperCase();
  if (s === 'PREORDER_SUBMITTED' || s === 'AWAITING_WAREHOUSE_RECEIPT') {
    return 'Confirm received at warehouse';
  }
  if (s === 'WAREHOUSE_VERIFIED_PRICED') return 'Mark as dispatched';
  if (s === 'FLIGHT_LANDED_LAGOS' || s === 'VESSEL_ARRIVED_LAGOS_PORT') return 'Confirm landed';
  if (s === 'CUSTOMS_CLEARED_LAGOS') return 'Confirm customs cleared';
  if (s === 'IN_TRANSIT_TO_LAGOS_OFFICE') return 'Confirm arrived at office';
  if (s === 'LOCAL_COURIER_ASSIGNED') return 'Confirm courier dispatched';
  if (s === 'IN_TRANSIT_TO_DESTINATION_CITY') return 'Confirm in transit';
  if (s === 'OUT_FOR_DELIVERY_DESTINATION_CITY') return 'Confirm out for delivery';
  if (s === 'READY_FOR_PICKUP') return 'Confirm picked up';
  if (s === 'IN_TRANSIT_TO_OFFICE') return 'Confirm arrived at office';
  return nextStageLabel ? `Advance to ${nextStageLabel}` : 'Advance';
}

interface OrderDetailHeaderProps {
  view: OrderView;
  onAdvance: (nextStatusV2: string) => void;
  onAddToShipment?: () => void;
  onCreateOrderForCustomer?: () => void;
  onBack?: () => void;
  advanceLoading?: boolean;
}

export function OrderDetailHeader({
  view,
  onAdvance,
  onAddToShipment,
  onBack,
  advanceLoading = false,
}: OrderDetailHeaderProps): ReactElement {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setCancelConfirm(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const stage = getStageInfo(view.statusV2);
  const blockReason = getAdvanceBlockReason(view.statusV2, view.paymentCollectionStatus);
  const next = nextStatus(view.statusV2, view.transportMode, view.shipmentType);
  const nextStageLabel = getNextStageLabel(view.statusV2);
  const isException = EXCEPTION_STATUSES.has(view.statusV2);
  const canAdvance = !blockReason && !!next && !isException;

  const isSea = (view.transportMode || view.shipmentType) === 'sea';

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(view.trackingNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-3">
      {/* ── Back link ────────────────────────────────────────────── */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to orders
        </button>
      )}

      {/* ── Tracking row ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {/* Tracking number + status badge — single line */}
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-gray-900">
                {view.trackingNumber}
              </span>
              <span
                className={cn(
                  'shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  isException
                    ? 'bg-red-100 text-red-700'
                    : 'bg-brand-50 text-brand-700',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isException ? 'bg-red-500' : 'bg-brand-500',
                  )}
                />
                {statusLabel(view.statusV2)}
              </span>
            </div>
            {/* Route — single line, icon replaces mode label */}
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-gray-500">
              {isSea ? (
                <Ship className="h-3.5 w-3.5 shrink-0 text-blue-400" />
              ) : (
                <Plane className="h-3.5 w-3.5 shrink-0 text-brand-400" />
              )}
              <span className="truncate">{view.origin}</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-gray-300" />
              <span className="truncate">{view.destination}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* ── Status card ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        {/* Label row */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Current status
          </span>
          {blockReason === 'verify_first' && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Verify packages to enable
            </span>
          )}
          {blockReason === 'payment_required' && (
            <span className="flex items-center gap-1 text-xs font-medium text-red-600">
              <CircleAlert className="h-3.5 w-3.5" />
              Collect payment first
            </span>
          )}
        </div>

        {/* Status name + stage + progress — full width */}
        {isException ? (
          <span className="mt-3 inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600">
            {statusLabel(view.statusV2)}
          </span>
        ) : (
          <div className="mt-2.5 space-y-3">
            <div>
              <span className="text-xl font-semibold text-gray-900">
                {statusLabel(view.statusV2)}
              </span>
              <span className="ml-2 text-sm text-gray-400">
                Stage {stage.index} of {TOTAL_STAGES} · {stage.label}
              </span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STAGES }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    i < stage.index ? 'bg-brand-500' : 'bg-gray-200',
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions — bottom row, always full width */}
        {!isException && (
          <div className="mt-8 space-y-3">
            {/* Secondary: add order (only when applicable) */}
            {onAddToShipment && (
              <button
                type="button"
                onClick={onAddToShipment}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <PackagePlus className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                Add order to this shipment
              </button>
            )}

            {/* Primary row: advance button + ⋯ menu */}
            {next === null ? (
              <div className="flex justify-end">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Delivered
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!canAdvance || advanceLoading}
                  onClick={() => { if (canAdvance && next) onAdvance(next); }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                    canAdvance
                      ? 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800'
                      : 'cursor-not-allowed bg-gray-100 text-gray-400',
                  )}
                >
                  {advanceLoading && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {advanceActionLabel(view.statusV2, nextStageLabel)}
                  {!advanceLoading && <ArrowRight className="h-4 w-4" />}
                </button>

                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen((v) => !v); setCancelConfirm(false); }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onAdvance('ON_HOLD');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Place on hold
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); setCancelConfirm(true); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        Cancel order
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cancel confirmation — shown below actions, outside the dropdown */}
        {cancelConfirm && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <span className="text-sm font-medium text-red-700">Cancel this order?</span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => { setCancelConfirm(false); onAdvance('CANCELLED'); }}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
              >
                Yes, cancel
              </button>
              <button
                type="button"
                onClick={() => setCancelConfirm(false)}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Keep
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
