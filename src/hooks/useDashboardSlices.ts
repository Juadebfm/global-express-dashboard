import { useQuery } from '@tanstack/react-query';
import {
  fetchDashboardStats,
  fetchDashboardTrends,
  fetchActiveDeliveries,
} from '@/services/dashboardService';
import type { ApiDashboardStats, ApiTrend, ApiActiveDelivery } from '@/types';
import { useAuthToken } from './useAuthToken';

// Per-spec staleness: dashboard data refreshes every 30 s on the server side;
// matching it here avoids redundant refetches while still feeling live.
const STALE_TIME = 30_000;

export function useDashboardStats(): {
  data: ApiDashboardStats | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const q = useQuery<ApiDashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return fetchDashboardStats(token);
    },
    staleTime: STALE_TIME,
  });
  return { data: q.data, isLoading: q.isLoading, error: q.error };
}

export function useDashboardTrends(months = 3): {
  data: ApiTrend[] | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const q = useQuery<ApiTrend[]>({
    queryKey: ['dashboard', 'trends', months],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return fetchDashboardTrends(token, months);
    },
    staleTime: STALE_TIME,
  });
  return { data: q.data, isLoading: q.isLoading, error: q.error };
}

export function useActiveDeliveries(): {
  data: ApiActiveDelivery[] | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const q = useQuery<ApiActiveDelivery[]>({
    queryKey: ['dashboard', 'active-deliveries'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return fetchActiveDeliveries(token);
    },
    staleTime: STALE_TIME,
  });
  return { data: q.data, isLoading: q.isLoading, error: q.error };
}
