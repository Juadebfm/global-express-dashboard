import { useMutation } from '@tanstack/react-query';
import type { InitializePaymentPayload } from '@/types';
import { initializePayment } from '@/services';
import { useAuthToken } from './useAuthToken';

export function useInitializePayment() {
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async (payload: InitializePaymentPayload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return initializePayment(token, payload);
    },
  });
}
