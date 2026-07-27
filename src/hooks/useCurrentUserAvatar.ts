import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { getMyProfile } from '@/services';
import { useAuth } from './useAuth';
import { useAuthToken } from './useAuthToken';

export const currentUserAvatarKey = ['users', 'me', 'avatar'] as const;

export function useCurrentUserAvatar(): string | null {
  const { user: internalUser } = useAuth();
  const { isSignedIn: isClerkSignedIn } = useClerkAuth();
  const getToken = useAuthToken();
  const isExternalUser = isClerkSignedIn && !internalUser;

  const query = useQuery({
    queryKey: currentUserAvatarKey,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const profile = await getMyProfile(token);
      return profile.avatarUrl;
    },
    enabled: isExternalUser,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return internalUser?.avatarUrl ?? query.data ?? null;
}

export function useSetCurrentUserAvatar(): (avatarUrl: string | null) => void {
  const queryClient = useQueryClient();
  return (avatarUrl) => {
    queryClient.setQueryData(currentUserAvatarKey, avatarUrl);
  };
}
