import type {
  DashboardData,
  ApiDashboardResponse,
  ApiDashboardStats,
  ApiTrend,
  ApiActiveDelivery,
  ActiveDelivery,
  KpiCard,
} from '@/types';
import type { User } from '@/types';
import { apiGet } from '@/lib/apiClient';
import { mockDashboardData } from '@/data';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatEtaFromIso(isoString: string | null): string {
  if (!isoString) return 'TBD';
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return 'Arrived';
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function etaMinutes(isoString: string | null): number {
  if (!isoString) return 0;
  return Math.max(0, Math.floor((new Date(isoString).getTime() - Date.now()) / 60_000));
}

function shipmentTypeToMode(type: ApiActiveDelivery['shipmentType']): ActiveDelivery['mode'] {
  if (type === 'ocean') return 'ship';
  if (type === 'road') return 'truck';
  return 'air';
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapTrends(trends: ApiTrend[]): DashboardData['charts']['shipmentTrends']['data'] {
  return trends.map((t) => ({
    month: MONTH_NAMES[t.month - 1] ?? String(t.month),
    deliveries: parseFloat(t.deliveredWeight) || 0,
    shipments: parseFloat(t.activeWeight) || 0,
  }));
}

function mapActiveDeliveries(items: ApiActiveDelivery[]): ActiveDelivery[] {
  return items.map((d, index) => {
    const commaIndex = d.destination.indexOf(',');
    const city = commaIndex >= 0 ? d.destination.slice(0, commaIndex).trim() : d.destination.trim();
    const state = commaIndex >= 0 ? d.destination.slice(commaIndex + 1).trim() : '';
    const mode = shipmentTypeToMode(d.shipmentType);
    const base = {
      id: `route-${index}`,
      location: { city, state, country: '' },
      activeShipments: d.activeCount,
      mode,
    };

    if (d.status === 'on_time') {
      return {
        ...base,
        status: 'on_time' as const,
        statusLabel: 'On time',
        eta: { display: formatEtaFromIso(d.nextEta), minutes: etaMinutes(d.nextEta) },
      };
    }
    if (d.status === 'delayed') {
      return {
        ...base,
        status: 'delayed' as const,
        statusLabel: 'Delayed',
        delay: { display: formatEtaFromIso(d.nextEta), minutes: etaMinutes(d.nextEta) },
      };
    }
    return { ...base, status: 'unknown' as const, statusLabel: 'Unknown' };
  });
}

function mapKpis(stats: ApiDashboardStats, role: User['role']): KpiCard[] {
  if (role === 'user') {
    const totalSpentNum = stats.totalSpent ? parseFloat(stats.totalSpent) : 0;
    const totalSpentDisplay = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(totalSpentNum);

    return [
      {
        id: 'totalOrders',
        title: 'All Shipments',
        value: stats.totalOrders,
        unit: null,
        helperText: 'Shipment available',
        change: stats.totalOrdersChange,
        status: 'good',
      },
      {
        id: 'pendingOrders',
        title: 'Pending Shipment',
        value: stats.pendingOrders,
        unit: null,
        helperText: 'Currently in transit',
        change: stats.pendingOrdersChange,
        status: stats.pendingOrders > 0 ? 'warning' : 'good',
      },
      {
        id: 'deliveredTotal',
        title: 'Delivered Shipment',
        value: stats.deliveredTotal,
        unit: null,
        helperText: 'Successful deliveries',
        change: stats.deliveredTotalChange,
        status: 'good',
      },
      {
        id: 'totalSpent',
        title: 'Total Spent',
        value: totalSpentNum,
        unit: 'USD',
        display: totalSpentDisplay,
        helperText: 'Your total payments',
        change: stats.totalSpentChange ?? null,
        status: 'good',
      },
    ];
  }

  // Operator / admin / superadmin
  const revenueMtdNum = stats.revenueMtd ? parseFloat(stats.revenueMtd) : 0;
  const revenueMtdDisplay = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(revenueMtdNum);

  return [
    {
      id: 'totalOrders',
      title: 'All Orders',
      value: stats.totalOrders,
      unit: null,
      helperText: 'Total orders globally',
      change: stats.totalOrdersChange,
      status: 'good',
    },
    {
      id: 'activeShipments',
      title: 'Active Shipments',
      value: stats.activeShipments,
      unit: null,
      helperText: 'Currently in transit',
      change: stats.activeShipmentsChange,
      status: 'good',
    },
    {
      id: 'pendingOrders',
      title: 'Pending Orders',
      value: stats.pendingOrders,
      unit: null,
      helperText: 'Awaiting processing',
      change: stats.pendingOrdersChange,
      status: stats.pendingOrders > 0 ? 'warning' : 'good',
    },
    {
      id: 'revenueMtd',
      title: 'Revenue (MTD)',
      value: revenueMtdNum,
      unit: 'USD',
      display: revenueMtdDisplay,
      helperText: 'Month to date',
      change: stats.revenueMtdChange ?? null,
      status: 'good',
    },
  ];
}

// ── Exports ───────────────────────────────────────────────────────────────────

export async function fetchDashboardRaw(
  token: string,
  year: number
): Promise<ApiDashboardResponse['data']> {
  const response = await apiGet<ApiDashboardResponse>(`/dashboard?year=${year}`, token);
  return response.data;
}

export function mapToDashboardData(
  raw: ApiDashboardResponse['data'],
  role: User['role']
): DashboardData {
  const base = mockDashboardData;
  return {
    ...base,
    kpis: mapKpis(raw.stats, role),
    charts: {
      shipmentTrends: {
        ...base.charts.shipmentTrends,
        legend: [
          { key: 'deliveries', label: 'Delivered' },
          { key: 'shipments', label: 'In Transit' },
        ],
        data: mapTrends(raw.trends),
      },
    },
    activeDeliveries: {
      title: 'Delivery Schedule',
      subtitle: 'Active delivery routes',
      items: mapActiveDeliveries(raw.activeDeliveries),
    },
  };
}

// Kept for backward compat — used while BE endpoint is not yet ready
export async function getDashboardData(): Promise<DashboardData> {
  return mockDashboardData;
}
