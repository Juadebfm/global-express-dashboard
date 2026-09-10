import type { BatchListItem, BatchRosterOrder } from '@/types';

export type LastMileNextAction =
  | { kind: 'ready'; label: string }
  | { kind: 'pickup'; label: string }
  | { kind: 'status'; label: string; statusV2: string }
  | null;

/** A shared batch only hands off after the final common movement stage. */
export function isLastMileBatch(batch: Pick<BatchListItem, 'status' | 'movementStatus'>): boolean {
  return batch.status === 'closed' && batch.movementStatus === 'IN_TRANSIT_TO_LAGOS_OFFICE';
}

/**
 * The UI deliberately offers one next step only. The API remains authoritative
 * and rejects a step if a shipment's server-side conditions have changed.
 */
export function getLastMileNextAction(
  order: BatchRosterOrder,
  requiresExtraTruckMovement = false,
): LastMileNextAction {
  const status = order.status ?? '';
  if (order.shipmentType !== 'd2d') {
    if (status === 'IN_TRANSIT_TO_LAGOS_OFFICE') return { kind: 'ready', label: 'Mark ready for pickup' };
    if (status === 'READY_FOR_PICKUP') return { kind: 'pickup', label: 'Complete pickup' };
    return null;
  }

  switch (status) {
    case 'IN_TRANSIT_TO_LAGOS_OFFICE':
      return requiresExtraTruckMovement
        ? { kind: 'status', label: 'Start extra truck movement', statusV2: 'IN_EXTRA_TRUCK_MOVEMENT_LAGOS' }
        : { kind: 'status', label: 'Assign local courier', statusV2: 'LOCAL_COURIER_ASSIGNED' };
    case 'IN_EXTRA_TRUCK_MOVEMENT_LAGOS':
      return { kind: 'status', label: 'Assign local courier', statusV2: 'LOCAL_COURIER_ASSIGNED' };
    case 'LOCAL_COURIER_ASSIGNED':
      return { kind: 'status', label: 'Mark in transit to destination', statusV2: 'IN_TRANSIT_TO_DESTINATION_CITY' };
    case 'IN_TRANSIT_TO_DESTINATION_CITY':
      return { kind: 'status', label: 'Mark out for delivery', statusV2: 'OUT_FOR_DELIVERY_DESTINATION_CITY' };
    case 'OUT_FOR_DELIVERY_DESTINATION_CITY':
      return { kind: 'status', label: 'Mark delivered', statusV2: 'DELIVERED_TO_RECIPIENT' };
    default:
      return null;
  }
}

export function isLastMileTerminal(order: BatchRosterOrder): boolean {
  return ['PICKED_UP_COMPLETED', 'DELIVERED_TO_RECIPIENT'].includes(order.status ?? '');
}
