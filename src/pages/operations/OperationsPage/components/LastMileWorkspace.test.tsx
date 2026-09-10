import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BatchRosterResult } from '@/types';
import { LastMileWorkspace } from './LastMileWorkspace';

const updateStatus = { isPending: false, mutateAsync: vi.fn() };
const complete = { isPending: false, mutateAsync: vi.fn() };
const resendPin = { isPending: false, mutateAsync: vi.fn() };

interface PermissionState {
  isReady: boolean;
  can: (capability: string) => boolean;
  refresh: ReturnType<typeof vi.fn>;
}

let permissionState: PermissionState = { isReady: true, can: (capability) => capability === 'local_delivery.manage', refresh: vi.fn() };
let timelineState: { data: { goodsBreakdown: Array<{ requiresExtraTruckMovement: boolean }> } | undefined; isLoading: boolean; error: Error | null; refetch: ReturnType<typeof vi.fn> };
let rosterState: { data: BatchRosterResult; isLoading: boolean; error: Error | null; refetch: ReturnType<typeof vi.fn> };
let movementState: { data: { currentStatus: string }; isLoading: boolean; error: Error | null; refetch: ReturnType<typeof vi.fn> };

vi.mock('@/hooks', () => ({
  useBatchRoster: () => rosterState,
  useBatchMovement: () => movementState,
  useLastMileActions: () => ({ updateStatus, complete, resendPin }),
  useOrderTimeline: () => timelineState,
  usePermissions: () => permissionState,
}));

function makeRoster(overrides: { shipmentType?: 'air' | 'd2d'; status?: string; paymentCollectionStatus?: 'PAID_IN_FULL' | 'UNPAID' } = {}): BatchRosterResult {
  const shipmentType = overrides.shipmentType ?? 'air';
  return {
    batch: { masterTrackingNumber: 'AIR-20260910-0001' },
    customers: [{
      slotId: 'slot-1',
      customerId: 'customer-1',
      customerName: 'Eventus Cadna',
      shippingMark: '',
      customerBatchReference: 'M549',
      orderCount: 1,
      totalWeightKg: '1.000',
      allVerified: true,
      orders: [{
        id: 'order-1',
        trackingNumber: '20260910-0001',
        status: overrides.status ?? 'IN_TRANSIT_TO_LAGOS_OFFICE',
        statusLabel: 'On the way to our office',
        isWarehouseVerifiedAndPriced: true,
        description: null,
        weightKg: '1.000',
        shipmentType,
        shipmentTypeLabel: shipmentType === 'd2d' ? 'Door to door' : 'Air freight',
        finalChargeUsd: '10.00',
        totalPaidUsd: '10.00',
        amountDue: null,
        paymentCollectionStatus: overrides.paymentCollectionStatus ?? 'PAID_IN_FULL',
        declaredValueUsd: '20.00',
        createdAt: '2026-09-10T10:00:00.000Z',
      }],
    }],
    summary: {
      totalCustomers: 1,
      totalOrders: 1,
      totalWeightKg: '1.000',
      unverifiedOrders: 0,
      canClose: true,
      shipmentTypeBreakdown: {},
      goodsTypeBreakdown: {},
    },
  } as unknown as BatchRosterResult;
}

beforeEach(() => {
  updateStatus.mutateAsync.mockReset().mockResolvedValue({ id: 'order-1' });
  complete.mutateAsync.mockReset().mockResolvedValue({ message: 'Pickup completed.' });
  resendPin.mutateAsync.mockReset().mockResolvedValue({ message: 'PIN sent.' });
  permissionState = { isReady: true, can: (capability) => capability === 'local_delivery.manage', refresh: vi.fn() };
  timelineState = { data: { goodsBreakdown: [] }, isLoading: false, error: null, refetch: vi.fn() };
  rosterState = { data: makeRoster(), isLoading: false, error: null, refetch: vi.fn() };
  movementState = { data: { currentStatus: 'IN_TRANSIT_TO_LAGOS_OFFICE' }, isLoading: false, error: null, refetch: vi.fn() };
});

afterEach(cleanup);

describe('LastMileWorkspace', () => {
  it('requires staff acknowledgement before marking a paid standard shipment ready', async () => {
    render(<LastMileWorkspace batchId="batch-1" onExit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark ready for pickup' }));
    expect(screen.getByText('Mark shipment ready for pickup?')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Mark ready for pickup' })[1]!);

    await waitFor(() => expect(updateStatus.mutateAsync).toHaveBeenCalledWith({
      batchId: 'batch-1',
      orderId: 'order-1',
      statusV2: 'READY_FOR_PICKUP',
    }));
  });

  it('uses the existing order timeline to select an extra truck step for D2D', () => {
    rosterState = { ...rosterState, data: makeRoster({ shipmentType: 'd2d' }) };
    timelineState = {
      ...timelineState,
      data: { goodsBreakdown: [{ requiresExtraTruckMovement: true }] },
    };

    render(<LastMileWorkspace batchId="batch-1" onExit={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Start extra truck movement' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign local courier' })).not.toBeInTheDocument();
  });

  it('explains missing local-delivery access instead of showing an action control', () => {
    permissionState = { ...permissionState, can: () => false };

    render(<LastMileWorkspace batchId="batch-1" onExit={vi.fn()} />);

    expect(screen.getAllByText('Manage local delivery access is required.').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Mark ready for pickup' })).not.toBeInTheDocument();
  });
});
