import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NeedsAttentionPanel } from './NeedsAttentionPanel';

vi.mock('@/hooks', () => ({
  useOrders: () => ({ total: 1, isLoading: false, error: null }),
}));

describe('NeedsAttentionPanel', () => {
  it('links every stage to Operations', () => {
    render(
      <MemoryRouter>
        <NeedsAttentionPanel />
      </MemoryRouter>,
    );

    for (const label of [
      'Booking Submitted',
      'Awaiting Warehouse',
      'Warehouse Received',
      'Verified & Priced',
      'On Hold',
    ]) {
      expect(screen.getByRole('link', { name: new RegExp(label) }).getAttribute('href')).toBe(
        '/operations',
      );
    }
  });
});
