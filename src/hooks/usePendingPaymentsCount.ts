import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/queryDefaults';
import { getPayments } from '@/services';
import { useCapability } from './usePermissions';

const TOKEN_KEY = 'globalxpress_token';

export function usePendingPaymentsCount(): number {
  // GET /payments (all users) is guarded by
  // requireCapability('finance.reports.view') — the same grant usePayments
  // uses to pick the all-users endpoint. Keeping the policy at the query
  // boundary stops an operator without the grant from polling an endpoint
  // they can never read, every 30 seconds.
  const enabled = useCapability('finance.reports.view');

  const { data } = useQuery({
    queryKey: ['payments', 'pending-count'],
    queryFn: () => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) return null;
      return getPayments(token, { status: 'pending', limit: 1 });
    },
    enabled,
    refetchInterval: 30_000,
    staleTime: STALE_TIME.ALWAYS_FRESH,
  });

  return data?.pagination.total ?? 0;
}
