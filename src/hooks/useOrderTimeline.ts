import { useQuery } from '@tanstack/react-query';
import type { OrderTimeline } from '@/services';
import { getOrderTimeline } from '@/services';
import { useAuthToken } from './useAuthToken';

export function useOrderTimeline(orderId: string | undefined, enabled = true) {
  const getToken = useAuthToken();

  return useQuery<OrderTimeline>({
    queryKey: ['order', 'timeline', orderId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getOrderTimeline(token, orderId!);
    },
    enabled: Boolean(orderId) && enabled,
  });
}
