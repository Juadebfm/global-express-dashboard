import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateUserPayload } from '@/types';
import { updateUser } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateUserPayload }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return updateUser(token, id, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}
