import { useQuery } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { ApiPayment } from '@/types';
import { getPayments } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useAuthToken } from './useAuthToken';

export function useMyPayments(enabled = true) {
  const { isSignedIn } = useClerkAuth();
  const getToken = useAuthToken();

  return useQuery<ApiPayment[]>({
    queryKey: ['payments', 'me'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const result = await getPayments(token, { isCustomer: true, limit: 100 });
      return result.data ?? [];
    },
    enabled: enabled && !!isSignedIn,
    staleTime: STALE_TIME.REAL_TIME,
  });
}
