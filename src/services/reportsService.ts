import type {
  ReportSummary,
  RevenueEntry,
  RevenueAnalytics,
  ShipmentVolume,
  TopCustomer,
  DeliveryPerformance,
  StatusPipeline,
  PaymentBreakdown,
  ShipmentComparison,
  AuditLogFilters,
  AuditLogsResponse,
} from '@/types';
import { apiGetData } from '@/lib/apiClient';

/* ── helpers ────────────────────────────────────────────── */

function buildQs(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/* ── retained summary endpoint ──────────────────────────── */

export function getReportSummary(token: string): Promise<ReportSummary> {
  return apiGetData<ReportSummary>('/reports/summary', token);
}

export function getRevenueReport(
  token: string,
  params: { from?: string; to?: string } = {}
): Promise<RevenueEntry[]> {
  return apiGetData<RevenueEntry[]>(`/reports/revenue${buildQs(params)}`, token);
}

/* ── new endpoints ──────────────────────────────────────── */

export function getRevenueAnalytics(
  token: string,
  params: { groupBy?: string; compareToLastPeriod?: boolean; from?: string; to?: string } = {},
): Promise<RevenueAnalytics> {
  return apiGetData<RevenueAnalytics>(`/reports/revenue${buildQs(params)}`, token);
}

export function getShipmentVolume(
  token: string,
  params: { groupBy?: string; from?: string; to?: string } = {},
): Promise<ShipmentVolume> {
  return apiGetData<ShipmentVolume>(`/reports/shipment-volume${buildQs(params)}`, token);
}

export function getTopCustomers(
  token: string,
  params: { sortBy?: string; limit?: number } = {},
): Promise<TopCustomer[]> {
  return apiGetData<TopCustomer[]>(`/reports/top-customers${buildQs(params)}`, token);
}

export function getDeliveryPerformance(
  token: string,
  params: { from?: string; to?: string } = {},
): Promise<DeliveryPerformance> {
  return apiGetData<DeliveryPerformance>(`/reports/delivery-performance${buildQs(params)}`, token);
}

export function getStatusPipeline(
  token: string,
  params: { transportMode?: string } = {},
): Promise<StatusPipeline> {
  return apiGetData<StatusPipeline>(`/reports/status-pipeline${buildQs(params)}`, token);
}

export function getPaymentBreakdown(
  token: string,
  params: { from?: string; to?: string } = {},
): Promise<PaymentBreakdown> {
  return apiGetData<PaymentBreakdown>(`/reports/payment-breakdown${buildQs(params)}`, token);
}

export function getShipmentComparison(
  token: string,
  params: { from?: string; to?: string } = {},
): Promise<ShipmentComparison> {
  return apiGetData<ShipmentComparison>(`/reports/shipment-comparison${buildQs(params)}`, token);
}

export function getAuditLogs(
  token: string,
  params: AuditLogFilters = {},
): Promise<AuditLogsResponse> {
  return apiGetData<AuditLogsResponse>(`/reports/audit-logs${buildQs(params as Record<string, string | number | boolean | undefined>)}`, token);
}
