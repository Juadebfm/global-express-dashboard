import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ApiError } from '@/lib/apiClient';

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  /**
   * The backend request correlation ID from a caught `ApiError`. Surfaced
   * in the fallback so the user can quote it in a support ticket. Null for
   * render-time exceptions that aren't HTTP errors.
   */
  requestId: string | null;
}

/**
 * Last-resort error boundary wrapping the route tree. apiClient errors are
 * caught inside mutations and toasted; this boundary exists for the rarer
 * case of a render-time exception (a component throwing on a bad prop, a
 * lazy-import network failure, etc.) so the app shows a friendly fallback
 * instead of going blank.
 *
 * When the caught error is an `ApiError` carrying RFC 7807 `requestId`, the
 * fallback shows it as a `Ref: req-X` footer line so support can correlate
 * to the server log. The boundary never logs the raw `Error.message` because
 * it can carry arbitrary user input.
 *
 * Resets state via "Reload" (full page refresh — also re-runs lazy chunks
 * that failed to load) or "Go home" (hard nav to /, which unmounts the
 * thrown subtree).
 */
export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false, requestId: null };

  static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState {
    const requestId = error instanceof ApiError ? error.requestId : null;
    return { hasError: true, requestId };
  }

  componentDidCatch(): void {
    // Intentionally no remote logging here — the audit forbids logging PII to
    // any sink, and a thrown Error's message can carry arbitrary user input.
    // If a remote telemetry channel lands, ship `state.requestId` (a
    // non-PII correlation key) rather than the raw error.
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleHome = (): void => {
    // Hard nav so the boundary unmounts even if the throwing subtree is the
    // current route.
    window.location.assign('/');
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900">Something went wrong</h1>
          <p className="mt-3 text-sm text-gray-500">
            The page hit an unexpected error. Reloading usually fixes it.
          </p>

          {this.state.requestId && (
            <p className="mt-2 font-mono text-xs text-gray-400">
              Ref: {this.state.requestId}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={this.handleHome}
              className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
