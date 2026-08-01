import { useQuery } from '@tanstack/react-query';
import type { ReportSummary, RevenueEntry } from '@/types';
import { getReportSummary, getRevenueReport } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useCapability } from './usePermissions';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Not authenticated');
  return token;
}

// Both /reports/summary and /reports/revenue sit behind
// requireCapability('finance.reports.view'). Gating the query itself — not
// just the component that renders it — is what the contract asks for: the
// request belongs behind the capability check, so a user without the grant
// never fires a call that would 403 and trip the denial handler.
export function useReportSummary() {
  const canViewFinance = useCapability('finance.reports.view');
  return useQuery<ReportSummary>({
    queryKey: ['reports', 'summary'],
    queryFn: () => getReportSummary(getToken()),
    enabled: canViewFinance,
    staleTime: STALE_TIME.REAL_TIME,
  });
}

export function useRevenueReport(params: { from?: string; to?: string } = {}) {
  const canViewFinance = useCapability('finance.reports.view');
  return useQuery<RevenueEntry[]>({
    queryKey: ['reports', 'revenue', params],
    queryFn: () => getRevenueReport(getToken(), params),
    enabled: canViewFinance,
    staleTime: STALE_TIME.REAL_TIME,
  });
}
