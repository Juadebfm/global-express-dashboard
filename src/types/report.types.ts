/* Legacy types (used by useReports hooks) */
export interface ReportSummary {
  totalOrders: number;
  totalUsers: number;
  totalRevenue: string;
  currency: string;
}

export interface OrdersByStatusEntry {
  statusV2: string;
  count: number;
}

export interface RevenueEntry {
  date: string;
  revenue: string;
}

/* ── Revenue Analytics ──────────────────────────────────── */

export interface RevenuePeriod {
  period: string;
  revenue: string;
  paymentCount: number;
  avgOrderValue: string;
}

export interface RevenueAnalytics {
  periods: RevenuePeriod[];
  totals: {
    totalRevenue: string;
    totalPayments: number;
    avgOrderValue: string;
  };
  comparison?: {
    previousRevenue: string;
    previousPayments: number;
    revenueChange: { value: number; direction: 'up' | 'down' };
  };
}

/* ── Shipment Volume ────────────────────────────────────── */

export interface ShipmentVolumePeriod {
  period: string;
  total: number;
  air: number;
  sea: number;
  totalWeight: string;
  airWeight: string;
  seaWeight: string;
}

export interface ShipmentVolume {
  periods: ShipmentVolumePeriod[];
  totals: {
    totalShipments: number;
    airShipments: number;
    seaShipments: number;
    totalWeight: string;
    airWeight: string;
    seaWeight: string;
  };
}

/* ── Top Customers ──────────────────────────────────────── */

export interface TopCustomer {
  customerId: string;
  displayName: string;
  email: string;
  orderCount: number;
  totalWeight: string;
  avgWeight: string;
  revenue?: string; // superadmin only
}

/* ── Delivery Performance ───────────────────────────────── */

export interface DeliveryPerformanceMode {
  transportMode: string;
  avgDaysToDeliver: string;
  medianDaysToDeliver: string;
  totalDelivered: number;
  minDays: string;
  maxDays: string;
}

export interface DeliveryPerformanceMonth {
  period: string;
  avgDaysToDeliver: string;
  totalDelivered: number;
}

export interface DeliveryPerformance {
  overall: {
    avgDaysToDeliver: string;
    medianDaysToDeliver: string;
    totalDelivered: number;
  };
  byTransportMode: DeliveryPerformanceMode[];
  byMonth: DeliveryPerformanceMonth[];
}

/* ── Status Pipeline ────────────────────────────────────── */

export interface PipelineEntry {
  status: string;
  label: string;
  count: number;
  percentage: string;
  phase: string;
}

export interface StatusPipeline {
  pipeline: PipelineEntry[];
  totalActive: number;
  totalAll: number;
}

/* ── Payment Breakdown ──────────────────────────────────── */

export interface PaymentTypeEntry {
  paymentType: string;
  total: number;
  successful: number;
  failed: number;
  pending: number;
  abandoned: number;
  successRate: string;
  totalAmount: string;
}

export interface PaymentStatusEntry {
  status: string;
  count: number;
  amount: string;
}

export interface CollectionStatusEntry {
  status: string;
  orderCount: number;
  totalCharge: string;
}

export interface PaymentBreakdown {
  byType: PaymentTypeEntry[];
  byStatus: PaymentStatusEntry[];
  collectionStatus: CollectionStatusEntry[];
}

/* ── Shipment Comparison (Air vs Sea) ───────────────────── */

export interface ShipmentComparisonEntry {
  transportMode: string;
  orderCount: number;
  totalWeight: string;
  avgWeight: string;
  totalRevenue?: string; // superadmin only
  avgRevenue?: string;   // superadmin only
  completedCount: number;
  cancelledCount: number;
  completionRate: string;
  avgDeliveryDays: string;
}

export interface ShipmentComparison {
  comparison: ShipmentComparisonEntry[];
}
