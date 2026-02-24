import { useQuery } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { DashboardData } from '@/types';
import { fetchDashboardRaw, mapToDashboardData } from '@/services';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

interface DashboardDataState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
}

export function useDashboardData(year = new Date().getFullYear()): DashboardDataState {
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();

  const isCustomer = isClerkSignedIn && !user;
  const role = user?.role ?? 'user';
  const enabled = isClerkSignedIn || !!user;

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'overview', year, role],
    queryFn: async (): Promise<DashboardData> => {
      const token = isCustomer
        ? await getToken()
        : localStorage.getItem(TOKEN_KEY);

      if (!token) throw new Error('Not authenticated');

      const raw = await fetchDashboardRaw(token, year);
      return mapToDashboardData(raw, role);
    },
    enabled,
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load dashboard' : null;

  return {
    data: data ?? null,
    isLoading,
    error: message,
  };
}
