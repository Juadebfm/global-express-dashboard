import { useQuery } from '@tanstack/react-query';
import { getMeasurements } from '@/services/measurementsService';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useAuthToken } from './useAuthToken';

export function useMeasurements(orderId: string | undefined) {
  const getToken = useAuthToken();

  return useQuery({
    queryKey: ['measurements', orderId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getMeasurements(token, orderId!);
    },
    enabled: Boolean(orderId),
    staleTime: STALE_TIME.REAL_TIME,
  });
}
