import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
}

/**
 * Last-resort error boundary wrapping the route tree. apiClient errors are
 * caught inside mutations and toasted; this boundary exists for the rarer
 * case of a render-time exception (a component throwing on a bad prop, a
 * lazy-import network failure, etc.) so the app shows a friendly fallback
 * instead of going blank.
 *
 * Resets state via "Reload" (full page refresh — also re-runs lazy chunks
 * that failed to load) or "Go home" (hard nav to /, which unmounts the
 * thrown subtree).
 */
export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Intentionally no remote logging here — the audit forbids logging PII to
    // any sink, and a thrown Error's message can carry arbitrary user input.
    // If a request-ID telemetry channel is added later, surface it here.
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
