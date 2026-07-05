import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/queryDefaults';
import { getSupportTickets } from '@/services';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

export function useOpenSupportTicketCount(): number {
  const { user } = useAuth();
  const isOperator = !!user && user.role !== undefined;

  const { data } = useQuery({
    queryKey: ['support', 'tickets', 'open-count'],
    queryFn: () => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) return [];
      return getSupportTickets(token, { status: 'open' });
    },
    enabled: isOperator,
    refetchInterval: 30_000,
    staleTime: STALE_TIME.ALWAYS_FRESH,
  });

  return data?.length ?? 0;
}
