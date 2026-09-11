import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { D2dOrderModal } from './D2dOrderModal';

const intake = { isPending: false, mutateAsync: vi.fn() };

vi.mock('@/hooks', () => ({
  useD2dOrderIntake: () => intake,
}));

beforeEach(() => {
  intake.mutateAsync.mockReset().mockResolvedValue({
    id: 'order-1',
    trackingNumber: 'D2D-20260911-0001',
    shipmentType: 'd2d',
    isPreorder: true,
    statusV2: 'PREORDER_SUBMITTED',
  });
});

describe('D2dOrderModal', () => {
  it('creates an order with the required recipient phone and returns its tracking result', async () => {
    const onCreated = vi.fn();
    render(<D2dOrderModal onClose={vi.fn()} onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText('Your full name'), { target: { value: 'Ada Lovelace' } });
    fireEvent.change(screen.getByLabelText('Origin country'), { target: { value: 'South Korea' } });
    fireEvent.change(screen.getByLabelText('Recipient phone'), { target: { value: '+2348012345678' } });
    fireEvent.change(screen.getByLabelText('Goods description'), { target: { value: 'Kitchenware' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create D2D order' }));

    await waitFor(() => expect(intake.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      deliveryPhone: '+2348012345678',
      goodsDescription: 'Kitchenware',
    })));
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ trackingNumber: 'D2D-20260911-0001' }));
  });
});
