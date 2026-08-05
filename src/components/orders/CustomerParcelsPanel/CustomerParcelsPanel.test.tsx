import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CustomerParcelsPanel } from './CustomerParcelsPanel';
import { ApiError } from '@/lib/apiClient';
import type { CustomerDeclaredParcel } from '@/types';

const addMutate = vi.fn();
const updateMutate = vi.fn();
const removeMutate = vi.fn();

vi.mock('@/hooks', () => ({
  useAddCustomerDeclaredParcels: () => ({ mutateAsync: addMutate, isPending: false }),
  useUpdateCustomerDeclaredParcel: () => ({ mutateAsync: updateMutate, isPending: false }),
  useDeleteCustomerDeclaredParcel: () => ({ mutateAsync: removeMutate, isPending: false }),
}));

const PARCEL: CustomerDeclaredParcel = {
  id: 'p1',
  lengthCm: '40.00',
  widthCm: '30.00',
  heightCm: '25.00',
  weightKg: '12.500',
  declaredSource: 'customer',
  staffDescription:
    'Customer-provided measurements: Length: 40.00 cm, Width: 30.00 cm, Height: 25.00 cm, Weight: 12.500 kg.',
  createdAt: '2026-08-04T10:00:00.000Z',
  updatedAt: '2026-08-04T10:00:00.000Z',
};

afterEach(() => {
  cleanup();
  addMutate.mockReset();
  updateMutate.mockReset();
  removeMutate.mockReset();
});

describe('CustomerParcelsPanel', () => {
  it('prints the backend sentence rather than reassembling the numbers', () => {
    render(<CustomerParcelsPanel orderId="o1" parcels={[PARCEL]} canEdit={false} />);
    expect(screen.getByText(PARCEL.staffDescription)).toBeInTheDocument();
  });

  // Staff must never be able to change what the customer told us.
  it('offers no controls when editing is not allowed', () => {
    render(<CustomerParcelsPanel orderId="o1" parcels={[PARCEL]} canEdit={false} />);

    expect(screen.queryByRole('button', { name: /Edit parcel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add parcel sizes/i })).not.toBeInTheDocument();
  });

  it('offers add and edit while the window is open', () => {
    render(<CustomerParcelsPanel orderId="o1" parcels={[PARCEL]} canEdit />);

    expect(screen.getByRole('button', { name: /Edit parcel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add parcel sizes/i })).toBeInTheDocument();
  });

  it('renders nothing for staff when the customer supplied none', () => {
    const { container } = render(
      <CustomerParcelsPanel orderId="o1" parcels={[]} canEdit={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  // A closed window is an expected outcome, so the backend's own sentence is
  // shown rather than a generic failure.
  it('shows the conflict message when staff have already started', async () => {
    updateMutate.mockRejectedValue(
      new ApiError(
        'Customer parcel details can no longer be changed because staff processing has started.',
        409,
        null,
        'req-42',
      ),
    );

    render(<CustomerParcelsPanel orderId="o1" parcels={[PARCEL]} canEdit />);
    fireEvent.click(screen.getByRole('button', { name: /Edit parcel/i }));

    const lengthInput = screen.getAllByRole('spinbutton')[0]!;
    fireEvent.change(lengthInput, { target: { value: '55' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByText(/can no longer be changed/i)).toBeInTheDocument(),
    );
  });

  it('rejects a measurement that is not above zero', async () => {
    render(<CustomerParcelsPanel orderId="o1" parcels={[PARCEL]} canEdit />);
    fireEvent.click(screen.getByRole('button', { name: /Edit parcel/i }));

    fireEvent.change(screen.getAllByRole('spinbutton')[0]!, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByText(/must be a number greater than zero/i)).toBeInTheDocument(),
    );
    expect(updateMutate).not.toHaveBeenCalled();
  });

  // Clearing one field is allowed; clearing all four is what the API rejects.
  it('will not let every measurement be cleared', async () => {
    render(<CustomerParcelsPanel orderId="o1" parcels={[PARCEL]} canEdit />);
    fireEvent.click(screen.getByRole('button', { name: /Edit parcel/i }));

    for (const input of screen.getAllByRole('spinbutton')) {
      fireEvent.change(input, { target: { value: '' } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByText(/must keep at least one measurement/i)).toBeInTheDocument(),
    );
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('sends only the fields that changed, clearing one as null', async () => {
    updateMutate.mockResolvedValue({ parcel: PARCEL });

    render(<CustomerParcelsPanel orderId="o1" parcels={[PARCEL]} canEdit />);
    fireEvent.click(screen.getByRole('button', { name: /Edit parcel/i }));

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0]!, { target: { value: '55' } });
    fireEvent.change(inputs[3]!, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalled());
    expect(updateMutate).toHaveBeenCalledWith({
      orderId: 'o1',
      parcelId: 'p1',
      patch: { lengthCm: 55, weightKg: null },
    });
  });

  it('offers a remove control while the window is open', () => {
    render(<CustomerParcelsPanel orderId="o1" parcels={[PARCEL]} canEdit />);
    expect(screen.getByRole('button', { name: /Remove parcel/i })).toBeInTheDocument();
  });

  it('offers no remove control to staff', () => {
    render(<CustomerParcelsPanel orderId="o1" parcels={[PARCEL]} canEdit={false} />);
    expect(screen.queryByRole('button', { name: /Remove parcel/i })).not.toBeInTheDocument();
  });

  // Removing the last one is allowed: declaring parcels is optional, so an
  // empty list is a state the product already supports.
  it('removes a parcel, including the only one', async () => {
    removeMutate.mockResolvedValue({ parcels: [] });

    render(<CustomerParcelsPanel orderId="o1" parcels={[PARCEL]} canEdit />);
    fireEvent.click(screen.getByRole('button', { name: /Remove parcel/i }));

    await waitFor(() =>
      expect(removeMutate).toHaveBeenCalledWith({ orderId: 'o1', parcelId: 'p1' }),
    );
  });

  it('shows the conflict message when a removal is too late', async () => {
    removeMutate.mockRejectedValue(
      new ApiError(
        'Customer parcel details can no longer be changed because staff processing has started.',
        409,
        null,
        'req-42',
      ),
    );

    render(<CustomerParcelsPanel orderId="o1" parcels={[PARCEL]} canEdit />);
    fireEvent.click(screen.getByRole('button', { name: /Remove parcel/i }));

    await waitFor(() =>
      expect(screen.getByText(/can no longer be changed/i)).toBeInTheDocument(),
    );
  });

  // Attribution comes along inside the sentence, so it must not be rebuilt
  // from the parts — a staff-recorded parcel reads differently.
  it('prints the staff attribution verbatim when staff recorded it', () => {
    const staffParcel = {
      ...PARCEL,
      declaredSource: 'staff' as const,
      staffDescription:
        'Measurements recorded by staff at booking: Length: 40.00 cm, Width: 30.00 cm, Height: 25.00 cm, Weight: 12.500 kg.',
    };

    render(<CustomerParcelsPanel orderId="o1" parcels={[staffParcel]} canEdit={false} />);
    expect(screen.getByText(staffParcel.staffDescription)).toBeInTheDocument();
  });
});
