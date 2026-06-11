import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiOrder } from '@/types';
import { sendPaymentRequest } from '@/services';
import { useFeedbackStore } from '@/store';
import { useAuthToken } from './useAuthToken';

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
      queryClient.setQueryData<ApiOrder>(['order', orderId], (old) => {
        if (!old) return old;
        return { ...old, paymentDetailsSentAt: result.paymentDetailsSentAt };
      });
      pushMessage({
        tone: 'success',
        message: `Payment details sent — $${result.amountUsd} USD (₦${result.amountNgn} NGN)`,
      });
    },
    onError: () => {
      pushMessage({
        tone: 'error',
        message: 'Failed to send payment details. Please try again.',
      });
    },
  });
}
