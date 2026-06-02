import { useMutation } from '@tanstack/react-query';
import type { InitializePaymentPayload } from '@/types';
import { initializePayment } from '@/services';
import { useAuthToken } from './useAuthToken';

export function useInitializePayment() {
  const getToken = useAuthToken();

  return useMutation({
    // Idempotency-Key is generated per submit click. TanStack's useMutation
    // default is retry=0, so this runs exactly once per mutate() call.
    // DO NOT enable `retry` on this mutation without restructuring the input
    // to carry the key — retries would otherwise generate fresh keys and
    // defeat BE-side dedup, potentially creating two Paystack transactions.
    mutationFn: async (payload: InitializePaymentPayload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const idempotencyKey = crypto.randomUUID();
      return initializePayment(token, payload, idempotencyKey);
    },
  });
}
