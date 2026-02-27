import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LogisticsSettings } from '@/types';
import { getLogisticsSettings, updateLogisticsSettings } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Not authenticated');
  return token;
}

export function useLogisticsSettings() {
  const queryClient = useQueryClient();

  const query = useQuery<LogisticsSettings>({
    queryKey: ['settings', 'logistics'],
    queryFn: () => getLogisticsSettings(getToken()),
  });

  const mutation = useMutation({
    mutationFn: (payload: Partial<LogisticsSettings>) =>
      updateLogisticsSettings(getToken(), payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'logistics'] });
    },
  });

  return { ...query, update: mutation.mutateAsync };
}
