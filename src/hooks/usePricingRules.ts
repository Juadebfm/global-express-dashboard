import { useQuery } from '@tanstack/react-query';
import type { PricingRule } from '@/types';
import { getPricingRules } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';

const TOKEN_KEY = 'globalxpress_token';

export function usePricingRules(params: { mode?: string; customerId?: string; includeInactive?: boolean } = {}) {
  return useQuery<PricingRule[]>({
    queryKey: ['settings', 'pricing', params],
    queryFn: () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getPricingRules(token, params);
    },
    staleTime: STALE_TIME.SLOW_MOVING,
  });
}
