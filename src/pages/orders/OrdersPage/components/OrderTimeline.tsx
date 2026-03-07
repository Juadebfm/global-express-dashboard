import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils';
import { formatDate } from '@/utils';
import { getStatusStyle } from '@/lib/statusUtils';
import type { OrderTimelineEvent } from '@/services/ordersService';
import { statusLabel } from '../types';

interface OrderTimelineProps {
  events: OrderTimelineEvent[];
  isLoading: boolean;
  error: Error | null;
}

export function OrderTimeline({ events, isLoading, error }: OrderTimelineProps): ReactElement {
  const { t } = useTranslation(['orders', 'shipments']);

  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [events],
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="text-base font-semibold text-gray-900">{t('orders:timeline.title')}</h3>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message || t('orders:timeline.error')}
        </p>
      )}

      {isLoading ? (
        <p className="mt-3 text-sm text-gray-500">{t('orders:timeline.loading')}</p>
      ) : sorted.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{t('orders:timeline.empty')}</p>
      ) : (
        <ol className="mt-4 space-y-0">
          {sorted.map((item, index) => {
            const style = getStatusStyle(item.status);
            const isLast = index === sorted.length - 1;
            return (
              <li key={`${item.status}-${item.timestamp}-${index}`} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'mt-1.5 h-3 w-3 rounded-full ring-2 ring-white',
                      isLast ? style.dotClass : 'bg-gray-300',
                    )}
                  />
                  {!isLast && <span className="mt-0.5 h-full w-px bg-gray-200" />}
                </div>
                <div className="pb-5">
                  <p className={cn('text-sm font-semibold', isLast ? 'text-gray-900' : 'text-gray-600')}>
                    {t(`shipments:statusV2.${item.status}`, {
                      defaultValue: item.statusLabel || statusLabel(item.status),
                    })}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatDate(item.timestamp, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
