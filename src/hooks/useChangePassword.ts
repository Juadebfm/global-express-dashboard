import { useMutation } from '@tanstack/react-query';
import type { ChangePasswordPayload } from '@/types';
import { changeMyPassword } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      await changeMyPassword(token, payload);
    },
  });
}
