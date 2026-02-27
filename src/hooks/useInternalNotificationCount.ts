import { useQuery } from '@tanstack/react-query';
import { getInternalUnreadCount } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useInternalNotificationCount(enabled = true) {
  return useQuery<number>({
    queryKey: ['internal-notifications', 'unread-count'],
    queryFn: () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getInternalUnreadCount(token);
    },
    enabled,
    refetchInterval: 30_000,
  });
}
