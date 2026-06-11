import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiPayment } from '@/types';
import type { ReceiptVerifyPayload } from '@/types';
import { getOrderPayments, verifyOrderPayment } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useFeedbackStore } from '@/store';
import { useAuthToken } from './useAuthToken';

export function useOrderPayments(orderId: string | undefined, enabled = true) {
  const getToken = useAuthToken();

  return useQuery<ApiPayment[]>({
    queryKey: ['order', 'payments', orderId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getOrderPayments(token, orderId!);
    },
    enabled: Boolean(orderId) && enabled,
    staleTime: STALE_TIME.REAL_TIME,
  });
}

export function useVerifyOrderPayment(orderId: string | undefined) {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  return useMutation({
    mutationFn: async ({
      paymentId,
      payload,
    }: {
      paymentId: string;
      payload: ReceiptVerifyPayload;
    }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return verifyOrderPayment(token, paymentId, payload);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', 'payments', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', 'detail', orderId] });
      // Skip the generic toast on approve when a warning is present — the
      // warning shown inline is the meaningful feedback in that case.
      if (variables.payload.decision === 'reject' || !data.warning) {
        pushMessage({
          tone: variables.payload.decision === 'approve' ? 'success' : 'info',
          message: variables.payload.decision === 'approve' ? 'Receipt approved.' : 'Receipt rejected.',
        });
      }
    },
    onError: () => {
      pushMessage({
        tone: 'error',
        message: 'Could not process receipt. Please try again.',
      });
    },
  });
}
