import type { StatusCategory, StatusConfig } from '@/types/status.types';

const CATEGORY_MAP: Record<string, StatusCategory> = {
  // Pending — order placed but not yet physically at warehouse
  PREORDER_SUBMITTED: 'pending',
  AWAITING_WAREHOUSE_RECEIPT: 'pending',

  // Active — in the logistics pipeline
  WAREHOUSE_RECEIVED: 'active',
  WAREHOUSE_VERIFIED_PRICED: 'active',
  DISPATCHED_TO_ORIGIN_AIRPORT: 'active',
  AT_ORIGIN_AIRPORT: 'active',
  BOARDED_ON_FLIGHT: 'active',
  FLIGHT_DEPARTED: 'active',
  FLIGHT_LANDED_LAGOS: 'active',
  DISPATCHED_TO_ORIGIN_PORT: 'active',
  AT_ORIGIN_PORT: 'active',
  LOADED_ON_VESSEL: 'active',
  VESSEL_DEPARTED: 'active',
  VESSEL_ARRIVED_LAGOS_PORT: 'active',
  CUSTOMS_CLEARED_LAGOS: 'active',
  IN_TRANSIT_TO_LAGOS_OFFICE: 'active',
  READY_FOR_PICKUP: 'active',

  // Completed
  PICKED_UP_COMPLETED: 'completed',

  // Exception / override
  ON_HOLD: 'exception',
  CANCELLED: 'exception',
  RESTRICTED_ITEM_REJECTED: 'exception',
  RESTRICTED_ITEM_OVERRIDE_APPROVED: 'exception',
};

const STYLE_MAP: Record<StatusCategory, StatusConfig> = {
  pending: {
    category: 'pending',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
  active: {
    category: 'active',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-500',
  },
  completed: {
    category: 'completed',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  exception: {
    category: 'exception',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    dotClass: 'bg-rose-500',
  },
};

/** Map a raw statusV2 string to a UI category. Defaults to 'pending' for unknown values. */
export function getStatusCategory(statusV2: string): StatusCategory {
  return CATEGORY_MAP[statusV2] ?? 'pending';
}

/** Get Tailwind styling config for a given statusV2 value. */
export function getStatusStyle(statusV2: string): StatusConfig {
  const category = getStatusCategory(statusV2);
  return STYLE_MAP[category];
}

/** Filter tab options for shipment list views. */
export const STATUS_FILTER_OPTIONS: Array<{
  id: StatusCategory | 'all';
  label: string;
}> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'exception', label: 'Exception' },
];
