import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { ApiError } from '@/lib/apiClient';

function Boom(): never {
  throw new Error('kaboom');
}

function BoomApi({ requestId }: { requestId: string | null }): never {
  throw new ApiError('Internal server error', 500, null, requestId, null);
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // React 19 logs the caught error to console.error. Silence it so test
  // output stays readable; the assertion is on the rendered fallback.
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  errorSpy.mockRestore();
  cleanup();
});

describe('RouteErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    render(
      <RouteErrorBoundary>
        <div>safe content</div>
      </RouteErrorBoundary>,
    );
    expect(screen.getByText('safe content')).toBeInTheDocument();
  });

  it('renders the fallback when a child throws', () => {
    render(
      <RouteErrorBoundary>
        <Boom />
      </RouteErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('does not leak the thrown error message into the fallback UI', () => {
    render(
      <RouteErrorBoundary>
        <Boom />
      </RouteErrorBoundary>,
    );
    // The user-facing copy is intentionally generic — error.message can
    // carry arbitrary inputs we don't want to surface.
    expect(screen.queryByText(/kaboom/i)).not.toBeInTheDocument();
  });

  it('renders the ApiError requestId as a Ref: line in the fallback', () => {
    render(
      <RouteErrorBoundary>
        <BoomApi requestId="req-abc-123" />
      </RouteErrorBoundary>,
    );
    expect(screen.getByText(/Ref:/)).toBeInTheDocument();
    expect(screen.getByText(/req-abc-123/)).toBeInTheDocument();
  });

  it('omits the Ref: line when the caught error is not an ApiError', () => {
    render(
      <RouteErrorBoundary>
        <Boom />
      </RouteErrorBoundary>,
    );
    expect(screen.queryByText(/Ref:/)).not.toBeInTheDocument();
  });

  it('omits the Ref: line when an ApiError has no requestId', () => {
    render(
      <RouteErrorBoundary>
        <BoomApi requestId={null} />
      </RouteErrorBoundary>,
    );
    expect(screen.queryByText(/Ref:/)).not.toBeInTheDocument();
  });
});
