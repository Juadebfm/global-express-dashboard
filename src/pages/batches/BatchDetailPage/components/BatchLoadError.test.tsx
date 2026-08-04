import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BatchLoadError } from './BatchLoadError';
import { ApiError } from '@/lib/apiClient';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderError(error: unknown, onRetry = vi.fn()) {
  render(
    <MemoryRouter>
      <BatchLoadError error={error} onRetry={onRetry} />
    </MemoryRouter>,
  );
  return { onRetry };
}

function apiError(status: number, message = 'Boom', requestId: string | null = null): ApiError {
  return new ApiError(message, status, null, requestId);
}

describe('BatchLoadError', () => {
  // Retrying a missing batch fails identically every time, so offering the
  // action would send staff round a loop with no way out.
  it('offers no retry for a batch that does not exist', () => {
    renderError(apiError(404, 'Batch not found'));

    expect(screen.getByText('This batch no longer exists')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Try again/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All batches/i })).toBeInTheDocument();
  });

  it('offers no retry when the viewer lacks the capability', () => {
    renderError(apiError(403, 'Forbidden'));

    expect(screen.getByText('You do not have access to this batch')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Try again/i })).not.toBeInTheDocument();
  });

  it('offers a working retry for an unexpected failure', () => {
    const { onRetry } = renderError(apiError(500, 'Internal error'));

    expect(screen.getByText('Could not load this batch')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers a retry for a plain network failure with no status', () => {
    const { onRetry } = renderError(new Error('Failed to fetch'));

    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // The reference is only useful when something genuinely went wrong; a
  // missing batch is an expected answer, not an incident to report.
  it('shows the request reference only for an unexpected failure', () => {
    renderError(apiError(500, 'Internal error', 'req-abc123'));
    expect(screen.getByText(/req-abc123/)).toBeInTheDocument();

    cleanup();

    renderError(apiError(404, 'Batch not found', 'req-abc123'));
    expect(screen.queryByText(/req-abc123/)).not.toBeInTheDocument();
  });

  it('always provides a way back to the batch list', () => {
    for (const status of [404, 403, 500]) {
      renderError(apiError(status));
      expect(screen.getByRole('button', { name: /All batches/i })).toBeInTheDocument();
      cleanup();
    }
  });
});
