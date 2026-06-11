import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderPayload } from '@/types';
import { createOrder } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useCreateOrderForCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payload, idempotencyKey }: { payload: CreateOrderPayload; idempotencyKey: string }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return createOrder(payload, token, idempotencyKey);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}
