import { useMutation, useQueryClient } from '@tanstack/react-query';
import { escalateOrder } from '@/services';
import { useFeedbackStore } from '@/store';

const TOKEN_KEY = 'globalxpress_token';

export function useEscalateOrder() {
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  return useMutation({
    mutationFn: ({ orderId, note }: { orderId: string; note: string }) => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return escalateOrder(token, orderId, note);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['order'] });
      pushMessage({ tone: 'info', message: 'Order flagged for supervisor review.' });
    },
    onError: () => {
      pushMessage({ tone: 'error', message: 'Could not flag the order — please try again.' });
    },
  });
}
