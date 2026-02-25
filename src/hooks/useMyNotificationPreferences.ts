import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { NotificationPreferenceChannels, NotificationPreferences } from '@/types';
import { getMyNotificationPreferences, updateMyNotificationPreferences } from '@/services';
import { useAuth } from './useAuth';

interface NotificationPreferencesState {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  saveError: string | null;
  updateChannel: (
    channel: keyof NotificationPreferenceChannels,
    enabled: boolean
  ) => Promise<void>;
}

export function useMyNotificationPreferences(): NotificationPreferencesState {
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();
  const queryClient = useQueryClient();

  const isCustomer = isClerkSignedIn && !user;
  const queryKey = ['users', 'me', 'notification-preferences'] as const;

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<NotificationPreferences> => {
      const token = await getToken();
      if (!token) throw new Error('Authentication token is missing.');
      return getMyNotificationPreferences(token);
    },
    enabled: isCustomer,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      channel,
      enabled,
    }: {
      channel: keyof NotificationPreferenceChannels;
      enabled: boolean;
    }): Promise<NotificationPreferences | null> => {
      const token = await getToken();
      if (!token) throw new Error('Authentication token is missing.');

      return updateMyNotificationPreferences(token, { [channel]: enabled });
    },
    onMutate: async ({ channel, enabled }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationPreferences>(queryKey);

      if (previous) {
        queryClient.setQueryData<NotificationPreferences>(queryKey, {
          ...previous,
          channels: {
            ...previous.channels,
            [channel]: enabled,
          },
          raw: {
            ...previous.raw,
            [channel]: enabled,
            ...(channel === 'inApp' ? { in_app: enabled } : {}),
          },
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (result) => {
      if (result) {
        queryClient.setQueryData(queryKey, result);
      } else {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  const message =
    error instanceof Error
      ? error.message
      : error
        ? 'Failed to load notification preferences'
        : null;

  const saveMessage =
    updateMutation.error instanceof Error
      ? updateMutation.error.message
      : updateMutation.error
        ? 'Failed to update notification preferences'
        : null;

  return {
    preferences: data ?? null,
    isLoading,
    error: message,
    isSaving: updateMutation.isPending,
    saveError: saveMessage,
    updateChannel: async (channel, enabled) => {
      await updateMutation.mutateAsync({ channel, enabled });
    },
  };
}
