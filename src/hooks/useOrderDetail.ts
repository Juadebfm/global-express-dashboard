import { useQuery } from '@tanstack/react-query';
import type { ApiOrder } from '@/types';
import { getOrderById } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useOrderDetail(orderId: string | undefined) {
  return useQuery<ApiOrder>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getOrderById(token, orderId!);
    },
    enabled: Boolean(orderId),
  });
}
