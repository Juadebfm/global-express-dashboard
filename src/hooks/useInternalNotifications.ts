import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiInternalNotification } from '@/types';
import {
  getInternalNotifications,
  markAllInternalRead,
  markInternalRead,
} from '@/services';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Not authenticated');
  return token;
}

interface InternalNotificationsState {
  notifications: ApiInternalNotification[];
  total: number;
  isLoading: boolean;
  error: string | null;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export function useInternalNotifications(
  params: { page?: number; limit?: number; unreadOnly?: boolean } = {}
): InternalNotificationsState {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['internal-notifications', params],
    queryFn: () => getInternalNotifications(getToken(), params),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markInternalRead(getToken(), id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['internal-notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllInternalRead(getToken()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['internal-notifications'] });
    },
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load notifications' : null;

  return {
    notifications: data?.data ?? [],
    total: data?.pagination.total ?? 0,
    isLoading,
    error: message,
    markRead: (id: string) => markReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
  };
}
