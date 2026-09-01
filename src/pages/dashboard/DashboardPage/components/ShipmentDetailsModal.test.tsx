import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ShipmentDetailsModal } from './ShipmentDetailsModal';

const { useOrderDetail, useOrderTimeline } = vi.hoisted(() => ({
  useOrderDetail: vi.fn(),
  useOrderTimeline: vi.fn(),
}));

vi.mock('@/hooks', () => ({ useOrderDetail, useOrderTimeline }));
vi.mock('@/components/orders', () => ({
  CustomerParcelsPanel: () => <div data-testid="declared-parcels" />,
}));
vi.mock('@/pages/shared', () => ({
  toView: () => ({
    amountDue: 3208.5,
    finalChargeUsd: 3208.5,
    paymentCollectionStatus: 'PAYMENT_IN_PROGRESS',
  }),
}));

describe('ShipmentDetailsModal payment status', () => {
  it('shows a submitted receipt as pending and prevents a second payment', () => {
    useOrderDetail.mockReturnValue({
      data: {
        id: 'order-1',
        trackingNumber: '20260805-M549',
        statusV2: 'VERIFIED_AND_PRICED',
        statusLabel: 'Verified, Weighed & Ready to Ship',
        sourcingSupplierId: null,
        sourcingSupplierName: null,
        sourcingSupplierPhone: null,
        sourcingSupplierEmail: null,
      },
      isLoading: false,
      error: null,
    });
    useOrderTimeline.mockReturnValue({
      data: { goodsBreakdown: [] },
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <ShipmentDetailsModal orderId="order-1" onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Payment pending')).toBeInTheDocument();
    expect(screen.getByText(/We received your payment receipt and are reviewing it/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay now' })).not.toBeInTheDocument();
  });
});
