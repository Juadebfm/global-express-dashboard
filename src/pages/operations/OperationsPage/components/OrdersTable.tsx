import type { ReactElement } from 'react';
import { getStatusStyle } from '@/lib/statusUtils';
import { isInternalTracking } from '@/lib/trackingUtils';
import { cn } from '@/utils';
import type { OrderListItem } from '@/types';
import { formatPaymentStatus, formatUsd, modeIcon, orderDescription, orderWeight } from '../utils/orderDisplay';

function MobileField({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-xs text-gray-600">{value}</p>
    </div>
  );
}

/**
 * Dense table used across every tab in the browse pane — mobile falls back
 * to stacked cards, desktop shows every field we reliably have on an order
 * row so staff can act without opening the order detail view.
 */
export function OrdersTable({
  orders,
  action,
  onRowClick,
}: {
  orders: OrderListItem[];
  action?: (order: OrderListItem) => ReactElement | null;
  /** Optional — rows are clickable (select into the workspace pane) when provided. */
  onRowClick?: (order: OrderListItem) => void;
}): ReactElement {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Mobile: cards */}
      <div className="divide-y divide-gray-100 md:hidden">
        {orders.map((o) => {
          const style = getStatusStyle(o.statusV2);
          const raw = o.raw as Record<string, unknown>;
          const description = orderDescription(raw);
          const rowAction = action?.(o);
          return (
            <div
              key={o.id}
              className={cn('px-4 py-3', onRowClick && 'cursor-pointer hover:bg-gray-50')}
              onClick={() => onRowClick?.(o)}
            >
              <p className="truncate text-sm font-medium text-gray-900" title={description}>
                {description}
              </p>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs text-gray-500">{o.senderName ?? 'Unknown'}</p>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', style.bgClass, style.textClass)}>
                  {o.statusLabel || o.statusV2}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                <MobileField label="Tracking" value={isInternalTracking(o.trackingNumber) ? '—' : o.trackingNumber} />
                <MobileField label="Mode" value={o.transportMode} />
                <MobileField label="Weight" value={orderWeight(raw)} />
                <MobileField label="Amount" value={o.amount != null ? formatUsd(o.amount) : '—'} />
                <MobileField label="Payment" value={formatPaymentStatus(o.paymentCollectionStatus)} />
              </div>
              {rowAction && (
                <div className="mt-2 text-right" onClick={(e) => e.stopPropagation()}>
                  {rowAction}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="bg-gray-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Description</th>
              <th className="bg-gray-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Customer</th>
              <th className="bg-gray-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Tracking No.</th>
              <th className="bg-gray-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Mode</th>
              <th className="bg-gray-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
              <th className="bg-gray-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Payment</th>
              <th className="bg-gray-50 px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Weight</th>
              <th className="bg-gray-50 px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Amount</th>
              {action && (
                <th className="bg-gray-50 px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((o) => {
              const style = getStatusStyle(o.statusV2);
              const raw = o.raw as Record<string, unknown>;
              const description = orderDescription(raw);
              const rowAction = action?.(o);

              return (
                <tr
                  key={o.id}
                  className={cn('transition-colors hover:bg-gray-50', onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(o)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <span className="block max-w-45 truncate" title={description}>
                      {description}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{o.senderName ?? 'Unknown'}</td>
                  <td className="px-4 py-3">
                    {isInternalTracking(o.trackingNumber) ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : (
                      <span className="text-xs font-mono text-gray-400">{o.trackingNumber}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs capitalize text-gray-500">
                      {modeIcon(o.transportMode)}
                      {o.transportMode}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', style.bgClass, style.textClass)}>
                      {o.statusLabel || o.statusV2}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatPaymentStatus(o.paymentCollectionStatus)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500">{orderWeight(raw)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500">
                    {o.amount != null ? formatUsd(o.amount) : '—'}
                  </td>
                  {action && (
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {rowAction}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
