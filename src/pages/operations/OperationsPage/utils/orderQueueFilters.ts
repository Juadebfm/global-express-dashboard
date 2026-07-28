import type { OrderListItem } from '@/types';
import type { QueueKind } from '../components/QueueShell';

/**
 * Single source of truth for "which orders belong to which queue / tab."
 * Reconciles what used to be three slightly-divergent definitions (Orders'
 * dashboard queues, Operations' tab filters, and the standalone
 * `needsAction()` helper) into one vocabulary so the browse pane and the
 * task-card counts never disagree about the same order.
 */

function dispatchBatchId(order: OrderListItem): string | null {
  const raw = order.raw as Record<string, unknown>;
  return typeof raw.dispatchBatchId === 'string' ? raw.dispatchBatchId : null;
}

export function getQueueOrders(orders: OrderListItem[], kind: QueueKind): OrderListItem[] {
  switch (kind) {
    case 'preorder':
      return orders.filter((o) => o.statusV2 === 'PREORDER_SUBMITTED');
    case 'arrival':
      return orders.filter((o) => o.statusV2 === 'AWAITING_WAREHOUSE_RECEIPT');
    case 'verify':
      return orders.filter(
        (o) =>
          o.statusV2 === 'WAREHOUSE_RECEIVED' ||
          o.statusV2 === 'CLAIM_APPROVED_PENDING_BULK_PROCESSING',
      );
    case 'holds':
      return orders.filter((o) => o.statusV2 === 'ON_HOLD' && !dispatchBatchId(o));
    case 'batch':
      return orders.filter(
        (o) =>
          o.statusV2 === 'WAREHOUSE_VERIFIED_PRICED' &&
          o.paymentCollectionStatus?.toUpperCase() === 'PAID_IN_FULL' &&
          !dispatchBatchId(o),
      );
    case 'payment':
      return orders.filter(
        (o) =>
          o.statusV2 === 'WAREHOUSE_VERIFIED_PRICED' &&
          o.paymentCollectionStatus?.toUpperCase() !== 'PAID_IN_FULL',
      );
    case 'escalated':
      return orders.filter((o) => o.statusV2 === 'ON_HOLD' && !!o.escalatedAt);
  }
}

export function getAwaitingPaymentOrders(orders: OrderListItem[]): OrderListItem[] {
  return orders.filter(
    (o) =>
      o.statusV2 === 'WAREHOUSE_VERIFIED_PRICED' &&
      o.paymentCollectionStatus?.toUpperCase() === 'UNPAID',
  );
}

/** Which guided queue a given order would enter if worked right now. */
export function getQueueKindForOrder(o: OrderListItem): QueueKind {
  if (o.statusV2 === 'PREORDER_SUBMITTED') return 'preorder';
  if (o.statusV2 === 'AWAITING_WAREHOUSE_RECEIPT') return 'arrival';
  if (o.statusV2 === 'ON_HOLD') return o.escalatedAt ? 'escalated' : 'holds';
  if (o.statusV2 === 'WAREHOUSE_RECEIVED' || o.statusV2 === 'CLAIM_APPROVED_PENDING_BULK_PROCESSING') {
    return 'verify';
  }
  if (o.statusV2 === 'WAREHOUSE_VERIFIED_PRICED') {
    const unpaid = o.paymentCollectionStatus?.toUpperCase() !== 'PAID_IN_FULL';
    return unpaid ? 'payment' : 'batch';
  }
  return 'verify';
}

/**
 * Reconciled "needs action" — union of what the Orders dashboard's priority
 * list used to consider (verify-eligible, payment-in-progress, flagged) and
 * what Operations' "Needs Action" tab used to consider (the same, plus
 * on-hold and priced-but-unbatched orders). One definition, used by both the
 * priority list and the browse-pane tab so they never disagree.
 */
export function needsAction(order: OrderListItem): boolean {
  const s = order.statusV2.toUpperCase();
  const pcs = order.paymentCollectionStatus?.toUpperCase() ?? '';
  if (s === 'WAREHOUSE_RECEIVED' || s === 'CLAIM_APPROVED_PENDING_BULK_PROCESSING') return true;
  if (s === 'ON_HOLD') return true;
  if (s === 'WAREHOUSE_VERIFIED_PRICED' && !dispatchBatchId(order)) return true;
  if (pcs === 'PAYMENT_IN_PROGRESS') return true;
  if (order.flaggedForAdminReview) return true;
  return false;
}

export const DISPATCHED_STATUSES = new Set([
  // Air transit pipeline
  'DISPATCHED_TO_ORIGIN_AIRPORT',
  'AT_ORIGIN_AIRPORT',
  'BOARDED_ON_FLIGHT',
  'FLIGHT_DEPARTED',
  'FLIGHT_LANDED_LAGOS',
  // Sea transit pipeline
  'DISPATCHED_TO_ORIGIN_PORT',
  'AT_ORIGIN_PORT',
  'LOADED_ON_VESSEL',
  'VESSEL_DEPARTED',
  'VESSEL_ARRIVED_LAGOS_PORT',
  // Shared final-mile
  'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE',
  'READY_FOR_PICKUP',
  'LOCAL_COURIER_ASSIGNED',
  'IN_TRANSIT_TO_DESTINATION_CITY',
  'OUT_FOR_DELIVERY_DESTINATION_CITY',
  'DELIVERED_TO_RECIPIENT',
  'PICKED_UP_COMPLETED',
]);

export function isInBatch(order: OrderListItem): boolean {
  return !!dispatchBatchId(order) && !DISPATCHED_STATUSES.has(order.statusV2);
}

export function isDispatched(order: OrderListItem): boolean {
  return DISPATCHED_STATUSES.has(order.statusV2);
}

/**
 * Row-action metadata for the "Needs Action" browse tab. Replaces the old
 * `actionLink()`, which built a `<Link to="/orders?select=...">` — rows now
 * select in place (no page navigation), so this just describes the label and
 * which detail tab to land on, leaving the click handler to the caller.
 */
export interface RowActionMeta {
  label: string;
  tab?: 'warehouse';
}

export function getRowActionMeta(order: OrderListItem): RowActionMeta | null {
  if (order.statusV2 === 'WAREHOUSE_RECEIVED' || order.statusV2 === 'CLAIM_APPROVED_PENDING_BULK_PROCESSING') {
    return { label: 'Add measurements →', tab: 'warehouse' };
  }
  if (order.statusV2 === 'WAREHOUSE_VERIFIED_PRICED') return { label: 'Add to batch →' };
  if (order.statusV2 === 'ON_HOLD') return { label: 'Review hold →' };
  if (order.flaggedForAdminReview) return { label: 'Review flag →' };
  return null;
}
