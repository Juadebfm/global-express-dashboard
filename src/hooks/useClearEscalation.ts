import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clearEscalation } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useClearEscalation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return clearEscalation(token, orderId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });
}
