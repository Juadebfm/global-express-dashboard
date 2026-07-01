import type { ReactElement } from 'react';
import { Plane, Ship, Truck } from 'lucide-react';
import { cn } from '@/utils';
import { formatTrackingDisplay } from '@/lib/trackingUtils';
import type { OrderView } from '../types';

interface OrderSummaryCardProps {
  view: OrderView;
  className?: string;
}

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  ON_HOLD: { label: 'On hold', cls: 'bg-amber-100 text-amber-700' },
  WAREHOUSE_RECEIVED: { label: 'At warehouse', cls: 'bg-brand-50 text-brand-700' },
  CLAIM_APPROVED_PENDING_BULK_PROCESSING: { label: 'Pending processing', cls: 'bg-brand-50 text-brand-700' },
  WAREHOUSE_VERIFIED_PRICED: { label: 'Verified & priced', cls: 'bg-emerald-50 text-emerald-700' },
};

export function OrderSummaryCard({ view, className }: OrderSummaryCardProps): ReactElement {
  const isSea = (view.transportMode || view.shipmentType) === 'sea';
  const isD2D = view.shipmentType === 'd2d';
  const tracking = formatTrackingDisplay(view.trackingNumber);

  const statusChip = STATUS_CHIP[view.statusV2];
  const modeLabel = isD2D ? 'D2D' : isSea ? 'Sea freight' : 'Air freight';

  const declared = view.declaredValue != null
    ? `$${Number(view.declaredValue).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    : null;

  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white px-5 py-4', className)}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            isSea ? 'bg-blue-100' : isD2D ? 'bg-purple-100' : 'bg-brand-100',
          )}
        >
          {isD2D ? (
            <Truck className={cn('h-5 w-5', 'text-purple-600')} />
          ) : isSea ? (
            <Ship className="h-5 w-5 text-blue-600" />
          ) : (
            <Plane className="h-5 w-5 text-brand-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-gray-900">{tracking}</span>
            {statusChip && (
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', statusChip.cls)}>
                {statusChip.label}
              </span>
            )}
          </div>
          {view.senderName && (
            <p className="mt-0.5 text-base font-semibold text-gray-900">{view.senderName}</p>
          )}
          <p className="mt-0.5 text-sm text-gray-500">
            {modeLabel}
            {view.contentDescription && (
              <> · <span className="text-gray-700">{view.contentDescription}</span></>
            )}
            {declared && (
              <> · declared {declared}</>
            )}
          </p>
          {(view.recipientName || view.recipientAddress) && (
            <p className="mt-1 text-xs text-gray-400">
              To: {view.recipientName}{view.recipientAddress ? ` · ${view.recipientAddress}` : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
