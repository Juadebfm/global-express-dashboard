import type { KeyboardEvent, ReactElement } from 'react';
import { Plane, Ship } from 'lucide-react';
import { cn, formatDate } from '@/utils';
import { formatTrackingDisplay, isInternalTracking } from '@/lib/trackingUtils';
import { getStatusStyle } from '@/lib/statusUtils';
import type { OrderListItem } from '@/types';

interface ShipmentRowProps {
  row: OrderListItem;
  onOpen: (orderId: string) => void;
  onTrack: (orderId: string) => void;
}

function isRowActivation(event: KeyboardEvent<HTMLDivElement>): boolean {
  return event.key === 'Enter' || event.key === ' ';
}

export function ShipmentRow({ row, onOpen, onTrack }: ShipmentRowProps): ReactElement {
  const isSea = row.transportMode === 'sea';
  const style = getStatusStyle(row.statusV2);
  const internal = isInternalTracking(row.trackingNumber);

  const formattedDate = row.createdAt
    ? formatDate(row.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const raw = row.raw as Record<string, unknown>;
  const rawAmountDue = raw.amountDue != null ? parseFloat(raw.amountDue as string) : null;
  const due = rawAmountDue != null && rawAmountDue > 0 ? rawAmountDue : null;
  // amountDue is also null once fully paid, not just "never priced yet" —
  // check finalChargeUsd to tell those two apart and show "Paid" instead of
  // nothing at all.
  const rawFinalCharge = raw.finalChargeUsd != null ? parseFloat(raw.finalChargeUsd as string) : null;
  const isPaid = due == null && rawFinalCharge != null && rawFinalCharge > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View shipment ${row.trackingNumber}`}
      onClick={() => onOpen(row.id)}
      onKeyDown={(event) => {
        if (!isRowActivation(event)) return;
        event.preventDefault();
        onOpen(row.id);
      }}
      className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
    >
      <span className="shrink-0 text-gray-400">
        {isSea ? <Ship className="h-4 w-4" /> : <Plane className="h-4 w-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 justify-between">
          <p className="text-sm font-medium text-gray-900 truncate">
            {row.raw['description'] as string || 'No description'}
          </p>
          <span
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
              style.bgClass,
              style.textClass,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', style.dotClass)} />
            {row.statusLabel || row.statusV2}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {internal ? (
            <span className="text-xs text-gray-400 italic">
              {formatTrackingDisplay(row.trackingNumber)}
            </span>
          ) : (
            <span className="text-xs font-mono text-gray-600">
              {row.trackingNumber}
            </span>
          )}
          {formattedDate && (
            <>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400">{formattedDate}</span>
            </>
          )}
        </div>
        {due != null ? (
          <span className="mt-1.5 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            ${due.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} due
          </span>
        ) : isPaid ? (
          <span className="mt-1.5 inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            Paid
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onTrack(row.id);
        }}
        className="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
      >
        Track
      </button>
    </div>
  );
}
