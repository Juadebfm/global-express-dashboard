import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RestrictedGood } from '@/types';
import { getRestrictedGoods, updateRestrictedGoods } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useAuthToken } from './useAuthToken';

interface UpdateRestrictedGoodsPayload {
  items?: Partial<RestrictedGood>[];
  deleteIds?: string[];
}

export function useRestrictedGoods(
  params: { includeInactive?: boolean } = {},
  options: { enabled?: boolean } = {},
) {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const query = useQuery<RestrictedGood[]>({
    queryKey: ['settings', 'restricted-goods', params],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getRestrictedGoods(token, params);
    },
    enabled: options.enabled ?? true,
    staleTime: STALE_TIME.SLOW_MOVING,
  });

  const mutation = useMutation({
    mutationFn: async (payload: UpdateRestrictedGoodsPayload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateRestrictedGoods(token, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'restricted-goods'] });
    },
  });

  return {
    ...query,
    update: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
  };
}
