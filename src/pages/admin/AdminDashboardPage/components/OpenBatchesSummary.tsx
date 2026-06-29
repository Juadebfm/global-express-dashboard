import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plane, Ship } from 'lucide-react';
import { useBatches } from '@/hooks';
import { ROUTES } from '@/constants';
import type { BatchListItem } from '@/types';

function modeStats(batches: BatchListItem[], mode: 'air' | 'sea') {
  const filtered = batches.filter((b) => b.transportMode === mode);
  return {
    count: filtered.length,
    orders: filtered.reduce((sum, b) => sum + b.orderCount, 0),
  };
}

export function OpenBatchesSummary(): ReactElement {
  const { data, isLoading } = useBatches({ status: 'open' });
  const batches = data?.batches ?? [];

  const air = modeStats(batches, 'air');
  const sea = modeStats(batches, 'sea');
  const hasAny = air.count > 0 || sea.count > 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Open Batches</h3>
          <p className="mt-0.5 text-xs text-gray-500">Currently active shipment batches</p>
        </div>
        <Link
          to={ROUTES.BATCHES}
          className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 transition"
        >
          All batches
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="divide-y divide-gray-100">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <span className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
              <div className="flex-1 space-y-1.5">
                <span className="block h-3.5 w-20 animate-pulse rounded bg-gray-100" />
                <span className="block h-3 w-28 animate-pulse rounded bg-gray-100" />
              </div>
              <span className="h-5 w-10 animate-pulse rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      ) : !hasAny ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-medium text-gray-700">No open batches</p>
          <p className="mt-1 text-xs text-gray-400">All batches are currently closed</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {air.count > 0 && (
            <div className="flex items-center gap-3 px-5 py-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Plane className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {air.count} air {air.count === 1 ? 'batch' : 'batches'}
                </p>
                <p className="text-xs text-gray-500">{air.orders} {air.orders === 1 ? 'order' : 'orders'} in flight</p>
              </div>
            </div>
          )}
          {sea.count > 0 && (
            <div className="flex items-center gap-3 px-5 py-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                <Ship className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {sea.count} sea {sea.count === 1 ? 'batch' : 'batches'}
                </p>
                <p className="text-xs text-gray-500">{sea.orders} {sea.orders === 1 ? 'order' : 'orders'} at sea</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
