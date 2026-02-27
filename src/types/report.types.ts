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
