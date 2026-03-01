import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import type { DashboardData, ApiDashboardResponse } from '@/types';
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
  const { i18n } = useTranslation();

  const isCustomer = isClerkSignedIn && !user;
  const role = user?.role ?? 'user';
  const enabled = isClerkSignedIn || !!user;

  // Cache raw API data only — no translations baked in
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'overview', year, role],
    queryFn: async (): Promise<ApiDashboardResponse['data']> => {
      const token = isCustomer
        ? await getToken()
        : localStorage.getItem(TOKEN_KEY);

      if (!token) throw new Error('Not authenticated');

      return fetchDashboardRaw(token, year);
    },
    enabled,
  });

  // Re-map when language or raw data changes so translations stay current
  const data = useMemo(
    () => (rawData ? mapToDashboardData(rawData, role) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawData, role, i18n.language],
  );

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load dashboard' : null;

  return {
    data,
    isLoading,
    error: message,
  };
}
