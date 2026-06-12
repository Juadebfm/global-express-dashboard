import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/queryDefaults';
import { getShipmentsDashboard } from '@/services';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

export function useUndeliveredOrderCount(): number {
  const { user } = useAuth();
  const isOperator = !!user && user.role !== undefined;

  const { data: allData } = useQuery({
    queryKey: ['shipments', 'badge-count', 'all'],
    queryFn: async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return null;
      return getShipmentsDashboard(token, false, { page: 1, limit: 1 });
    },
    enabled: isOperator,
    refetchInterval: 30_000,
    staleTime: STALE_TIME.ALWAYS_FRESH,
  });

  const { data: completedData } = useQuery({
    queryKey: ['shipments', 'badge-count', 'completed'],
    queryFn: async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return null;
      return getShipmentsDashboard(token, false, { page: 1, limit: 1, statusV2: 'PICKED_UP_COMPLETED' });
    },
    enabled: isOperator,
    refetchInterval: 30_000,
    staleTime: STALE_TIME.ALWAYS_FRESH,
  });

  const total = allData?.pagination.total ?? 0;
  const completed = completedData?.pagination.total ?? 0;
  return Math.max(0, total - completed);
}
