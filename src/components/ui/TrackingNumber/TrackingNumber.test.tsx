import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TrackingNumber } from './TrackingNumber';

afterEach(() => {
  cleanup();
});

describe('TrackingNumber', () => {
  it('renders the number and a copy control once one is assigned', () => {
    render(<TrackingNumber value="20260804-A1B2" />);

    expect(screen.getByText('20260804-A1B2')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  // Before warehouse verification the backend sends null. Nothing
  // tracking-shaped may appear — no placeholder number and no copy control
  // offering to copy an empty value.
  it('shows a plain note and no copy control when none is assigned', () => {
    render(<TrackingNumber value={null} />);

    expect(screen.getByText('Not assigned yet')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('never renders an identifier of its own when the value is empty', () => {
    const { container } = render(<TrackingNumber value="" />);

    expect(container.textContent).toBe('Not assigned yet');
  });
});
