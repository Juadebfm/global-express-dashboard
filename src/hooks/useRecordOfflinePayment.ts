import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RecordOfflinePayload, RecordOfflineResult } from '@/types';
import type { ApiPayment } from '@/types';
import { recordOfflinePayment } from '@/services';
import { useFeedbackStore } from '@/store';

const TOKEN_KEY = 'globalxpress_token';

export function useRecordOfflinePayment() {
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  return useMutation<
    ApiPayment & RecordOfflineResult,
    Error,
    { orderId: string; payload: RecordOfflinePayload }
  >({
    mutationFn: async ({ orderId, payload }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return recordOfflinePayment(token, orderId, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['order'] });
      void queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
    onError: () => {
      pushMessage({ tone: 'error', message: 'Could not record the payment — please try again.' });
    },
  });
}
