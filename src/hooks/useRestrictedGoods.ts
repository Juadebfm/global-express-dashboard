import { useQuery } from '@tanstack/react-query';
import type { RestrictedGood } from '@/types';
import { getRestrictedGoods } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function useRestrictedGoods(params: { includeInactive?: boolean } = {}) {
  return useQuery<RestrictedGood[]>({
    queryKey: ['settings', 'restricted-goods', params],
    queryFn: () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getRestrictedGoods(token, params);
    },
  });
}
