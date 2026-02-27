import { useMutation } from '@tanstack/react-query';
import type { CreateInternalUserPayload, User } from '@/types';
import { createInternalUser } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useCreateInternalUser() {
  return useMutation({
    mutationFn: async (payload: CreateInternalUserPayload): Promise<User> => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return createInternalUser(token, payload);
    },
  });
}
