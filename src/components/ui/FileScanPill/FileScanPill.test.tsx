import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FileScanPill } from './FileScanPill';
import type { FileScanStatus } from '@/types';

afterEach(() => {
  cleanup();
});

describe('FileScanPill', () => {
  it('renders the right label for each status', () => {
    const cases: Array<{ status: FileScanStatus; label: string }> = [
      { status: 'pending', label: 'Scanning' },
      { status: 'clean', label: 'Scanned safe' },
      { status: 'malicious', label: 'Flagged' },
      { status: 'error', label: 'Scan failed' },
      { status: 'skipped', label: 'Not scanned' },
    ];
    for (const { status, label } of cases) {
      const { unmount } = render(<FileScanPill status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it('omits the text label in compact mode but keeps the aria-label', () => {
    render(<FileScanPill status="clean" compact />);
    expect(screen.queryByText('Scanned safe')).not.toBeInTheDocument();
    // Aria still names it for screen readers.
    expect(screen.getByLabelText(/Scanned safe/i)).toBeInTheDocument();
  });
});
