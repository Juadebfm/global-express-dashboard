import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RecordOfflinePayload } from '@/types';
import { recordOfflinePayment } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useRecordOfflinePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, payload }: { orderId: string; payload: RecordOfflinePayload }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return recordOfflinePayment(token, orderId, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
