import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOrderStatus } from '@/services';
import { useFeedbackStore } from '@/store';

const TOKEN_KEY = 'globalxpress_token';

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  return useMutation({
    mutationFn: async ({ orderId, statusV2 }: { orderId: string; statusV2: string }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      await updateOrderStatus(token, orderId, statusV2);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['order'] });
      void queryClient.invalidateQueries({ queryKey: ['order', 'timeline'] });
      void queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
    onError: () => {
      pushMessage({ tone: 'error', message: 'Could not update the order status — please try again.' });
    },
  });
}
