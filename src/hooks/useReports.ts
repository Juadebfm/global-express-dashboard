import { useQuery } from '@tanstack/react-query';
import type { ReportSummary, OrdersByStatusEntry, RevenueEntry } from '@/types';
import { getReportSummary, getOrdersByStatus, getRevenueReport } from '@/services';

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
  });
}

export function useOrdersByStatus() {
  return useQuery<OrdersByStatusEntry[]>({
    queryKey: ['reports', 'orders-by-status'],
    queryFn: () => getOrdersByStatus(getToken()),
  });
}

export function useRevenueReport(params: { from?: string; to?: string } = {}) {
  return useQuery<RevenueEntry[]>({
    queryKey: ['reports', 'revenue', params],
    queryFn: () => getRevenueReport(getToken(), params),
  });
}
