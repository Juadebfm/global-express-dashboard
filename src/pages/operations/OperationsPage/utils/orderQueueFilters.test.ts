import { describe, expect, it } from 'vitest';
import type { OrderListItem } from '@/types';
import {
  DISPATCHED_STATUSES,
  getAwaitingPaymentOrders,
  getQueueKindForOrder,
  getQueueOrders,
  getRowActionMeta,
  isDispatched,
  isInBatch,
  needsAction,
} from './orderQueueFilters';

function makeOrder(overrides: Partial<OrderListItem> & { raw?: Record<string, unknown> } = {}): OrderListItem {
  const { raw, ...rest } = overrides;
  return {
    id: 'order-1',
    trackingNumber: 'GEX-0001',
    senderName: 'Test Customer',
    status: 'pending',
    statusV2: 'PREORDER_SUBMITTED',
    statusLabel: 'Booking Submitted',
    origin: null,
    destination: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    amount: null,
    transportMode: 'air',
    paymentCollectionStatus: 'UNPAID',
    paymentDetailsSentAt: null,
    flaggedForAdminReview: false,
    escalatedAt: null,
    escalationNote: null,
    raw: raw ?? {},
    ...rest,
  };
}

describe('getQueueOrders', () => {
  it('filters preorder queue by status', () => {
    const orders = [
      makeOrder({ id: '1', statusV2: 'PREORDER_SUBMITTED' }),
      makeOrder({ id: '2', statusV2: 'AWAITING_WAREHOUSE_RECEIPT' }),
    ];
    expect(getQueueOrders(orders, 'preorder').map((o) => o.id)).toEqual(['1']);
  });

  it('excludes on-hold orders already in a batch from the holds queue', () => {
    const orders = [
      makeOrder({ id: '1', statusV2: 'ON_HOLD' }),
      makeOrder({ id: '2', statusV2: 'ON_HOLD', raw: { dispatchBatchId: 'batch-1' } }),
    ];
    expect(getQueueOrders(orders, 'holds').map((o) => o.id)).toEqual(['1']);
  });

  it('splits verified-priced orders into batch vs payment by payment status', () => {
    const orders = [
      makeOrder({ id: 'paid', statusV2: 'WAREHOUSE_VERIFIED_PRICED', paymentCollectionStatus: 'PAID_IN_FULL' }),
      makeOrder({ id: 'unpaid', statusV2: 'WAREHOUSE_VERIFIED_PRICED', paymentCollectionStatus: 'UNPAID' }),
    ];
    expect(getQueueOrders(orders, 'batch').map((o) => o.id)).toEqual(['paid']);
    expect(getQueueOrders(orders, 'payment').map((o) => o.id)).toEqual(['unpaid']);
  });

  it('only includes escalated on-hold orders in the escalated queue', () => {
    const orders = [
      makeOrder({ id: 'plain-hold', statusV2: 'ON_HOLD' }),
      makeOrder({ id: 'escalated', statusV2: 'ON_HOLD', escalatedAt: '2026-01-02T00:00:00.000Z' }),
    ];
    expect(getQueueOrders(orders, 'escalated').map((o) => o.id)).toEqual(['escalated']);
  });
});

describe('getAwaitingPaymentOrders', () => {
  it('only includes priced orders with no receipt submitted yet', () => {
    const orders = [
      makeOrder({ id: 'unpaid', statusV2: 'WAREHOUSE_VERIFIED_PRICED', paymentCollectionStatus: 'UNPAID' }),
      makeOrder({ id: 'in-progress', statusV2: 'WAREHOUSE_VERIFIED_PRICED', paymentCollectionStatus: 'PAYMENT_IN_PROGRESS' }),
    ];
    expect(getAwaitingPaymentOrders(orders).map((o) => o.id)).toEqual(['unpaid']);
  });
});

