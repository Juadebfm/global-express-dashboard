import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { WaiveBalancePayload } from '@/types';
import { waiveOrderBalance } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useWaiveBalance() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { orderId: string; payload: WaiveBalancePayload }>({
    mutationFn: async ({ orderId, payload }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return waiveOrderBalance(token, orderId, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['order'] });
      void queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}
