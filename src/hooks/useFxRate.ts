import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FxRateSettings } from '@/types';
import { getFxRate, updateFxRate } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Not authenticated');
  return token;
}

export function useFxRate() {
  const queryClient = useQueryClient();

  const query = useQuery<FxRateSettings>({
    queryKey: ['settings', 'fx-rate'],
    queryFn: () => getFxRate(getToken()),
  });

  const mutation = useMutation({
    mutationFn: (payload: Partial<FxRateSettings>) =>
      updateFxRate(getToken(), payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'fx-rate'] });
    },
  });

  return { ...query, update: mutation.mutateAsync };
}
