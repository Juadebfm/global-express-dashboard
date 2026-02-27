import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChangeUserRolePayload } from '@/types';
import { changeUserRole } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useChangeUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ChangeUserRolePayload }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return changeUserRole(token, id, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
}
