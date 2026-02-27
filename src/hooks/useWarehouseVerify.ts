import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { WarehouseVerifyPayload } from '@/types';
import { verifyOrder } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useWarehouseVerify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, payload }: { orderId: string; payload: WarehouseVerifyPayload }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return verifyOrder(token, orderId, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['order'] });
      void queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}
