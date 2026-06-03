import { useQuery } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { ApiPayment } from '@/types';
import { getPayments } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { can } from '@/lib/permissions';
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
  // Superadmin sees every user's payments (admin BE endpoint);
  // anyone else is scoped to their own via /payments/me.
  const canViewAllPayments = can(user?.role, 'app.superadmin');
  const isCustomerScope = !canViewAllPayments;
  const normalizedParams = {
    page: params.page ?? 1,
    limit: params.limit ?? 25,
    userId: params.userId,
    status: params.status,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['payments', normalizedParams, isCustomerScope],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getPayments(token, { ...normalizedParams, isCustomer: isCustomerScope });
    },
    enabled,
    staleTime: STALE_TIME.REAL_TIME,
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
