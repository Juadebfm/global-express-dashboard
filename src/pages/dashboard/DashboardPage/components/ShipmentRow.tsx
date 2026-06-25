import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Ship } from 'lucide-react';
import { cn, formatDate } from '@/utils';
import { formatTrackingDisplay, isInternalTracking } from '@/lib/trackingUtils';
import { getStatusStyle } from '@/lib/statusUtils';
import type { OrderListItem } from '@/types';
import { ROUTES } from '@/constants';

interface ShipmentRowProps {
  row: OrderListItem;
}

export function ShipmentRow({ row }: ShipmentRowProps): ReactElement {
  const isSea = row.transportMode === 'sea';
  const style = getStatusStyle(row.statusV2);
  const internal = isInternalTracking(row.trackingNumber);

  const formattedDate = row.createdAt
    ? formatDate(row.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <Link
      to={`${ROUTES.ORDERS}?id=${row.id}`}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
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
      </div>
    </Link>
  );
}
