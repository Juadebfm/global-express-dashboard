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
  const normalizedTrackingNumber = trackingNumber.trim().toUpperCase();
  const raw = await apiGetData<RawTrackingResult>(
    `/orders/track/${encodeURIComponent(normalizedTrackingNumber)}`
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

/** Matches the staff-only master batch format, e.g. `AIR-20260727-0001`. */
const MASTER_TRACKING_PATTERN = /^(AIR|SEA)-/i;

/**
 * The public endpoint deliberately 404s on a master batch reference. Detecting
 * it before the request lets the customer product explain the problem instead
 * of showing a bare "not found".
 */
export function isMasterTrackingNumber(value: string): boolean {
  return MASTER_TRACKING_PATTERN.test(value.trim());
}
