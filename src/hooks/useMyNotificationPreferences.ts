import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { NotificationPreferenceChannels, NotificationPreferences } from '@/types';
import { getMyNotificationPreferences, updateMyNotificationPreferences } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useAuth } from './useAuth';
import { useAuthToken } from './useAuthToken';

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
  updateInternalActivityEmails: (enabled: boolean) => Promise<void>;
}

export function useMyNotificationPreferences(): NotificationPreferencesState {
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn } = useClerkAuth();
  const getAuthToken = useAuthToken();
  const queryClient = useQueryClient();

  const isCustomer = isClerkSignedIn && !user;
  const isInternal = user?.role === 'staff' || user?.role === 'admin' || user?.role === 'superadmin';
  const queryKey = ['users', 'me', 'notification-preferences'] as const;

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<NotificationPreferences> => {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication token is missing.');
      return getMyNotificationPreferences(token, isInternal);
    },
    enabled: isCustomer || isInternal,
    staleTime: STALE_TIME.SLOW_MOVING,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      channel,
      enabled,
    }: {
      channel: keyof NotificationPreferenceChannels;
      enabled: boolean;
    }): Promise<NotificationPreferences> => {
      const token = await getAuthToken();
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
      queryClient.setQueryData<NotificationPreferences>(queryKey, (previous) =>
        previous ? { ...previous, channels: result.channels } : result,
      );
    },
  });

  // This preference has a different audience and purpose from the customer
  // email channels. Keep it separate and wait for the server response before
  // changing the displayed switch, so a rejected save never looks successful.
  const internalActivityMutation = useMutation({
    mutationFn: async (enabled: boolean): Promise<NotificationPreferences> => {
      if (!isInternal) {
        throw new Error('GEX activity email preferences are only available to internal users.');
      }
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication token is missing.');
      return updateMyNotificationPreferences(token, { notifyInternalActivityEmails: enabled });
    },
    onSuccess: (result) => {
      queryClient.setQueryData<NotificationPreferences>(queryKey, (previous) =>
        previous
          ? { ...previous, notifyInternalActivityEmails: result.notifyInternalActivityEmails }
          : result,
      );
    },
  });

  const message =
    error instanceof Error
      ? error.message
      : error
        ? 'Failed to load notification preferences'
        : null;

  const mutationError = internalActivityMutation.error ?? updateMutation.error;
  const saveMessage = mutationError instanceof Error
    ? mutationError.message
    : mutationError
      ? 'Failed to update notification preferences'
      : null;

  return {
    preferences: data ?? null,
    isLoading,
    error: message,
    isSaving: updateMutation.isPending || internalActivityMutation.isPending,
    saveError: saveMessage,
    updateChannel: async (channel, enabled) => {
      await updateMutation.mutateAsync({ channel, enabled });
    },
    updateInternalActivityEmails: async (enabled) => {
      await internalActivityMutation.mutateAsync(enabled);
    },
  };
}