describe('getQueueKindForOrder', () => {
  it('routes on-hold orders to escalated when escalatedAt is set', () => {
    expect(getQueueKindForOrder(makeOrder({ statusV2: 'ON_HOLD', escalatedAt: '2026-01-01T00:00:00.000Z' }))).toBe('escalated');
    expect(getQueueKindForOrder(makeOrder({ statusV2: 'ON_HOLD' }))).toBe('holds');
  });

  it('routes verified-priced orders to payment or batch by payment status', () => {
    expect(getQueueKindForOrder(makeOrder({ statusV2: 'WAREHOUSE_VERIFIED_PRICED', paymentCollectionStatus: 'UNPAID' }))).toBe('payment');
    expect(getQueueKindForOrder(makeOrder({ statusV2: 'WAREHOUSE_VERIFIED_PRICED', paymentCollectionStatus: 'PAID_IN_FULL' }))).toBe('batch');
  });
});

describe('needsAction (reconciled)', () => {
  it('flags on-hold orders (previously only covered by the Operations tab, not the dashboard helper)', () => {
    expect(needsAction(makeOrder({ statusV2: 'ON_HOLD' }))).toBe(true);
  });

  it('flags verified-priced orders with no batch yet (previously only covered by the Operations tab)', () => {
    expect(needsAction(makeOrder({ statusV2: 'WAREHOUSE_VERIFIED_PRICED' }))).toBe(true);
    expect(
      needsAction(makeOrder({ statusV2: 'WAREHOUSE_VERIFIED_PRICED', raw: { dispatchBatchId: 'b1' } })),
    ).toBe(false);
  });

  it('flags payment-in-progress orders (previously only covered by the dashboard helper)', () => {
    expect(
      needsAction(makeOrder({ statusV2: 'WAREHOUSE_VERIFIED_PRICED', raw: { dispatchBatchId: 'b1' }, paymentCollectionStatus: 'PAYMENT_IN_PROGRESS' })),
    ).toBe(true);
  });

  it('flags claim-approved-pending-bulk-processing and admin-flagged orders', () => {
    expect(needsAction(makeOrder({ statusV2: 'CLAIM_APPROVED_PENDING_BULK_PROCESSING' }))).toBe(true);
    expect(needsAction(makeOrder({ statusV2: 'PREORDER_SUBMITTED', flaggedForAdminReview: true }))).toBe(true);
  });

  it('does not flag a plain in-progress preorder', () => {
    expect(needsAction(makeOrder({ statusV2: 'PREORDER_SUBMITTED' }))).toBe(false);
  });
});

describe('isInBatch / isDispatched', () => {
  it('treats batched-but-not-yet-dispatched orders as in-batch', () => {
    const order = makeOrder({ statusV2: 'WAREHOUSE_VERIFIED_PRICED', raw: { dispatchBatchId: 'b1' } });
    expect(isInBatch(order)).toBe(true);
    expect(isDispatched(order)).toBe(false);
  });

  it('treats dispatched-pipeline statuses as dispatched, not in-batch', () => {
    const order = makeOrder({ statusV2: 'FLIGHT_DEPARTED', raw: { dispatchBatchId: 'b1' } });
    expect(isInBatch(order)).toBe(false);
    expect(isDispatched(order)).toBe(true);
  });

  it('DISPATCHED_STATUSES covers the full transit pipeline', () => {
    expect(DISPATCHED_STATUSES.has('FLIGHT_DEPARTED')).toBe(true);
    expect(DISPATCHED_STATUSES.has('VESSEL_DEPARTED')).toBe(true);
    expect(DISPATCHED_STATUSES.has('DELIVERED_TO_RECIPIENT')).toBe(true);
    expect(DISPATCHED_STATUSES.has('PREORDER_SUBMITTED')).toBe(false);
  });
});

describe('getRowActionMeta', () => {
  it('returns the warehouse tab hint for received orders', () => {
    expect(getRowActionMeta(makeOrder({ statusV2: 'WAREHOUSE_RECEIVED' }))).toEqual({
      label: 'Add measurements →',
      tab: 'warehouse',
    });
  });

  it('returns null when there is no actionable state', () => {
    expect(getRowActionMeta(makeOrder({ statusV2: 'DELIVERED_TO_RECIPIENT' }))).toBeNull();
  });
});
