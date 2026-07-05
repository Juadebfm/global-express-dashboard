import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { getTopCustomers } from '@/services';
import { ROUTES } from '@/constants';
import { STALE_TIME } from '@/lib/queryDefaults';

const TOKEN_KEY = 'globalxpress_token';

export function TopCustomers(): ReactElement {
  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['dashboard', 'top-customers'],
    queryFn: () => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getTopCustomers(token, { limit: 5 });
    },
    staleTime: STALE_TIME.SLOW_MOVING,
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Top Customers</h3>
          <p className="mt-0.5 text-xs text-gray-500">By order volume, all time</p>
        </div>
        <Link
          to={ROUTES.CLIENTS}
          className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 transition"
        >
          All customers
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {error ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-red-500">Failed to load customers</p>
        </div>
      ) : isLoading ? (
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <span className="h-7 w-7 animate-pulse rounded-full bg-gray-100" />
              <span className="h-3.5 w-32 animate-pulse rounded bg-gray-100 flex-1" />
              <span className="h-3.5 w-10 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-gray-500">No customer data yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {customers.map((c, i) => (
            <div key={c.customerId} className="flex items-center gap-3 px-5 py-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
                {c.displayName}
              </span>
              <span className="shrink-0 text-xs font-semibold text-gray-500">
                {c.orderCount} {c.orderCount === 1 ? 'order' : 'orders'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
