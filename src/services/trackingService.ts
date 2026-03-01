import { apiGet } from '@/lib/apiClient';

export interface TimelineEvent {
  status: string;
  statusLabel: string;
  timestamp: string;
}

export interface TrackingResult {
  trackingNumber: string;
  status?: string;
  statusLabel: string;
  origin?: string;
  destination?: string;
  estimatedDelivery: string | null;
  lastUpdate: string;
  lastLocation: string;
  timeline?: TimelineEvent[];
}

export async function trackShipment(trackingNumber: string): Promise<TrackingResult> {
  const response = await apiGet<{ data: TrackingResult }>(`/orders/track/${encodeURIComponent(trackingNumber)}`);
  return response.data;
}
