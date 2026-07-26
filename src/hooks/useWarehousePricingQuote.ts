import { useQuery } from '@tanstack/react-query';
import { getWarehousePricingQuote } from '@/services';
import { useAuthToken } from './useAuthToken';
import type { WarehousePricingQuotePayload, WarehousePricingQuoteResult } from '@/types';

export function useWarehousePricingQuote(payload: WarehousePricingQuotePayload | null): {
  data: WarehousePricingQuoteResult | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const query = useQuery<WarehousePricingQuoteResult>({
    queryKey: ['orders', 'warehouse-pricing-quote', payload],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getWarehousePricingQuote(payload!, token);
    },
    enabled: Boolean(payload),
    retry: false,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}
