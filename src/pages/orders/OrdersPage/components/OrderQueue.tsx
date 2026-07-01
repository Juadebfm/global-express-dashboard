import type { ReactElement } from 'react';
import { Plane, Ship } from 'lucide-react';
import { cn } from '@/utils';
import { formatDate } from '@/utils';
import { formatTrackingDisplay } from '@/lib/trackingUtils';
import type { OrderListItem } from '@/types';
import { OPERATOR_FILTERS, statusLabel } from '../types';
import type { OperatorFilter } from '../types';

interface QueueBadge {
  label: string;
  variant: 'amber' | 'red';
}

function getQueueBadge(statusV2: string, paymentCollectionStatus: string): QueueBadge | null {
  const s = statusV2.toUpperCase();
  if (s === 'AWAITING_WAREHOUSE_RECEIPT') return { label: 'Confirm arrival', variant: 'amber' };
  if (s === 'WAREHOUSE_RECEIVED' || s === 'CLAIM_APPROVED_PENDING_BULK_PROCESSING') {
    return { label: 'Verify', variant: 'amber' };
  }
  if (s === 'ON_HOLD') return { label: 'Resolve hold', variant: 'red' };
  const pcs = paymentCollectionStatus.toUpperCase();
  if (
    (pcs === 'UNPAID' || pcs === 'PAYMENT_IN_PROGRESS') &&
    s === 'WAREHOUSE_VERIFIED_PRICED'
  ) {
    return { label: 'Collect payment', variant: 'amber' };
  }
  return null;
}

interface OrderQueueProps {
  orders: OrderListItem[];
  total: number;
  needsActionCount: number;
  selectedOrderId: string | null;
  isOperator: boolean;
  activeFilter: OperatorFilter;
  query: string;
  onSelectOrder: (id: string) => void;
  onFilterChange: (filter: OperatorFilter) => void;
  onQueryChange: (query: string) => void;
}

function truncateTracking(trackingNumber: string): string {
  const display = formatTrackingDisplay(trackingNumber);
  if (display.length <= 9) return display;
  return `...${display.slice(-9)}`;
}

export function OrderQueue({
  orders,
  total,
  needsActionCount,
  selectedOrderId,
  isOperator,
  activeFilter,
  query,
  onSelectOrder,
  onFilterChange,
  onQueryChange,
}: OrderQueueProps): ReactElement {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900">Order queue</h2>
          <span className="text-xs font-medium text-gray-400">{total} open</span>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Tracking, name, status..."
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-brand-500"
        />

        {isOperator && (
          <div className="mt-2.5 flex gap-1.5">
            {OPERATOR_FILTERS.map((filter) => {
              const isNeeds = filter === 'needs_action';
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => onFilterChange(filter)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition',
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  {isNeeds && (
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        isActive ? 'bg-white' : 'bg-brand-500',
                      )}
                    />
                  )}
                  {isNeeds ? 'Needs action' : 'All'}
                  {isNeeds && needsActionCount > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                        isActive ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700',
                      )}
                    >
                      {needsActionCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* List */}
      <div className="max-h-[72vh] overflow-y-auto">
        {orders.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">No orders found</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {orders.map((order) => {
              const selected = order.id === selectedOrderId;
              const badge = getQueueBadge(order.statusV2, order.paymentCollectionStatus);
              const isSea = order.transportMode === 'sea';

              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => onSelectOrder(order.id)}
                    className={cn(
                      'w-full px-4 py-3.5 text-left transition',
                      selected
                        ? 'border-l-2 border-brand-500 bg-brand-50'
                        : 'border-l-2 border-transparent hover:bg-gray-50',
                    )}
                  >
                    {/* Row 1: truncated tracking + date */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-500 tabular-nums">
                        {truncateTracking(order.trackingNumber)}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {order.createdAt
                          ? formatDate(order.createdAt, { month: 'short', day: 'numeric' })
                          : '—'}
                      </span>
                    </div>

                    {/* Row 2: icon + name (left) + badges (right) */}
                    <div className="mt-1 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {isSea ? (
                          <Ship className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                        ) : (
                          <Plane className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                        )}
                        {isOperator && order.senderName ? (
                          <span className="truncate text-sm font-semibold text-gray-800">
                            {order.senderName}
                          </span>
                        ) : (
                          <span className="truncate text-sm font-medium text-gray-700">
                            {order.trackingNumber}
                          </span>
                        )}
                      </div>

                      {badge && (
                        <span
                          className={cn(
                            'shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1',
                            badge.variant === 'red'
                              ? 'bg-red-50 text-red-600 ring-red-200'
                              : 'bg-amber-50 text-amber-700 ring-amber-200',
                          )}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>

                    {/* Row 3: status */}
                    <p className="mt-1 text-xs text-gray-500">
                      {statusLabel(order.statusV2 || order.status)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
