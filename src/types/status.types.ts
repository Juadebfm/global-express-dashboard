// All 22 V2 status values from the backend
export type StatusV2 =
  // Pre-order / awaiting
  | 'PREORDER_SUBMITTED'
  | 'AWAITING_WAREHOUSE_RECEIPT'
  // Warehouse
  | 'WAREHOUSE_RECEIVED'
  | 'WAREHOUSE_VERIFIED_PRICED'
  // Air pipeline
  | 'DISPATCHED_TO_ORIGIN_AIRPORT'
  | 'AT_ORIGIN_AIRPORT'
  | 'BOARDED_ON_FLIGHT'
  | 'FLIGHT_DEPARTED'
  | 'FLIGHT_LANDED_LAGOS'
  // Sea pipeline
  | 'DISPATCHED_TO_ORIGIN_PORT'
  | 'AT_ORIGIN_PORT'
  | 'LOADED_ON_VESSEL'
  | 'VESSEL_DEPARTED'
  | 'VESSEL_ARRIVED_LAGOS_PORT'
  // Shared final-mile
  | 'CUSTOMS_CLEARED_LAGOS'
  | 'IN_TRANSIT_TO_LAGOS_OFFICE'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP_COMPLETED'
  // Exception / override
  | 'ON_HOLD'
  | 'CANCELLED'
  | 'RESTRICTED_ITEM_REJECTED'
  | 'RESTRICTED_ITEM_OVERRIDE_APPROVED';

// UI grouping for filters, badges, and summary cards
export type StatusCategory = 'pending' | 'active' | 'completed' | 'exception';

// Tailwind styling config for a status badge
export interface StatusConfig {
  category: StatusCategory;
  bgClass: string;
  textClass: string;
  dotClass: string;
}
