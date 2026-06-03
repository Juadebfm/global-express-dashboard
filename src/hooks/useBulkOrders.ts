import { useQuery } from '@tanstack/react-query';
import type { ApiBulkOrder, ApiBulkOrdersResponse } from '@/types';
import { getBulkOrders } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';

const TOKEN_KEY = 'globalxpress_token';

// Matches BE default + the rest of the FE (ShipmentsPage, OrdersPage). The
// page list always paginates at 20 rows; callers can override if needed.
const DEFAULT_BULK_ORDERS_PAGE_SIZE = 20;

interface BulkOrdersState {
  bulkOrders: ApiBulkOrder[];
  total: number;
  pagination: ApiBulkOrdersResponse['data']['pagination'];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBulkOrders(
  params: { page?: number; limit?: number } = {},
): BulkOrdersState {
  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_BULK_ORDERS_PAGE_SIZE;
  const effectiveParams = { page, limit };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bulk-orders', effectiveParams],
    queryFn: async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getBulkOrders(token, effectiveParams);
    },
    staleTime: STALE_TIME.REAL_TIME,
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load bulk orders' : null;

  // Fall back to the requested params so Pagination has stable numbers
  // while the first request is in flight.
  const pagination = data?.pagination ?? { total: 0, page, limit, totalPages: 1 };

  return {
    bulkOrders: data?.data ?? [],
    total: pagination.total,
    pagination,
    isLoading,
    error: message,
    refetch,
  };
}
