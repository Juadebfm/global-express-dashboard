import { useQuery } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { ApiPayment } from '@/types';
import { getPayments } from '@/services';
import { useAuth } from './useAuth';
import { useAuthToken } from './useAuthToken';

interface PaymentsState {
  payments: ApiPayment[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

export function usePayments(params: { page?: number; limit?: number; userId?: string; status?: string } = {}): PaymentsState {
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn } = useClerkAuth();
  const getToken = useAuthToken();

  const enabled = isClerkSignedIn || !!user;
  // Clerk users are customers; internal users with role 'user' are also customers
  const isCustomer = isClerkSignedIn || user?.role === 'user';

  const { data, isLoading, error } = useQuery({
    queryKey: ['payments', params, isCustomer],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getPayments(token, { ...params, isCustomer: !!isCustomer });
    },
    enabled,
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load payments' : null;

  return {
    payments: data?.data ?? [],
    total: data?.pagination.total ?? 0,
    isLoading,
    error: message,
  };
}
