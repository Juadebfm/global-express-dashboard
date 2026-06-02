import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getFileScanStatus } from '@/services';
import {
  TERMINAL_FILE_SCAN_STATUSES,
  type FileScanStatusResult,
} from '@/types';
import { useAuthToken } from './useAuthToken';

const POLL_INTERVAL_MS = 10_000;
const TERMINAL_STALE_MS = 30_000;

/**
 * Polls /internal/file-scans/status for a single r2Key. While the status is
 * `pending`, the hook polls every 10s. Once a terminal status arrives
 * (clean / malicious / error / skipped) polling stops and the result is
 * cached for 30s — file viewers don't need to re-fetch a clean file every
 * time they render.
 *
 * Pass `enabled=false` to defer the call (e.g. don't even ask the BE about
 * a file the staff hasn't tried to open yet).
 */
export function useFileScanStatus(
  r2Key: string | null | undefined,
  options: { enabled?: boolean } = {},
): UseQueryResult<FileScanStatusResult, Error> {
  const getToken = useAuthToken();
  const enabled = (options.enabled ?? true) && Boolean(r2Key);

  return useQuery<FileScanStatusResult, Error>({
    queryKey: ['file-scan', r2Key],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      // The hook only ever runs when r2Key is set (guarded by `enabled`).
      return getFileScanStatus(token, r2Key as string);
    },
    enabled,
    staleTime: TERMINAL_STALE_MS,
    // Polling: TanStack treats a function-typed refetchInterval as "ask me
    // on every tick whether to keep polling, given the latest query state".
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL_FILE_SCAN_STATUSES.includes(status)) return false;
      return POLL_INTERVAL_MS;
    },
    // Don't poll while the tab is hidden — the user can't see the viewer
    // anyway, and a malicious/clean transition will be picked up on focus.
    refetchIntervalInBackground: false,
  });
}
