import type { ReactElement } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCustomerTrackingCategory } from '@/lib/statusUtils';
import { cn } from '@/utils';

interface TimelineEventLike {
  status: string;
  statusLabel: string;
  timestamp: string;
}

interface ShipmentTimelineProps {
  timeline: TimelineEventLike[];
  currentStatus?: string;
  isLoading?: boolean;
}

const DOT_COLOR: Record<string, string> = {
  pending: 'bg-amber-500',
  active: 'bg-blue-500',
  completed: 'bg-emerald-500',
  exception: 'bg-rose-500',
};

const RING_COLOR: Record<string, string> = {
  pending: 'ring-amber-200',
  active: 'ring-blue-200',
  completed: 'ring-emerald-200',
  exception: 'ring-rose-200',
};

function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ShipmentTimeline({ timeline, currentStatus, isLoading }: ShipmentTimelineProps): ReactElement {
  const { t } = useTranslation('tracking');

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900">{t('internal.timeline')}</h3>
      {timeline.length > 0 ? (
        <ol className="mt-4 space-y-0">
          {timeline.map((event, idx) => {
            const isLast = idx === timeline.length - 1;
            const isCurrent = event.status === currentStatus;
            const category = getCustomerTrackingCategory(event.status);

            return (
              <li key={event.status} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      isCurrent
                        ? `${DOT_COLOR[category]} ring-4 ${RING_COLOR[category]}`
                        : DOT_COLOR[category],
                    )}
                  >
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                  {!isLast && <div className="w-0.5 grow bg-gray-200" />}
                </div>

                <div className={cn('pb-6', isLast && 'pb-0')}>
                  <p
                    className={cn(
                      'text-sm font-semibold leading-7',
                      isCurrent ? 'text-gray-900' : 'text-gray-700',
                    )}
                  >
                    {t(`shipments:customerTrackingStatus.${event.status}`, { defaultValue: event.statusLabel })}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">{formatEventTime(event.timestamp)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : isLoading ? (
        <p className="mt-3 text-sm text-gray-400">{t('internal.tracking')}</p>
      ) : (
        <p className="mt-3 text-sm text-gray-400">{t('internal.timelineEmpty')}</p>
      )}
    </div>
  );
}
