import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OrderListItem } from '@/types';
import { ShipmentTable } from './ShipmentTable';

function makeOrder(overrides: Partial<OrderListItem> = {}): OrderListItem {
  return {
    id: 'order-1',
    trackingNumber: '20260805-M549',
    status: 'verified',
    statusV2: 'VERIFIED_AND_PRICED',
    statusLabel: 'Verified, Weighed & Ready to Ship',
    origin: 'South Korea',
    destination: 'Lagos, Nigeria',
    createdAt: '2026-09-01T12:00:00.000Z',
    amount: null,
    transportMode: 'air',
    paymentCollectionStatus: 'PAYMENT_IN_PROGRESS',
    flaggedForAdminReview: false,
    escalatedAt: null,
    escalationNote: null,
    raw: { description: 'Ceramic coffee cups', amountDue: '3208.50' },
    ...overrides,
  };
}

describe('ShipmentTable payment status', () => {
  it('shows a submitted receipt as pending instead of showing the balance due', () => {
    render(<ShipmentTable orders={[makeOrder()]} onOpen={vi.fn()} onTrack={vi.fn()} />);

    expect(screen.getByText('Payment pending')).toBeInTheDocument();
    expect(screen.queryByText(/\$3,208\.50 due/)).not.toBeInTheDocument();
  });
});
