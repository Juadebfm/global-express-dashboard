import { apiGetData } from '@/lib/apiClient';

export interface TimelineEvent {
  status: string;
  statusLabel: string;
  timestamp: string;
}

/**
 * Whether the tracking number identified a single order or one customer's
 * goods inside a dispatch batch. A customer batch reference looks like
 * `YYYYMMDD-XXXX` (for example `20260727-P8SM`).
 *
 * Internal master batch references (`AIR-…` / `SEA-…`) are staff-only. The
 * public endpoint returns 404 for them on purpose, so they must never appear
 * in a customer page, notification, or URL.
 */
export type TrackingScope = 'order' | 'customer_batch';

/** One line of goods. Batch-scoped goods carry no individual tracking number. */
export interface TrackedGoods {
  description: string | null;
  packageCount: number;
  weightKg: string | null;
  status: string | null;
  statusLabel: string | null;
}

export interface TrackingCargoMetrics {
  packageCount: number;
  totalWeightKg: string;
  totalCbm: string;
}

export interface TrackingResult {
  orderId?: string;
  trackingNumber: string;
  trackingScope: TrackingScope;
  status?: string;
  statusLabel: string;
  origin?: string;
  destination?: string;
  estimatedDelivery: string | null;
  lastUpdate: string;
  lastLocation: string;
  timeline?: TimelineEvent[];
  goods?: TrackedGoods[];
  cargoMetrics?: TrackingCargoMetrics;
  paymentStatus?: 'pending' | 'completed';
  vendorCount?: number;
}

interface RawTrackingResult extends Omit<TrackingResult, 'trackingScope'> {
  id?: string;
  currentStatus?: string;
  currentStatusLabel?: string;
  trackingScope?: TrackingScope;
}

export async function trackShipment(trackingNumber: string): Promise<TrackingResult> {
  const raw = await apiGetData<RawTrackingResult>(
    `/orders/track/${encodeURIComponent(trackingNumber)}`
  );

  return {
    ...raw,
    orderId: raw.orderId ?? raw.id,
    // Older responses predate the scope field; a single order is the safe read
    // because it never renders batch-only sections.
    trackingScope: raw.trackingScope ?? 'order',
    status: raw.status ?? raw.currentStatus,
    statusLabel:
      raw.statusLabel ??
      raw.currentStatusLabel ??
      raw.status ??
      raw.currentStatus ??
      'Unknown',
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    goods: Array.isArray(raw.goods) ? raw.goods : undefined,
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
