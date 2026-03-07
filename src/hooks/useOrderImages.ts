import { useQuery } from '@tanstack/react-query';
import type { OrderImage } from '@/types';
import { getOrderImages } from '@/services';
import { useAuthToken } from './useAuthToken';

export function useOrderImages(orderId: string | undefined) {
  const getToken = useAuthToken();

  return useQuery<OrderImage[]>({
    queryKey: ['order-images', orderId],
    queryFn: async (): Promise<OrderImage[]> => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getOrderImages(token, orderId!);
    },
    enabled: Boolean(orderId),
  });
}
