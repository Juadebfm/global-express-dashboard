import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ChargeBalanceSummary } from './ChargeBalanceSummary';

afterEach(cleanup);

describe('ChargeBalanceSummary', () => {
  it('shows the final charge beside the remaining amount', () => {
    render(<ChargeBalanceSummary finalChargeUsd={200} amountDue={75} />);

    expect(screen.getByText('Final charge')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    expect(screen.getByText('Amount due')).toBeInTheDocument();
    expect(screen.getByText('$75.00')).toBeInTheDocument();
  });

  it('keeps the amount-due label when the shipment is paid in full', () => {
    render(<ChargeBalanceSummary finalChargeUsd={200} amountDue={null} />);

    expect(screen.getByText('Final charge')).toBeInTheDocument();
    expect(screen.getByText('Amount due')).toBeInTheDocument();
    expect(screen.getByText('Paid in full')).toBeInTheDocument();
  });

  it('does not show either value before the shipment has a final charge', () => {
    const { container } = render(<ChargeBalanceSummary finalChargeUsd={null} amountDue={100} />);

    expect(container).toBeEmptyDOMElement();
  });
});
