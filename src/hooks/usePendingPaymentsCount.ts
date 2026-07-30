import { useQuery } from '@tanstack/react-query';
import type { User } from '@/types';
import { STALE_TIME } from '@/lib/queryDefaults';
import { getPayments } from '@/services';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

// The all-payments endpoint is superadmin-only. Keeping this policy at the
// query boundary prevents regular staff from repeatedly polling an endpoint
// they can never read.
export function canFetchPendingPaymentsCount(role: User['role'] | undefined): boolean {
  return role === 'superadmin';
}

export function usePendingPaymentsCount(): number {
  const { user } = useAuth();
  const enabled = canFetchPendingPaymentsCount(user?.role);

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
