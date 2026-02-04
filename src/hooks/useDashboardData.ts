import { useQuery } from '@tanstack/react-query';
import type { DashboardData } from '@/types';
import { getDashboardData } from '@/services';

interface DashboardDataState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
}

export function useDashboardData(): DashboardDataState {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: getDashboardData,
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load dashboard' : null;

  return {
    data: data ?? null,
    isLoading,
    error: message,
  };
}
