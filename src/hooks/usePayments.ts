import { useQuery } from '@tanstack/react-query';
import type { ApiPayment } from '@/types';
import { getPayments } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

interface PaymentsState {
  payments: ApiPayment[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

export function usePayments(params: { page?: number; limit?: number; userId?: string; status?: string } = {}): PaymentsState {
  const { data, isLoading, error } = useQuery({
    queryKey: ['payments', params],
    queryFn: async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getPayments(token, params);
    },
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
