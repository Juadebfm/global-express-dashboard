import { useQuery } from '@tanstack/react-query';
import type { ApiOrder } from '@/types';
import { getOrderById } from '@/services';
import { useAuthToken } from './useAuthToken';

export function useOrderDetail(orderId: string | undefined) {
  const getToken = useAuthToken();

  return useQuery<ApiOrder>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getOrderById(token, orderId!);
    },
    enabled: Boolean(orderId),
  });
}
