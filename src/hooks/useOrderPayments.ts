import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiPayment } from '@/types';
import type { ReceiptVerifyPayload } from '@/types';
import { getOrderPayments, verifyOrderPayment } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', 'payments', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', 'detail', orderId] });
    },
  });
}
