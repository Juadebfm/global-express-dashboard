import { useMutation, useQueryClient } from '@tanstack/react-query';
import { escalateOrder } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useEscalateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, note }: { orderId: string; note: string }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return escalateOrder(token, orderId, note);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });
}
