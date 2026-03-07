import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils';
import { formatDate, resolveLocation } from '@/utils';
import { getStatusStyle } from '@/lib/statusUtils';
import type { OrderListItem } from '@/types';
import { OPERATOR_FILTERS, statusLabel } from '../types';
import type { OperatorFilter } from '../types';

interface OrderQueueProps {
  orders: OrderListItem[];
  total: number;
  selectedOrderId: string | null;
  isOperator: boolean;
  activeFilter: OperatorFilter;
  query: string;
  onSelectOrder: (id: string) => void;
  onFilterChange: (filter: OperatorFilter) => void;
  onQueryChange: (query: string) => void;
}

export function OrderQueue({
  orders,
  total,
  selectedOrderId,
  isOperator,
  activeFilter,
  query,
  onSelectOrder,
  onFilterChange,
  onQueryChange,
}: OrderQueueProps): ReactElement {
  const { t } = useTranslation(['orders', 'shipments']);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-4">
        <h2 className="text-base font-semibold text-gray-900">{t('orders:queue.title')}</h2>
        <p className="mt-1 text-xs text-gray-500">
          {t('orders:queue.shown', { shown: orders.length, total })}
        </p>

        {isOperator && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {OPERATOR_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => onFilterChange(filter)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                  activeFilter === filter
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {filter === 'all'
                  ? t('orders:filters.all')
                  : t(`shipments:statusV2.${filter}`, { defaultValue: statusLabel(filter) })}
              </button>
            ))}
          </div>
        )}

        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t('orders:queue.searchPlaceholder')}
          className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      <div className="max-h-[72vh] overflow-y-auto">
        {orders.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">{t('orders:empty')}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {orders.map((order) => {
              const style = getStatusStyle(order.statusV2 || order.status);
              const selected = order.id === selectedOrderId;
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => onSelectOrder(order.id)}
                    className={cn(
                      'w-full px-4 py-3.5 text-left transition',
                      selected ? 'bg-brand-50 border-l-2 border-brand-500' : 'hover:bg-gray-50',
                    )}
                  >
                    <p className="text-sm font-semibold text-gray-900">{order.trackingNumber}</p>
                    {isOperator && order.senderName && (
                      <p className="mt-0.5 text-xs font-medium text-gray-600">{order.senderName}</p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-500">
                      {resolveLocation(order.origin)} &rarr; {resolveLocation(order.destination)}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-gray-400">
                        {order.createdAt
                          ? formatDate(order.createdAt, { month: 'short', day: 'numeric' })
                          : '-'}
                      </p>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          style.bgClass,
                          style.textClass,
                        )}
                      >
                        {order.statusV2
                          ? t(`shipments:statusV2.${order.statusV2}`, {
                              defaultValue: order.statusLabel || statusLabel(order.statusV2),
                            })
                          : order.statusLabel || statusLabel(order.status)}
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
