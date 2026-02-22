import { apiGet } from '@/lib/apiClient';

export interface TrackingResult {
  trackingNumber: string;
  status?: 'in_transit' | 'delivered' | 'pending';
  statusLabel: string;
  origin?: string;
  destination?: string;
  estimatedDelivery: string | null;
  lastUpdate: string;
  lastLocation: string;
}

export function trackShipment(trackingNumber: string): Promise<TrackingResult> {
  return apiGet<TrackingResult>(`/orders/track/${encodeURIComponent(trackingNumber)}`);
}
