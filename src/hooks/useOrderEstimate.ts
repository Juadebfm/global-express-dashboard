import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { estimateOrderCost } from '@/services';
import type { OrderEstimateResult } from '@/types';
import { useAuthToken } from '@/hooks';
import { STALE_TIME } from '@/lib/queryDefaults';

function parseWeightValue(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  return Number.isFinite(val) && val > 0 ? val : null;
}

export function useOrderEstimate(shipmentType: 'air' | 'sea', rawWeight: string) {
  const getToken = useAuthToken();
  const [debouncedWeight, setDebouncedWeight] = useState(rawWeight);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedWeight(rawWeight), 400);
    return () => clearTimeout(id);
  }, [rawWeight]);

  const parsedValue = parseWeightValue(debouncedWeight);
  const enabled = parsedValue !== null;

  return useQuery<OrderEstimateResult>({
    queryKey: ['order-estimate', shipmentType, parsedValue],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return estimateOrderCost(
        shipmentType === 'air'
          ? { shipmentType: 'air', weightKg: parsedValue! }
          : { shipmentType: 'ocean', cbm: parsedValue! },
        token,
      );
    },
    enabled,
    staleTime: STALE_TIME.SLOW_MOVING,
  });
}
