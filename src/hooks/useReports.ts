import { useQuery } from '@tanstack/react-query';
import type { ReportSummary, OrdersByStatusEntry, RevenueEntry } from '@/types';
import { getReportSummary, getOrdersByStatus, getRevenueReport } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Not authenticated');
  return token;
}

export function useReportSummary() {
  return useQuery<ReportSummary>({
    queryKey: ['reports', 'summary'],
    queryFn: () => getReportSummary(getToken()),
    staleTime: STALE_TIME.REAL_TIME,
  });
}

export function useOrdersByStatus() {
  return useQuery<OrdersByStatusEntry[]>({
    queryKey: ['reports', 'orders-by-status'],
    queryFn: () => getOrdersByStatus(getToken()),
    staleTime: STALE_TIME.REAL_TIME,
  });
}

export function useRevenueReport(params: { from?: string; to?: string } = {}) {
  return useQuery<RevenueEntry[]>({
    queryKey: ['reports', 'revenue', params],
    queryFn: () => getRevenueReport(getToken(), params),
    staleTime: STALE_TIME.REAL_TIME,
  });
}
