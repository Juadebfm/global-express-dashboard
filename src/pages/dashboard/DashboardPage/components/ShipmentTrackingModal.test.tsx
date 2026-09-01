import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShipmentTrackingModal } from './ShipmentTrackingModal';

const { useOrderTimeline } = vi.hoisted(() => ({ useOrderTimeline: vi.fn() }));

vi.mock('@/hooks', () => ({ useOrderTimeline }));
vi.mock('@/pages/shared', () => ({
  ShipmentTimeline: () => <div data-testid="shipment-timeline" />,
}));

describe('ShipmentTrackingModal', () => {
  it('shows the current step and warehouse-receipt explanation before tracking is assigned', () => {
    useOrderTimeline.mockReturnValue({
      data: {
        trackingNumber: '',
        currentStatus: 'AWAITING_WAREHOUSE_RECEIPT',
        currentStatusLabel: 'Processing at Origin',
        timeline: [],
      },
      isLoading: false,
      error: null,
    });

    render(<ShipmentTrackingModal orderId="order-1" onClose={vi.fn()} />);

    expect(screen.getByText('Current step')).toBeInTheDocument();
    expect(screen.getByText('Processing at Origin')).toBeInTheDocument();
    expect(
      screen.getByText(/Awaiting receipt of your goods at our warehouse/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Tracking number')).not.toBeInTheDocument();
  });
});
