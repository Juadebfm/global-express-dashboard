import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ROUTES } from '@/constants';
import type { OrderListItem } from '@/types';
import { OrdersTable } from './OrdersTable';
import { modeIcon } from '../utils/orderDisplay';

export function BatchGroup({
  batchId,
  orders,
  linkLabel = 'Manage batch →',
  onRowClick,
}: {
  batchId: string;
  orders: OrderListItem[];
  linkLabel?: string;
  onRowClick?: (order: OrderListItem) => void;
}): ReactElement {
  const [expanded, setExpanded] = useState(true);
  const shortId = batchId.slice(0, 8);
  const firstMode = orders[0]?.transportMode ?? 'air';

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
      >
        {expanded
          ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
        }
        <span className="shrink-0 text-gray-400">{modeIcon(firstMode)}</span>
        <span className="text-base font-semibold text-gray-900 font-mono">{shortId}</span>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600">
          {orders.length} order{orders.length !== 1 ? 's' : ''}
        </span>
        <Link
          to={ROUTES.BATCH_DETAIL.replace(':batchId', batchId)}
          onClick={(e) => e.stopPropagation()}
          className="ml-auto shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          {linkLabel}
        </Link>
      </button>
      {expanded && (
        <div className="border-t border-gray-100">
          <OrdersTable orders={orders} onRowClick={onRowClick} />
        </div>
      )}
    </div>
  );
}
