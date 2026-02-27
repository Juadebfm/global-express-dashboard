import { useQuery } from '@tanstack/react-query';
import type { OrderImage } from '@/types';
import { getOrderImages } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useOrderImages(orderId: string | undefined) {
  return useQuery<OrderImage[]>({
    queryKey: ['order-images', orderId],
    queryFn: async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getOrderImages(token, orderId!);
    },
    enabled: Boolean(orderId),
  });
}
