import { useQuery } from '@tanstack/react-query';
import type { ApiBulkOrder } from '@/types';
import { getBulkOrders } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

interface BulkOrdersState {
  bulkOrders: ApiBulkOrder[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

export function useBulkOrders(params: { page?: number; limit?: number } = {}): BulkOrdersState {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bulk-orders', params],
    queryFn: async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getBulkOrders(token, params);
    },
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load bulk orders' : null;

  return {
    bulkOrders: data?.data ?? [],
    total: data?.pagination.total ?? 0,
    isLoading,
    error: message,
  };
}
