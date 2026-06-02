import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GatedFileViewer } from './GatedFileViewer';
import type { FileScanStatus } from '@/types';

afterEach(() => {
  cleanup();
});

// Mock the hook directly so the viewer tests don't depend on Clerk /
// auth-token wiring. The hook itself is covered by a separate test that
// exercises the polling/staleTime behaviour through TanStack Query.
vi.mock('@/hooks', () => ({
  useFileScanStatus: vi.fn(),
}));

import { useFileScanStatus } from '@/hooks';

type QueryShape = {
  data: { r2Key: string; status: FileScanStatus; scannedAt: string | null } | undefined;
  isLoading: boolean;
  error: Error | null;
};

function setQuery(shape: QueryShape): void {
  (useFileScanStatus as unknown as ReturnType<typeof vi.fn>).mockReturnValue(shape);
}

describe('GatedFileViewer', () => {
  it('bypass=true renders children immediately without invoking the hook', () => {
    setQuery({ data: undefined, isLoading: false, error: null });
    render(
      <GatedFileViewer r2Key="k" bypass>
        <div>real file</div>
      </GatedFileViewer>,
    );
    expect(screen.getByText('real file')).toBeInTheDocument();
  });

  it('renders the "unavailable" placeholder when r2Key is missing', () => {
    setQuery({ data: undefined, isLoading: false, error: null });
    render(
      <GatedFileViewer r2Key={null}>
        <div>real file</div>
      </GatedFileViewer>,
    );
    expect(screen.getByText('File unavailable')).toBeInTheDocument();
    expect(screen.queryByText('real file')).not.toBeInTheDocument();
  });

  it('renders children when scan status is clean', () => {
    setQuery({
      data: { r2Key: 'k', status: 'clean', scannedAt: '2026-06-02T00:00:00Z' },
      isLoading: false,
      error: null,
    });
    render(
      <GatedFileViewer r2Key="k">
        <div data-testid="file">real file</div>
      </GatedFileViewer>,
    );
    expect(screen.getByTestId('file')).toBeInTheDocument();
  });

  it('hides children and shows a flagged placeholder when status is malicious', () => {
    setQuery({
      data: { r2Key: 'k', status: 'malicious', scannedAt: '2026-06-02T00:00:00Z' },
      isLoading: false,
      error: null,
    });
    render(
      <GatedFileViewer r2Key="k">
        <div data-testid="file">real file</div>
      </GatedFileViewer>,
    );
    expect(screen.getByText('File flagged')).toBeInTheDocument();
    expect(screen.queryByTestId('file')).not.toBeInTheDocument();
  });

  it('renders children with a caveat pill when status is skipped', () => {
    setQuery({
      data: { r2Key: 'k', status: 'skipped', scannedAt: '2026-06-02T00:00:00Z' },
      isLoading: false,
      error: null,
    });
    render(
      <GatedFileViewer r2Key="k">
        <div data-testid="file">real file</div>
      </GatedFileViewer>,
    );
    expect(screen.getByTestId('file')).toBeInTheDocument();
    expect(screen.getByLabelText(/Not scanned/i)).toBeInTheDocument();
  });

  it('shows the scan-failed placeholder when status is error', () => {
    setQuery({
      data: { r2Key: 'k', status: 'error', scannedAt: '2026-06-02T00:00:00Z' },
      isLoading: false,
      error: null,
    });
    render(
      <GatedFileViewer r2Key="k">
        <div data-testid="file">real file</div>
      </GatedFileViewer>,
    );
    expect(screen.getByText('Scan failed')).toBeInTheDocument();
    expect(screen.queryByTestId('file')).not.toBeInTheDocument();
  });

  it('shows the pending placeholder while status is pending', () => {
    setQuery({
      data: { r2Key: 'k', status: 'pending', scannedAt: null },
      isLoading: false,
      error: null,
    });
    render(
      <GatedFileViewer r2Key="k">
        <div data-testid="file">real file</div>
      </GatedFileViewer>,
    );
    expect(screen.getByText('Scan in progress')).toBeInTheDocument();
    expect(screen.queryByTestId('file')).not.toBeInTheDocument();
  });
});
