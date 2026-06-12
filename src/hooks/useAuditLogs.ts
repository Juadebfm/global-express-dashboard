import { useQuery } from '@tanstack/react-query';
import type { AuditLogFilters, AuditLogsResponse } from '@/types';
import { getAuditLogs } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useAuthToken } from './useAuthToken';

export function useAuditLogs(filters: AuditLogFilters = {}) {
  const getToken = useAuthToken();

  return useQuery<AuditLogsResponse>({
    queryKey: ['reports', 'audit-logs', filters],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getAuditLogs(token, filters);
    },
    staleTime: STALE_TIME.REAL_TIME,
    placeholderData: (prev) => prev,
  });
}
