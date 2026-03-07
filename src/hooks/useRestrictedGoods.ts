import { useQuery } from '@tanstack/react-query';
import type { RestrictedGood } from '@/types';
import { getRestrictedGoods } from '@/services';
import { useAuthToken } from './useAuthToken';

interface UseRestrictedGoodsOptions {
  enabled?: boolean;
}

export function useRestrictedGoods(
  params: { includeInactive?: boolean } = {},
  options: UseRestrictedGoodsOptions = {}
) {
  const getToken = useAuthToken();

  return useQuery<RestrictedGood[]>({
    queryKey: ['settings', 'restricted-goods', params],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getRestrictedGoods(token, params);
    },
    enabled: options.enabled ?? true,
  });
}
