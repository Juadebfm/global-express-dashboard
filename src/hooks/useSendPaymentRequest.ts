import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendPaymentRequest } from '@/services';
import { useFeedbackStore } from '@/store';
import { useAuthToken } from './useAuthToken';
import { ApiError } from '@/lib/apiClient';
import { getDisplayErrorMessage } from '@/lib/feedback';

export function useSendPaymentRequest() {
  const getToken = useAuthToken();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return { orderId, result: await sendPaymentRequest(token, orderId) };
    },
    onSuccess: ({ orderId, result }) => {
      // The response amount is the backend's remaining balance. Do not
      // subtract payments or convert currency in the client.
      void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      pushMessage({
        tone: 'success',
        message: `Payment details sent — $${result.amountUsd} USD (₦${result.amountNgn} NGN)`,
      });
    },
    onError: (error) => {
      // A fully paid order can change in another staff member's session. A
      // refresh removes its stale send-payment action from this screen.
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
      pushMessage({
        tone: 'error',
        message: getDisplayErrorMessage(error, 'Failed to send payment details. Please try again.'),
      });
    },
  });
}
