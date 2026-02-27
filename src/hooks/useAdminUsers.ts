import { useQuery } from '@tanstack/react-query';
import type { User, AdminUserListParams } from '@/types';
import { getUsers } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

interface AdminUsersState {
  users: User[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

export function useAdminUsers(params: AdminUserListParams = {}): AdminUsersState {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', params],
    queryFn: async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getUsers(token, params);
    },
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load users' : null;

  return {
    users: data?.data ?? [],
    total: data?.pagination.total ?? 0,
    isLoading,
    error: message,
  };
}
