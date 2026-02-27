import { useMutation } from '@tanstack/react-query';
import type { InitializePaymentPayload } from '@/types';
import { initializePayment } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useInitializePayment() {
  return useMutation({
    mutationFn: async (payload: InitializePaymentPayload) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return initializePayment(token, payload);
    },
  });
}
