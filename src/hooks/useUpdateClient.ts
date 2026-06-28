import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateClientDetails } from '@/services';
import type { UpdateClientPayload } from '@/types';

const TOKEN_KEY = 'globalxpress_token';

export function useUpdateClient(clientId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateClientPayload) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      if (!clientId) throw new Error('Client ID is required');
      return updateClientDetails(token, clientId, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
      if (clientId) {
        void queryClient.invalidateQueries({ queryKey: ['clients', clientId, 'workbench'] });
      }
    },
  });
}
