import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/queryDefaults';
import { getPayments } from '@/services';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

export function usePendingPaymentsCount(): number {
  const { user } = useAuth();
  const isOperator = !!user && user.role !== undefined;

  const { data } = useQuery({
    queryKey: ['payments', 'pending-count'],
    queryFn: () => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) return null;
      return getPayments(token, { status: 'pending', limit: 1 });
    },
    enabled: isOperator,
    refetchInterval: 30_000,
    staleTime: STALE_TIME.ALWAYS_FRESH,
  });

  return data?.pagination.total ?? 0;
}
