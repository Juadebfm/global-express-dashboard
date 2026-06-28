import { useMutation, useQueryClient } from '@tanstack/react-query';
import { activateClient } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useActivateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return activateClient(token, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
