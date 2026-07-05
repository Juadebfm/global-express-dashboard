import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LogisticsSettings } from '@/types';
import { getLogisticsSettings, updateLogisticsSettings } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Not authenticated');
  return token;
}

export function useLogisticsSettings() {
  const queryClient = useQueryClient();

  const query = useQuery<LogisticsSettings>({
    queryKey: ['settings', 'logistics'],
    queryFn: () => getLogisticsSettings(getToken()),
    staleTime: STALE_TIME.SLOW_MOVING,
  });

  const mutation = useMutation({
    mutationFn: (payload: Partial<LogisticsSettings>) =>
      updateLogisticsSettings(getToken(), payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'logistics'] });
    },
  });

  return {
    ...query,
    update: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
  };
}
