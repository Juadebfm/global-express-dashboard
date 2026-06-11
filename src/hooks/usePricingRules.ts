import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PricingRule } from '@/types';
import { getPricingRules, updatePricingRules } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Not authenticated');
  return token;
}

interface UpdatePricingPayload {
  defaultRules?: Omit<PricingRule, 'id'>[];
  deleteDefaultRuleIds?: string[];
}

export function usePricingRules(
  params: { mode?: string; customerId?: string; includeInactive?: boolean } = {},
) {
  const queryClient = useQueryClient();

  const query = useQuery<PricingRule[]>({
    queryKey: ['settings', 'pricing', params],
    queryFn: () => getPricingRules(getToken(), params),
    staleTime: STALE_TIME.SLOW_MOVING,
  });

  const mutation = useMutation({
    mutationFn: (payload: UpdatePricingPayload) =>
      updatePricingRules(getToken(), payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'pricing'] });
    },
  });

  return {
    ...query,
    update: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
  };
}
