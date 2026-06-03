import { useQuery } from '@tanstack/react-query';
import type { NotificationTemplate } from '@/types';
import { getTemplates } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';

const TOKEN_KEY = 'globalxpress_token';

export function useNotificationTemplates(params: { channel?: string; locale?: string } = {}) {
  return useQuery<NotificationTemplate[]>({
    queryKey: ['settings', 'templates', params],
    queryFn: () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getTemplates(token, params);
    },
    staleTime: STALE_TIME.SLOW_MOVING,
  });
}
