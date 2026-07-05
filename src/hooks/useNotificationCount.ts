import { useQuery } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { getUnreadCount } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

export function useNotificationCount(): number {
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();

  const isCustomer = isClerkSignedIn && !user;
  const enabled = isClerkSignedIn || !!user;

  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const token = isCustomer ? await getToken() : sessionStorage.getItem(TOKEN_KEY);
      if (!token) return 0;
      return getUnreadCount(token);
    },
    enabled,
    refetchInterval: 30_000,
    staleTime: STALE_TIME.ALWAYS_FRESH,
  });

  return data ?? 0;
}
