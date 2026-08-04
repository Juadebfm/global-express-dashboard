import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './apiClient';

/**
 * A 401/403 is an authorization answer, not a transient failure. Retrying one
 * delays the fail-closed state, doubles the audit-log noise the backend writes
 * on a capability denial, and — for `CAPABILITY_REQUIRED` — directly violates
 * the contract's "do not automatically retry" rule.
 *
 * A 404 is equally definitive: the record does not exist, so asking again only
 * delays telling the user that.
 *
 * Other statuses keep the previous single retry.
 */
const NON_RETRYABLE_STATUSES = new Set([401, 403, 404]);

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && NON_RETRYABLE_STATUSES.has(error.status)) return false;
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
  },
});
