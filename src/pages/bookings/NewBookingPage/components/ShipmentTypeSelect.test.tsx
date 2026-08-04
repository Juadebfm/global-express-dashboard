import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ShipmentTypeSelect } from './ShipmentTypeSelect';

afterEach(() => {
  cleanup();
});

describe('ShipmentTypeSelect', () => {
  it('offers all three shipment types', () => {
    render(<ShipmentTypeSelect value="air" onChange={vi.fn()} />);

    expect(screen.getByRole('radio', { name: /Air freight/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Ocean freight/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Door-to-door/ })).toBeInTheDocument();
  });

  it('marks only the selected option as checked', () => {
    render(<ShipmentTypeSelect value="sea" onChange={vi.fn()} />);

    expect(screen.getByRole('radio', { name: /Ocean freight/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Air freight/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Door-to-door/ })).not.toBeChecked();
  });

  it('reports the picked type', () => {
    const onChange = vi.fn();
    render(<ShipmentTypeSelect value="air" onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: /Door-to-door/ }));
    expect(onChange).toHaveBeenCalledWith('d2d');
  });

  // Three descriptions at once crowded the labels into unreadable fragments at
  // three cards across, so only the chosen option is explained.
  it('explains only the selected option, not all three at once', () => {
    render(<ShipmentTypeSelect value="air" onChange={vi.fn()} />);

    expect(screen.getByText(/Arrives in 5–7 days/)).toBeInTheDocument();
    expect(screen.queryByText(/Arrives in 30–40 days/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Priced individually/)).not.toBeInTheDocument();
  });

  it('swaps the explanation when a different option is chosen', () => {
    const { rerender } = render(<ShipmentTypeSelect value="air" onChange={vi.fn()} />);
    expect(screen.getByText(/Arrives in 5–7 days/)).toBeInTheDocument();

    rerender(<ShipmentTypeSelect value="d2d" onChange={vi.fn()} />);
    expect(screen.getByText(/Priced individually/)).toBeInTheDocument();
    expect(screen.queryByText(/Arrives in 5–7 days/)).not.toBeInTheDocument();
  });

  it('keeps the cards to an icon and a label so they fit three across', () => {
    render(<ShipmentTypeSelect value="air" onChange={vi.fn()} />);

    const card = screen.getByRole('radio', { name: /Ocean freight/ });
    expect(card.textContent).toBe('Ocean freight');
  });

  it('exposes the group to assistive technology', () => {
    render(<ShipmentTypeSelect value="air" onChange={vi.fn()} />);
    expect(screen.getByRole('radiogroup', { name: 'Shipment type' })).toBeInTheDocument();
  });
});
