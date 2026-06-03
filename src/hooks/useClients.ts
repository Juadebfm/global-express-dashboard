import { useQuery } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { ApiClient, ApiClientsResponse } from '@/types';
import { getClients } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { can } from '@/lib/permissions';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

const DEFAULT_CLIENTS_PAGE_SIZE = 20;

interface UseClientsParams {
  isActive?: boolean;
  page?: number;
  limit?: number;
}

interface ClientsState {
  clients: ApiClient[];
  pagination: ApiClientsResponse['data']['pagination'];
  isLoading: boolean;
  error: string | null;
}

export function useClients(params: UseClientsParams = {}): ClientsState {
  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_CLIENTS_PAGE_SIZE;
  const effectiveParams = { page, limit, isActive: params.isActive };

  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();

  const isCustomer = isClerkSignedIn && !user;
  const enabled = can(user?.role, 'clients.view');

  const { data, isLoading, error } = useQuery({
    queryKey: ['clients', effectiveParams],
    queryFn: async () => {
      const token = isCustomer ? await getToken() : localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getClients(token, effectiveParams);
    },
    enabled,
    staleTime: STALE_TIME.REAL_TIME,
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load clients' : null;

  // Stable fallback during the first fetch so Pagination doesn't flicker.
  const pagination = data?.pagination ?? { total: 0, page, limit, totalPages: 1 };

  return {
    clients: data?.data ?? [],
    pagination,
    isLoading,
    error: message,
  };
}
