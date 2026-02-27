import type { ReportSummary, OrdersByStatusEntry, RevenueEntry } from '@/types';
import { apiGet } from '@/lib/apiClient';

export async function getReportSummary(token: string): Promise<ReportSummary> {
  const response = await apiGet<{ success: boolean; data: ReportSummary }>(
    '/reports/summary',
    token
  );
  return response.data;
}

export async function getOrdersByStatus(token: string): Promise<OrdersByStatusEntry[]> {
  const response = await apiGet<{ success: boolean; data: OrdersByStatusEntry[] }>(
    '/reports/orders/by-status',
    token
  );
  return response.data;
}

export async function getRevenueReport(
  token: string,
  params: { from?: string; to?: string } = {}
): Promise<RevenueEntry[]> {
  const searchParams = new URLSearchParams();
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);
  const qs = searchParams.toString();
  const response = await apiGet<{ success: boolean; data: RevenueEntry[] }>(
    `/reports/revenue${qs ? `?${qs}` : ''}`,
    token
  );
  return response.data;
}
