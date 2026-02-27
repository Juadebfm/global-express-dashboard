import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateClientPayload } from '@/types';
import { createClient } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateClientPayload) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return createClient(token, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
