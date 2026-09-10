// All 22 V2 status values from the backend
export type StatusV2 =
  // Booking / awaiting
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
  | 'IN_EXTRA_TRUCK_MOVEMENT_LAGOS'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP_COMPLETED'
  | 'LOCAL_COURIER_ASSIGNED'
  | 'IN_TRANSIT_TO_DESTINATION_CITY'
  | 'OUT_FOR_DELIVERY_DESTINATION_CITY'
  | 'DELIVERED_TO_RECIPIENT'
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
