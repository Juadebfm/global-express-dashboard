import type { ReactElement } from 'react';
import { Plane, Ship } from 'lucide-react';
import { cn } from '@/utils';
import { formatDate, resolveLocation } from '@/utils';
import type { OrderListItem } from '@/types';
import {
  OPERATOR_FILTERS,
  statusLabel,
  hasVerifyBadge,
  hasUnpaidBadge,
} from '../types';
import type { OperatorFilter } from '../types';

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

function TransportIcon({ mode }: { mode: string }): ReactElement {
  if (mode === 'sea') {
    return <Ship className="h-3.5 w-3.5 shrink-0 text-blue-400" />;
  }
  return <Plane className="h-3.5 w-3.5 shrink-0 text-brand-400" />;
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
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900">Orders</h2>
          <span className="text-xs text-gray-400">
            {orders.length} / {total}
          </span>
        </div>

        {isOperator && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {OPERATOR_FILTERS.map((filter) => {
              const isNeeds = filter === 'needs_action';
              const label = filter === 'all' ? 'All' : `Needs action`;
              const count = isNeeds ? needsActionCount : null;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => onFilterChange(filter)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                    activeFilter === filter
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  {label}
                  {count != null && count > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                        activeFilter === filter
                          ? 'bg-white/25 text-white'
                          : 'bg-amber-100 text-amber-700',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by tracking number, name…"
          className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      <div className="max-h-[72vh] overflow-y-auto">
        {orders.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">No orders found</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {orders.map((order) => {
              const selected = order.id === selectedOrderId;
              const showVerify = hasVerifyBadge(order.statusV2);
              const showUnpaid = hasUnpaidBadge(order.paymentCollectionStatus);

              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => onSelectOrder(order.id)}
                    className={cn(
                      'w-full px-4 py-3.5 text-left transition',
                      selected
                        ? 'border-l-2 border-brand-500 bg-brand-50'
                        : 'hover:bg-gray-50',
                    )}
                  >
                    {/* Top row: icon + tracking + badges */}
                    <div className="flex items-center gap-2">
                      <TransportIcon mode={order.transportMode ?? 'air'} />
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                        {order.trackingNumber}
                      </p>
                      {showVerify && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Verify
                        </span>
                      )}
                      {showUnpaid && (
                        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                          Unpaid
                        </span>
                      )}
                    </div>

                    {/* Sender name */}
                    {isOperator && order.senderName && (
                      <p className="mt-0.5 truncate text-xs font-medium text-gray-600">
                        {order.senderName}
                      </p>
                    )}

                    {/* Route */}
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {resolveLocation(order.origin)} → {resolveLocation(order.destination)}
                    </p>

                    {/* Bottom row: date + status label */}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-gray-400">
                        {order.createdAt
                          ? formatDate(order.createdAt, { month: 'short', day: 'numeric' })
                          : '—'}
                      </p>
                      <span className="truncate text-[11px] font-medium text-gray-500">
                        {statusLabel(order.statusV2 || order.status)}
                      </span>
                    </div>
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
