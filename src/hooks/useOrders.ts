import { useQuery } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { OrdersListResult } from '@/types';
import { getOrders } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

interface OrdersState {
  orders: OrdersListResult['data'];
  total: number;
  pagination: OrdersListResult['pagination'];
  isLoading: boolean;
  error: string | null;
}

interface UseOrdersOptions {
  enabled?: boolean;
}

// Matches the BE default. The backend accepts at most 100 rows per request;
// callers that need more data must paginate instead of increasing this limit.
const DEFAULT_ORDERS_PAGE_SIZE = 20;

export function useOrders(
  page = 1,
  limit = DEFAULT_ORDERS_PAGE_SIZE,
  statusV2?: string,
  options: UseOrdersOptions = {}
): OrdersState {
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();

  const isCustomer = isClerkSignedIn && !user;
  const enabled = (isClerkSignedIn || !!user) && (options.enabled ?? true);

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', 'list', isCustomer ? 'customer' : 'internal', page, limit, statusV2 ?? 'all'],
    queryFn: async (): Promise<OrdersListResult> => {
      const token = isCustomer ? await getToken() : sessionStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getOrders(token, page, limit, statusV2);
    },
    enabled,
    staleTime: STALE_TIME.REAL_TIME,
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load orders' : null;

  // Fall back to the requested params so the Pagination primitive has
  // stable numbers while the first request is in flight.
  const pagination = data?.pagination ?? {
    total: 0,
    page,
    limit,
    totalPages: 1,
  };

  return {
    orders: data?.data ?? [],
    total: pagination.total,
    pagination,
    isLoading,
    error: message,
  };
}
