import { describe, expect, it } from 'vitest';
import type { BatchListItem, BatchRosterOrder } from '@/types';
import { getLastMileNextAction, isLastMileBatch, isLastMileTerminal } from './lastMile';

function batch(overrides: Partial<BatchListItem> = {}): BatchListItem {
  return {
    id: 'batch-1',
    masterTrackingNumber: 'AIR-20260910-0001',
    transportMode: 'air',
    transportLabel: 'Air freight',
    status: 'closed',
    statusLabel: 'Closed and dispatched',
    movementStatus: 'IN_TRANSIT_TO_LAGOS_OFFICE',
    movementStatusLabel: 'On the way to our office',
    customerCount: 1,
    orderCount: 1,
    totalWeightKg: '5.000',
    ...overrides,
  };
}

function shipment(overrides: Partial<BatchRosterOrder> = {}): BatchRosterOrder {
  return {
    id: 'order-1',
    trackingNumber: '20260910-0001',
    status: 'IN_TRANSIT_TO_LAGOS_OFFICE',
    statusLabel: 'On the way to our office',
    isWarehouseVerifiedAndPriced: true,
    description: null,
    weightKg: '5.000',
    shipmentType: 'air',
    shipmentTypeLabel: 'Air freight',
    finalChargeUsd: '20.00',
    totalPaidUsd: '20.00',
    amountDue: null,
    paymentCollectionStatus: 'PAID_IN_FULL',
    declaredValueUsd: '50.00',
    createdAt: '2026-09-10T10:00:00.000Z',
    ...overrides,
  };
}

describe('last-mile batch eligibility', () => {
  it('requires both a closed batch and the final shared movement stage', () => {
    expect(isLastMileBatch(batch())).toBe(true);
    expect(isLastMileBatch(batch({ status: 'open' }))).toBe(false);
    expect(isLastMileBatch(batch({ movementStatus: null, movementStatusLabel: null }))).toBe(false);
    expect(isLastMileBatch(batch({ movementStatus: 'CUSTOMS_CLEARED_LAGOS' }))).toBe(false);
  });
});

describe('last-mile next actions', () => {
  it('maps the standard pickup handoff and completion steps', () => {
    expect(getLastMileNextAction(shipment())).toEqual({ kind: 'ready', label: 'Mark ready for pickup' });
    expect(getLastMileNextAction(shipment({ status: 'READY_FOR_PICKUP' }))).toEqual({ kind: 'pickup', label: 'Complete pickup' });
    expect(getLastMileNextAction(shipment({ status: 'PICKED_UP_COMPLETED' }))).toBeNull();
    expect(isLastMileTerminal(shipment({ status: 'PICKED_UP_COMPLETED' }))).toBe(true);
  });

  it('offers only the next door-to-door delivery step', () => {
    const d2d = (status: string) => shipment({ shipmentType: 'd2d', shipmentTypeLabel: 'Door to door', status });
    expect(getLastMileNextAction(d2d('IN_TRANSIT_TO_LAGOS_OFFICE'))).toEqual({
      kind: 'status', label: 'Assign local courier', statusV2: 'LOCAL_COURIER_ASSIGNED',
    });
    expect(getLastMileNextAction(d2d('IN_TRANSIT_TO_LAGOS_OFFICE'), true)).toEqual({
      kind: 'status', label: 'Start extra truck movement', statusV2: 'IN_EXTRA_TRUCK_MOVEMENT_LAGOS',
    });
    expect(getLastMileNextAction(d2d('LOCAL_COURIER_ASSIGNED'))).toEqual({
      kind: 'status', label: 'Mark in transit to destination', statusV2: 'IN_TRANSIT_TO_DESTINATION_CITY',
    });
    expect(getLastMileNextAction(d2d('OUT_FOR_DELIVERY_DESTINATION_CITY'))).toEqual({
      kind: 'delivery', label: 'Complete delivery',
    });
    expect(getLastMileNextAction(d2d('DELIVERED_TO_RECIPIENT'))).toBeNull();
  });
});
