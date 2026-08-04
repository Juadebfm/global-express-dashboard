import { useQuery } from '@tanstack/react-query';
import { trackShipment } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';

/**
 * Query key for one tracked shipment. The WebSocket handler invalidates this
 * key when a batch notification names the same customer tracking number, so a
 * customer watching the page sees the new stage without reloading.
 */
export const trackingKey = (trackingNumber: string) =>
  ['tracking', trackingNumber] as const;

export function useTrackShipment(trackingNumber: string | null) {
  return useQuery({
    queryKey: trackingKey(trackingNumber ?? ''),
    queryFn: () => trackShipment(trackingNumber!),
    enabled: !!trackingNumber,
    staleTime: STALE_TIME.REAL_TIME,
    retry: false,
  });
}
