import type { GalleryClaim } from '@/types';
import { useGalleryClaims } from './useGallery';

interface UseClaimForTicketInput {
  ticketId: string;
  trackingNumber?: string;
}

export function useClaimForTicket({ ticketId, trackingNumber }: UseClaimForTicketInput): {
  claim: GalleryClaim | null;
  isLoading: boolean;
  error: Error | null;
} {
  // If we have a tracking number, use a targeted query. Otherwise fetch all and filter.
  const { data, isLoading, error } = useGalleryClaims(
    trackingNumber ? { itemTrackingNumber: trackingNumber } : {},
  );

  // Prefer exact supportTicketId match; fall back to first result from the targeted query.
  const claim =
    data?.find((c) => c.supportTicketId === ticketId) ??
    (trackingNumber ? (data?.[0] ?? null) : null);

  return { claim, isLoading, error };
}
