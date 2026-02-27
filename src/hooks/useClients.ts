import { useQuery } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { ApiClient } from '@/types';
import { getClients } from '@/services';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

interface ClientsState {
  clients: ApiClient[];
  isLoading: boolean;
  error: string | null;
}

export function useClients(params: { isActive?: boolean } = {}): ClientsState {
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();

  const isCustomer = isClerkSignedIn && !user;
  const role = user?.role;
  const enabled =
    !!role && (role === 'staff' || role === 'admin' || role === 'superadmin');

  const { data, isLoading, error } = useQuery({
    queryKey: ['clients', params],
    queryFn: async () => {
      const token = isCustomer ? await getToken() : localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      const result = await getClients(token, params);
      return result.data;
    },
    enabled,
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load clients' : null;

  return {
    clients: data ?? [],
    isLoading,
    error: message,
  };
}
