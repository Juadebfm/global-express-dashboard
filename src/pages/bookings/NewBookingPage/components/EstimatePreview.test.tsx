import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOrderEstimate } from '@/hooks';
import { EstimatePreview } from './EstimatePreview';
import { EMPTY_PARCEL } from './parcelDraft';

vi.mock('@/hooks', () => ({
  useOrderEstimate: vi.fn(),
}));

const estimateState = {
  data: undefined,
  isPending: false,
  isError: false,
  isFetching: false,
};

describe('EstimatePreview', () => {
  it('shows a direction and keeps the estimate query disabled for incomplete dimensions', () => {
    vi.mocked(useOrderEstimate).mockReturnValue(estimateState as ReturnType<typeof useOrderEstimate>);

    render(
      <EstimatePreview
        shipmentType="air"
        parcels={[{ ...EMPTY_PARCEL, lengthCm: '40', widthCm: '100' }]}
      />,
    );

    expect(screen.getByText('Please enter the height to calculate an estimate.')).toBeTruthy();
    expect(useOrderEstimate).toHaveBeenCalledWith('air', []);
    expect(screen.queryByText('Could not calculate estimate. Please check your input.')).toBeNull();
  });

  it('enables the estimate query once all dimensions are entered', () => {
    vi.mocked(useOrderEstimate).mockReturnValue({
      ...estimateState,
      isPending: true,
    } as ReturnType<typeof useOrderEstimate>);

    render(
      <EstimatePreview
        shipmentType="air"
        parcels={[{ ...EMPTY_PARCEL, lengthCm: '40', widthCm: '100', heightCm: '50' }]}
      />,
    );

    expect(useOrderEstimate).toHaveBeenCalledWith('air', [
      { lengthCm: 40, widthCm: 100, heightCm: 50 },
    ]);
    expect(screen.getByText('Calculating estimate…')).toBeTruthy();
  });
});
