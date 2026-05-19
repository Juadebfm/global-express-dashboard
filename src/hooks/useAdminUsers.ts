import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, AdminUserListParams } from '@/types';
import {
  getUserById,
  getUsers,
  updateClientLoginPermission,
  updateShipmentBatchPermission,
} from '@/services';
import { FEEDBACK_MESSAGES } from '@/constants';
import { useFeedbackStore } from '@/store';

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

export function useAdminUserDetail(id: string | null): {
  data: User | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const query = useQuery<User>({
    queryKey: ['admin-users', 'detail', id],
    queryFn: async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      if (!id) throw new Error('Missing user id');
      return getUserById(token, id);
    },
    enabled: !!id,
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

export function useUpdateClientLoginPermission(): {
  mutate: (input: { id: string; canProvisionClientLogin: boolean }) => Promise<User>;
  isPending: boolean;
  error: Error | null;
} {
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<User, Error, { id: string; canProvisionClientLogin: boolean }>({
    mutationFn: async ({ id, canProvisionClientLogin }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return updateClientLoginPermission(token, id, canProvisionClientLogin);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<User>(
        ['admin-users', 'detail', variables.id],
        (prev) => (prev ? { ...prev, ...data } : data),
      );
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['team'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.adminUsers.clientLoginPermissionSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.adminUsers.clientLoginPermissionError,
      });
    },
  });

  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useUpdateShipmentBatchPermission(): {
  mutate: (input: { id: string; canManageShipmentBatches: boolean }) => Promise<User>;
  isPending: boolean;
  error: Error | null;
} {
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<User, Error, { id: string; canManageShipmentBatches: boolean }>({
    mutationFn: async ({ id, canManageShipmentBatches }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return updateShipmentBatchPermission(token, id, canManageShipmentBatches);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<User>(
        ['admin-users', 'detail', variables.id],
        (prev) => (prev ? { ...prev, ...data } : data),
      );
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['team'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.adminUsers.shipmentBatchPermissionSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.adminUsers.shipmentBatchPermissionError,
      });
    },
  });

  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}
