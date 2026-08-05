import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { estimateOrderCost } from '@/services';
import type { CustomerDeclaredParcelInput, OrderEstimateResult } from '@/types';
import { useAuthToken } from '@/hooks';
import { STALE_TIME } from '@/lib/queryDefaults';

/**
 * Estimates from parcel measurements.
 *
 * The server derives volume, volumetric weight and chargeable weight from the
 * four numbers — none of that arithmetic belongs here. Air and ocean send the
 * identical shape; only the mode differs.
 *
 * Door-to-door is priced individually and is not accepted by this endpoint, so
 * callers must not request an estimate for it.
 */
export function useOrderEstimate(
  shipmentType: 'air' | 'sea',
  parcels: CustomerDeclaredParcelInput[],
) {
  const getToken = useAuthToken();
  // Keyed on the values rather than the array identity, which changes on every
  // keystroke and would restart the debounce forever.
  const signature = JSON.stringify(parcels);
  const [debouncedSignature, setDebouncedSignature] = useState(signature);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSignature(signature), 400);
    return () => clearTimeout(id);
  }, [signature]);

  const debouncedParcels = JSON.parse(debouncedSignature) as CustomerDeclaredParcelInput[];
  const enabled = debouncedParcels.length > 0;

  return useQuery<OrderEstimateResult>({
    queryKey: ['order-estimate', shipmentType, debouncedSignature],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return estimateOrderCost(
        {
          shipmentType: shipmentType === 'air' ? 'air' : 'ocean',
          parcels: debouncedParcels,
        },
        token,
      );
    },
    enabled,
    staleTime: STALE_TIME.SLOW_MOVING,
  });
}
