import type {
  ReportSummary,
  OrdersByStatusEntry,
  RevenueEntry,
  RevenueAnalytics,
  ShipmentVolume,
  TopCustomer,
  DeliveryPerformance,
  StatusPipeline,
  PaymentBreakdown,
  ShipmentComparison,
} from '@/types';
import { apiGet } from '@/lib/apiClient';

/* ── helpers ────────────────────────────────────────────── */

function buildQs(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/* ── legacy (used by useReports hooks) ──────────────────── */

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
  const qs = buildQs(params);
  const response = await apiGet<{ success: boolean; data: RevenueEntry[] }>(
    `/reports/revenue${qs}`,
    token
  );
  return response.data;
}

/* ── new endpoints ──────────────────────────────────────── */

export async function getRevenueAnalytics(
  token: string,
  params: { groupBy?: string; compareToLastPeriod?: boolean; from?: string; to?: string } = {},
): Promise<RevenueAnalytics> {
  const qs = buildQs(params);
  const res = await apiGet<{ success: boolean; data: RevenueAnalytics }>(
    `/reports/revenue${qs}`,
    token,
  );
  return res.data;
}

export async function getShipmentVolume(
  token: string,
  params: { groupBy?: string; from?: string; to?: string } = {},
): Promise<ShipmentVolume> {
  const qs = buildQs(params);
  const res = await apiGet<{ success: boolean; data: ShipmentVolume }>(
    `/reports/shipment-volume${qs}`,
    token,
  );
  return res.data;
}

export async function getTopCustomers(
  token: string,
  params: { sortBy?: string; limit?: number } = {},
): Promise<TopCustomer[]> {
  const qs = buildQs(params);
  const res = await apiGet<{ success: boolean; data: TopCustomer[] }>(
    `/reports/top-customers${qs}`,
    token,
  );
  return res.data;
}

export async function getDeliveryPerformance(
  token: string,
  params: { from?: string; to?: string } = {},
): Promise<DeliveryPerformance> {
  const qs = buildQs(params);
  const res = await apiGet<{ success: boolean; data: DeliveryPerformance }>(
    `/reports/delivery-performance${qs}`,
    token,
  );
  return res.data;
}

export async function getStatusPipeline(
  token: string,
  params: { transportMode?: string } = {},
): Promise<StatusPipeline> {
  const qs = buildQs(params);
  const res = await apiGet<{ success: boolean; data: StatusPipeline }>(
    `/reports/status-pipeline${qs}`,
    token,
  );
  return res.data;
}

export async function getPaymentBreakdown(
  token: string,
  params: { from?: string; to?: string } = {},
): Promise<PaymentBreakdown> {
  const qs = buildQs(params);
  const res = await apiGet<{ success: boolean; data: PaymentBreakdown }>(
    `/reports/payment-breakdown${qs}`,
    token,
  );
  return res.data;
}

export async function getShipmentComparison(
  token: string,
  params: { from?: string; to?: string } = {},
): Promise<ShipmentComparison> {
  const qs = buildQs(params);
  const res = await apiGet<{ success: boolean; data: ShipmentComparison }>(
    `/reports/shipment-comparison${qs}`,
    token,
  );
  return res.data;
}
