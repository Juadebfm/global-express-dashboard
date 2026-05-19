import { apiGetData } from '@/lib/apiClient';

export interface TimelineEvent {
  status: string;
  statusLabel: string;
  timestamp: string;
}

export interface TrackingResult {
  orderId?: string;
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

interface RawTrackingResult extends TrackingResult {
  id?: string;
  currentStatus?: string;
  currentStatusLabel?: string;
}

export async function trackShipment(trackingNumber: string): Promise<TrackingResult> {
  const raw = await apiGetData<RawTrackingResult>(
    `/orders/track/${encodeURIComponent(trackingNumber)}`
  );

  return {
    ...raw,
    orderId: raw.orderId ?? raw.id,
    status: raw.status ?? raw.currentStatus,
    statusLabel:
      raw.statusLabel ??
      raw.currentStatusLabel ??
      raw.status ??
      raw.currentStatus ??
      'Unknown',
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
  };
}
