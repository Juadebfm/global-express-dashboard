import { useQuery } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { OrdersListResult } from '@/types';
import { getOrders } from '@/services';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

interface OrdersState {
  orders: OrdersListResult['data'];
  total: number;
  isLoading: boolean;
  error: string | null;
}

export function useOrders(page = 1, limit = 100, statusV2?: string): OrdersState {
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();

  const isCustomer = isClerkSignedIn && !user;
  const enabled = isClerkSignedIn || !!user;

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', 'list', isCustomer ? 'customer' : 'internal', page, limit, statusV2 ?? 'all'],
    queryFn: async (): Promise<OrdersListResult> => {
      const token = isCustomer ? await getToken() : localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getOrders(token, page, limit, statusV2);
    },
    enabled,
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load orders' : null;

  return {
    orders: data?.data ?? [],
    total: data?.pagination.total ?? 0,
    isLoading,
    error: message,
  };
}
