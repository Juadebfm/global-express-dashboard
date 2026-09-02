import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { OrderListItem } from '@/types';
import { BrowsePane } from './BrowsePane';

vi.mock('@/hooks', () => ({
  useBankAccounts: () => ({ data: undefined }),
  useCapability: () => false,
  useFxRate: () => ({ data: undefined }),
  useGalleryClaims: () => ({ data: undefined }),
  useSendPaymentRequest: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/pages/dashboard/DashboardPage/components/ShipmentDetailsModal', () => ({
  ShipmentDetailsModal: ({ orderId }: { orderId: string }) => (
    <div role="dialog">Order details: {orderId}</div>
  ),
}));

const order = {
  id: 'order-1',
  trackingNumber: '20260902-A1B2',
  transportMode: 'air',
  statusV2: 'WAREHOUSE_VERIFIED_PRICED',
  statusLabel: 'Verified & Priced',
  createdAt: '2026-09-02T09:00:00.000Z',
  destination: 'Lagos, Nigeria',
  senderName: 'Jane Doe',
  paymentCollectionStatus: 'PAID_IN_FULL',
  raw: {},
} as unknown as OrderListItem;

describe('BrowsePane', () => {
  it('opens shipment details when a recently sorted order is selected', () => {
    render(
      <MemoryRouter>
        <BrowsePane
          allOrders={[order]}
          canResolveEscalations={false}
          userName="Dele"
          onStartQueue={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View order 20260902-A1B2' }));

    expect(screen.getByRole('dialog').textContent).toBe('Order details: order-1');
  });
});
