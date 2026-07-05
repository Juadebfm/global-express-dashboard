import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationTemplate } from '@/types';
import { getTemplates, updateTemplate } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Not authenticated');
  return token;
}

export function useNotificationTemplates(
  params: { channel?: string; locale?: string } = {},
) {
  const queryClient = useQueryClient();

  const query = useQuery<NotificationTemplate[]>({
    queryKey: ['settings', 'templates', params],
    queryFn: () => getTemplates(getToken(), params),
    staleTime: STALE_TIME.SLOW_MOVING,
  });

  const mutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<NotificationTemplate>) =>
      updateTemplate(getToken(), id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'templates'] });
    },
  });

  return {
    ...query,
    updateOne: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
  };
}
