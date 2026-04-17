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
import i18n from '@/i18n/i18n';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function t(key: string): string {
  return i18n.t(key, { ns: 'dashboard' }) as string;
}

function formatEtaFromIso(isoString: string | null): string {
  if (!isoString) return t('activeDeliveries.tbd');
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return t('activeDeliveries.arrived');
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function etaMinutes(isoString: string | null): number {
  if (!isoString) return 0;
  return Math.max(0, Math.floor((new Date(isoString).getTime() - Date.now()) / 60_000));
}

function shipmentTypeToMode(type: ApiActiveDelivery['shipmentType']): ActiveDelivery['mode'] {
  if (type === 'ocean' || type === 'sea') return 'ship';
  return 'air';
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapTrends(trends: ApiTrend[]): DashboardData['charts']['shipmentTrends']['data'] {
  return trends.map((t) => ({
    month: MONTH_KEYS[t.month - 1] ? i18n.t(`months.${MONTH_KEYS[t.month - 1]}`, { ns: 'dashboard' }) as string : String(t.month),
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
        statusLabel: t('activeDeliveries.onTime'),
        eta: { display: formatEtaFromIso(d.nextEta), minutes: etaMinutes(d.nextEta) },
      };
    }
    if (d.status === 'delayed') {
      return {
        ...base,
        status: 'delayed' as const,
        statusLabel: t('activeDeliveries.delayed'),
        delay: { display: formatEtaFromIso(d.nextEta), minutes: etaMinutes(d.nextEta) },
      };
    }
    return { ...base, status: 'unknown' as const, statusLabel: t('activeDeliveries.unknown') };
  });
}

function mapKpis(stats: ApiDashboardStats, role: User['role']): KpiCard[] {
  if (role === 'user') {
    const totalShipping = stats.pendingOrders + stats.deliveredTotal;
    const totalSpentNum = stats.totalSpent ? parseFloat(stats.totalSpent) : 0;
    const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
    const totalSpentDisplay = `₦${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(totalSpentNum)}`;

    return [
      {
        id: 'totalShipping',
        title: t('kpis.customer.totalShipping'),
        value: totalShipping,
        unit: null,
        helperText: t('kpis.customer.totalShippingHelper'),
        change: null,
        status: 'good',
      },
      {
        id: 'totalSpent',
        title: t('kpis.customer.totalSpent'),
        value: totalSpentNum,
        unit: 'NGN',
        display: totalSpentDisplay,
        helperText: t('kpis.customer.totalSpentHelper'),
        change: stats.totalSpentChange ?? null,
        status: 'good',
      },
    ];
  }

  // Operator / admin / superadmin
  const kpis: KpiCard[] = [
    {
      id: 'totalOrders',
      title: t('kpis.operator.allOrders'),
      value: stats.totalOrders,
      unit: null,
      helperText: t('kpis.operator.allOrdersHelper'),
      change: stats.totalOrdersChange,
      status: 'good',
    },
    {
      id: 'activeShipments',
      title: t('kpis.operator.activeShipments'),
      value: stats.activeShipments,
      unit: null,
      helperText: t('kpis.operator.activeShipmentsHelper'),
      change: stats.activeShipmentsChange,
      status: 'good',
    },
    {
      id: 'pendingOrders',
      title: t('kpis.operator.pendingOrders'),
      value: stats.pendingOrders,
      unit: null,
      helperText: t('kpis.operator.pendingOrdersHelper'),
      change: stats.pendingOrdersChange,
      status: stats.pendingOrders > 0 ? 'warning' : 'good',
    },
  ];

  // Revenue is superadmin-only — the backend omits it for other roles
  if (role === 'superadmin' && stats.revenueMtd) {
    const revenueMtdNum = parseFloat(stats.revenueMtd);
    const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
    const revenueMtdDisplay = `₦${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(revenueMtdNum)}`;
    kpis.push({
      id: 'revenueMtd',
      title: t('kpis.operator.revenueMtd'),
      value: revenueMtdNum,
      unit: 'NGN',
      display: revenueMtdDisplay,
      helperText: t('kpis.operator.revenueMtdHelper'),
      change: stats.revenueMtdChange ?? null,
      status: 'good',
    });
  }

  return kpis;
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
  const isOperator = role === 'staff' || role === 'admin' || role === 'superadmin';

  return {
    app: {
      name: 'GlobalExpress',
      module: 'Dashboard',
      pageTitle: t('pageTitle'),
      subtitle: t('subtitle'),
      generatedAt: new Date().toISOString(),
    },
    user: { displayName: '', email: '', avatarUrl: '/images/favicon.svg' },
    ui: {
      topbar: { searchPlaceholder: t('searchPlaceholder'), notifications: { unreadCount: 0 } },
      actions: isOperator
        ? [
            { id: 'trackShipment', label: t('actions.trackClientShipment'), icon: 'tracking' },
            { id: 'newOrder', label: t('actions.createClientOrder'), icon: 'plus' },
          ]
        : [
            { id: 'trackShipment', label: t('actions.trackShipment'), icon: 'tracking' },
            { id: 'newOrder', label: t('actions.requestNewShipment'), icon: 'plus' },
          ],
      sidebar: { items: [], footer: { items: [] } },
    },
    kpis: mapKpis(raw.stats, role),
    charts: {
      shipmentTrends: {
        title: t('charts.shipmentTrends'),
        subtitle: t('charts.shipmentTrendsSubtitle'),
        xAxis: { type: 'category', key: 'month', label: t('charts.xAxisLabel') },
        yAxis: { type: 'number', key: 'value', label: t('charts.yAxisLabel') },
        legend: [
          { key: 'deliveries', label: t('charts.delivered') },
          { key: 'shipments', label: t('charts.inTransit') },
        ],
        data: mapTrends(raw.trends),
      },
    },
    activeDeliveries: {
      title: t('activeDeliveries.title'),
      subtitle: t('activeDeliveries.subtitle'),
      items: mapActiveDeliveries(raw.activeDeliveries),
    },
    formatting: {
      currency: { code: 'NGN', locale: 'en-NG' },
      numberCompact: false,
      timeZone: 'UTC',
    },
  };
}
