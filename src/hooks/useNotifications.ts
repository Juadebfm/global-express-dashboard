import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { ApiNotification } from '@/types';
import { getNotifications, markNotificationRead, toggleNotificationSave } from '@/services';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

interface NotificationsState {
  notifications: ApiNotification[];
  total: number;
  isLoading: boolean;
  error: string | null;
  markRead: (id: string) => void;
  toggleSave: (id: string) => void;
  refresh: () => void;
}

export function useNotifications(): NotificationsState {
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();
  const queryClient = useQueryClient();

  const isCustomer = isClerkSignedIn && !user;
  const enabled = isClerkSignedIn || !!user;

  const getToken_ = async (): Promise<string | null> => {
    if (isCustomer) return getToken();
    return localStorage.getItem(TOKEN_KEY);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => {
      const token = await getToken_();
      if (!token) throw new Error('Not authenticated');
      return getNotifications(token);
    },
    enabled,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken_();
      if (!token) throw new Error('Not authenticated');
      return markNotificationRead(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const toggleSaveMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken_();
      if (!token) throw new Error('Not authenticated');
      return toggleNotificationSave(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
    toggleSave: (id: string) => toggleSaveMutation.mutate(id),
    refresh: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  };
}
