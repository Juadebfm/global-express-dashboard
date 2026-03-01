import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Loader2,
  Plane,
  Ship,
  TrendingUp,
} from 'lucide-react';
import { useAuth, useDashboardData } from '@/hooks';
import { useReportSummary } from '@/hooks/useReports';
import { AppShell, PageHeader } from '@/pages/shared';
import { cn } from '@/utils';
import i18n from '@/i18n/i18n';
import {
  getRevenueAnalytics,
  getShipmentVolume,
  getTopCustomers,
  getDeliveryPerformance,
  getStatusPipeline,
  getPaymentBreakdown,
  getShipmentComparison,
} from '@/services';
import type {
  RevenueAnalytics,
  ShipmentVolume,
  TopCustomer,
  DeliveryPerformance,
  StatusPipeline,
  PaymentBreakdown,
  ShipmentComparison,
} from '@/types';

const TOKEN_KEY = 'globalxpress_token';

const BRAND = '#f97316';
const SEA_COLOR = '#3b82f6';
const PIE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

const PHASE_COLORS: Record<string, string> = {
  pre_transit: '#f59e0b',
  air_transit: '#3b82f6',
  sea_transit: '#06b6d4',
  lagos_processing: '#8b5cf6',
  terminal: '#10b981',
};

function getLocale(): string {
  return i18n.language === 'ko' ? 'ko-KR' : 'en-US';
}

function fmtPeriod(iso: unknown): string {
  if (typeof iso !== 'string') return String(iso ?? '');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(getLocale(), { month: 'short', year: '2-digit' });
}

function fmtUsd(val: string | number | null | undefined): string {
  if (val == null) return '$0';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (Number.isNaN(n)) return '$0';
  return `$${n.toLocaleString(getLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtNum(val: string | number | null | undefined): string {
  if (val == null) return '0';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (Number.isNaN(n)) return '0';
  return n.toLocaleString(getLocale(), { maximumFractionDigits: 1 });
}

// ── Component ───────────────────────────────────────────────

export function ReportsPage(): ReactElement {
  const { t } = useTranslation('reports');
  const { data, isLoading, error } = useDashboardData();
  const { data: summary, isLoading: summaryLoading } = useReportSummary();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdminPlus = user?.role === 'admin' || user?.role === 'superadmin';

  // Date range
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Report data
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [shipmentVol, setShipmentVol] = useState<ShipmentVolume | null>(null);
  const [topCust, setTopCust] = useState<TopCustomer[] | null>(null);
  const [deliveryPerf, setDeliveryPerf] = useState<DeliveryPerformance | null>(null);
  const [pipeline, setPipeline] = useState<StatusPipeline | null>(null);
  const [payBreakdown, setPayBreakdown] = useState<PaymentBreakdown | null>(null);
  const [shipComp, setShipComp] = useState<ShipmentComparison | null>(null);
  const [reportsLoading, setReportsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    setReportsLoading(true);
    const dateParams = {
      ...(dateFrom && { from: new Date(dateFrom).toISOString() }),
      ...(dateTo && { to: new Date(dateTo).toISOString() }),
    };

    try {
      const results = await Promise.allSettled([
        isSuperAdmin
          ? getRevenueAnalytics(token, { groupBy: 'month', compareToLastPeriod: true, ...dateParams })
          : Promise.resolve(null),
        isAdminPlus
          ? getShipmentVolume(token, { groupBy: 'month', ...dateParams })
          : Promise.resolve(null),
        isAdminPlus
          ? getTopCustomers(token, { sortBy: 'orderCount', limit: 10 })
          : Promise.resolve(null),
        isAdminPlus
          ? getDeliveryPerformance(token, dateParams)
          : Promise.resolve(null),
        isAdminPlus
          ? getStatusPipeline(token)
          : Promise.resolve(null),
        isSuperAdmin
          ? getPaymentBreakdown(token, dateParams)
          : Promise.resolve(null),
        isAdminPlus
          ? getShipmentComparison(token, dateParams)
          : Promise.resolve(null),
      ]);

      const val = <T,>(r: PromiseSettledResult<T | null>): T | null =>
        r.status === 'fulfilled' ? r.value : null;

      setRevenue(val(results[0]) as RevenueAnalytics | null);
      setShipmentVol(val(results[1]) as ShipmentVolume | null);
      setTopCust(val(results[2]) as TopCustomer[] | null);
      setDeliveryPerf(val(results[3]) as DeliveryPerformance | null);
      setPipeline(val(results[4]) as StatusPipeline | null);
      setPayBreakdown(val(results[5]) as PaymentBreakdown | null);
      setShipComp(val(results[6]) as ShipmentComparison | null);
    } finally {
      setReportsLoading(false);
    }
  }, [dateFrom, dateTo, isSuperAdmin, isAdminPlus]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const nairaFormatter = new Intl.NumberFormat('en-NG');

  return (
    <AppShell
      data={data}
      isLoading={isLoading || summaryLoading}
      error={error}
      loadingLabel={t('loading')}
    >
      <div className="space-y-6">
        {/* Header + date range */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageHeader title={t('pageTitle')} subtitle={t('subtitle')} />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
              />
              <span className="text-sm text-gray-400">{t('dateRange.to')}</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Loading overlay for report sections */}
        {reportsLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('loading')}
          </div>
        )}

        {/* ── KPI Summary Cards ───────────────────────────── */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label={t('kpis.totalOrders')} value={String(summary.totalOrders)} />
            <KpiCard label={t('kpis.totalUsers')} value={String(summary.totalUsers)} />
            {isSuperAdmin && (
              <KpiCard
                label={t('kpis.totalRevenue')}
                value={`${summary.currency === 'NGN' ? '₦' : summary.currency ?? '₦'} ${nairaFormatter.format(parseFloat(summary.totalRevenue || '0') || 0)}`}
              />
            )}
            {revenue?.comparison?.revenueChange && isSuperAdmin && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">{t('kpis.revenueChange')}</p>
                <div className="mt-2 flex items-center gap-2">
                  {revenue.comparison.revenueChange.direction === 'up' ? (
                    <ArrowUp className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <ArrowDown className="h-5 w-5 text-red-500" />
                  )}
                  <p
                    className={cn(
                      'text-2xl font-semibold',
                      revenue.comparison.revenueChange.direction === 'up'
                        ? 'text-emerald-600'
                        : 'text-red-600',
                    )}
                  >
                    {revenue.comparison.revenueChange.value}%
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-400">{t('kpis.vsPreviousPeriod')}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Revenue Chart (superadmin) ──────────────────── */}
        {isSuperAdmin && revenue && revenue.periods.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-500" />
              <h3 className="text-sm font-semibold text-gray-900">{t('revenueAnalytics.title')}</h3>
            </div>
            <div className="mt-2 flex gap-6 text-sm text-gray-500">
              <span>{t('revenueAnalytics.total', { value: fmtUsd(revenue.totals.totalRevenue) })}</span>
              <span>{t('revenueAnalytics.payments', { value: revenue.totals.totalPayments })}</span>
              <span>{t('revenueAnalytics.avgOrder', { value: fmtUsd(revenue.totals.avgOrderValue) })}</span>
            </div>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue.periods}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tickFormatter={fmtPeriod} tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => fmtUsd(v)} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v) => [fmtUsd(v as number), t('airVsSea.revenue')]}
                    labelFormatter={fmtPeriod}
                  />
                  <Bar dataKey="revenue" fill={BRAND} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Shipment Volume (admin+) ────────────────────── */}
        {isAdminPlus && shipmentVol && shipmentVol.periods.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900">{t('shipmentVolume.title')}</h3>
            <div className="mt-2 flex gap-6 text-sm text-gray-500">
              <span>{t('shipmentVolume.total', { value: shipmentVol.totals.totalShipments })}</span>
              <span className="flex items-center gap-1"><Plane className="h-3 w-3" /> {t('shipmentVolume.air', { value: shipmentVol.totals.airShipments })}</span>
              <span className="flex items-center gap-1"><Ship className="h-3 w-3" /> {t('shipmentVolume.sea', { value: shipmentVol.totals.seaShipments })}</span>
            </div>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shipmentVol.periods}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tickFormatter={fmtPeriod} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={fmtPeriod} />
                  <Legend />
                  <Bar dataKey="air" stackId="a" fill={BRAND} name={t('shipmentVolume.barLabelAir')} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="sea" stackId="a" fill={SEA_COLOR} name={t('shipmentVolume.barLabelSea')} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Two-column: Pipeline + Air vs Sea ───────────── */}
        {isAdminPlus && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Status Pipeline */}
            {pipeline && pipeline.pipeline.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="text-sm font-semibold text-gray-900">{t('statusPipeline.title')}</h3>
                <p className="mt-1 text-xs text-gray-400">
                  {t('statusPipeline.summary', { active: pipeline.totalActive, total: pipeline.totalAll })}
                </p>
                <div className="mt-4 space-y-2">
                  {pipeline.pipeline.map((entry) => (
                    <div key={entry.status} className="flex items-center gap-3">
                      <div className="w-36 truncate text-xs text-gray-600">{entry.label}</div>
                      <div className="flex-1">
                        <div className="h-5 w-full rounded-full bg-gray-100">
                          <div
                            className="flex h-5 items-center rounded-full px-2 text-[10px] font-semibold text-white"
                            style={{
                              width: `${Math.max(parseFloat(entry.percentage), 4)}%`,
                              backgroundColor: PHASE_COLORS[entry.phase] ?? '#94a3b8',
                            }}
                          >
                            {entry.count}
                          </div>
                        </div>
                      </div>
                      <span className="w-10 text-right text-xs text-gray-500">
                        {parseFloat(entry.percentage).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Air vs Sea Comparison */}
            {shipComp && shipComp.comparison.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="text-sm font-semibold text-gray-900">{t('airVsSea.title')}</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {shipComp.comparison.map((mode) => (
                    <div
                      key={mode.transportMode}
                      className={cn(
                        'rounded-xl border p-4',
                        mode.transportMode === 'air' ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {mode.transportMode === 'air' ? (
                          <Plane className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Ship className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="text-sm font-semibold capitalize text-gray-900">
                          {mode.transportMode}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>{t('airVsSea.orders')}</span>
                          <span className="font-semibold text-gray-900">{mode.orderCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('airVsSea.totalWeight')}</span>
                          <span className="font-semibold text-gray-900">{fmtNum(mode.totalWeight)} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('airVsSea.completion')}</span>
                          <span className="font-semibold text-gray-900">{parseFloat(mode.completionRate).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('airVsSea.avgDelivery')}</span>
                          <span className="font-semibold text-gray-900">{t('airVsSea.avgDeliveryValue', { value: fmtNum(mode.avgDeliveryDays) })}</span>
                        </div>
                        {isSuperAdmin && mode.totalRevenue && (
                          <div className="flex justify-between border-t border-gray-200 pt-1">
                            <span>{t('airVsSea.revenue')}</span>
                            <span className="font-semibold text-gray-900">{fmtUsd(mode.totalRevenue)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Two-column: Top Customers + Delivery Perf ──── */}
        {isAdminPlus && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Customers */}
            {topCust && topCust.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="text-sm font-semibold text-gray-900">{t('topCustomers.title')}</h3>
                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-[10px] font-semibold uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2">{t('topCustomers.columns.rank')}</th>
                        <th className="px-3 py-2">{t('topCustomers.columns.customer')}</th>
                        <th className="px-3 py-2 text-right">{t('topCustomers.columns.orders')}</th>
                        <th className="px-3 py-2 text-right">{t('topCustomers.columns.weight')}</th>
                        {isSuperAdmin && <th className="px-3 py-2 text-right">{t('topCustomers.columns.revenue')}</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {topCust.map((c, i) => (
                        <tr key={c.customerId} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2">
                            <p className="font-medium text-gray-900">{c.displayName}</p>
                            <p className="text-[10px] text-gray-400">{c.email}</p>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">{c.orderCount}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{fmtNum(c.totalWeight)} kg</td>
                          {isSuperAdmin && (
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {c.revenue ? fmtUsd(c.revenue) : '—'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Delivery Performance */}
            {deliveryPerf && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="text-sm font-semibold text-gray-900">{t('deliveryPerformance.title')}</h3>

                {/* KPI cards */}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-xl font-semibold text-gray-900">
                      {fmtNum(deliveryPerf.overall.avgDaysToDeliver)}
                    </p>
                    <p className="text-[10px] uppercase text-gray-500">{t('deliveryPerformance.avgDays')}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-xl font-semibold text-gray-900">
                      {fmtNum(deliveryPerf.overall.medianDaysToDeliver)}
                    </p>
                    <p className="text-[10px] uppercase text-gray-500">{t('deliveryPerformance.medianDays')}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-xl font-semibold text-gray-900">
                      {deliveryPerf.overall.totalDelivered}
                    </p>
                    <p className="text-[10px] uppercase text-gray-500">{t('deliveryPerformance.delivered')}</p>
                  </div>
                </div>

                {/* Air vs Sea breakdown */}
                <div className="mt-4 space-y-2">
                  {deliveryPerf.byTransportMode.map((m) => (
                    <div
                      key={m.transportMode}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {m.transportMode === 'air' ? (
                          <Plane className="h-3 w-3 text-orange-500" />
                        ) : (
                          <Ship className="h-3 w-3 text-blue-500" />
                        )}
                        <span className="capitalize font-medium text-gray-700">{m.transportMode}</span>
                      </div>
                      <div className="flex gap-4 text-gray-600">
                        <span>{t('deliveryPerformance.avgValue', { value: fmtNum(m.avgDaysToDeliver) })}</span>
                        <span>{t('deliveryPerformance.minValue', { value: fmtNum(m.minDays) })}</span>
                        <span>{t('deliveryPerformance.maxValue', { value: fmtNum(m.maxDays) })}</span>
                        <span className="font-semibold text-gray-900">{t('deliveryPerformance.doneCount', { count: m.totalDelivered })}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Monthly trend */}
                {deliveryPerf.byMonth.length > 0 && (
                  <div className="mt-4 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={deliveryPerf.byMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="period" tickFormatter={fmtPeriod} tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip labelFormatter={fmtPeriod} />
                        <Line
                          type="monotone"
                          dataKey="avgDaysToDeliver"
                          stroke={BRAND}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name={t('deliveryPerformance.lineLabel')}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Payment Breakdown (superadmin) ──────────────── */}
        {isSuperAdmin && payBreakdown && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900">{t('paymentBreakdown.title')}</h3>

            <div className="mt-4 grid gap-6 lg:grid-cols-3">
              {/* Donut — by type */}
              {payBreakdown.byType.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">{t('paymentBreakdown.byType')}</p>
                  <div className="mt-2 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={payBreakdown.byType}
                          dataKey="total"
                          nameKey="paymentType"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                        >
                          {payBreakdown.byType.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, name) => [v as number, name as string]} />
                        <Legend
                          wrapperStyle={{ fontSize: 11 }}
                          formatter={(val: string) => val.charAt(0).toUpperCase() + val.slice(1)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 space-y-1">
                    {payBreakdown.byType.map((pt) => (
                      <div key={pt.paymentType} className="flex items-center justify-between text-xs">
                        <span className="capitalize text-gray-600">{pt.paymentType}</span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            parseFloat(pt.successRate) >= 90
                              ? 'bg-emerald-50 text-emerald-700'
                              : parseFloat(pt.successRate) >= 70
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700',
                          )}
                        >
                          {t('paymentBreakdown.successRate', { value: parseFloat(pt.successRate).toFixed(0) })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By status */}
              {payBreakdown.byStatus.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">{t('paymentBreakdown.byStatus')}</p>
                  <div className="mt-2 space-y-2">
                    {payBreakdown.byStatus.map((s) => (
                      <div key={s.status} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                        <span className="capitalize font-medium text-gray-700">{s.status}</span>
                        <div className="flex gap-3 text-gray-600">
                          <span>{t('paymentBreakdown.paymentCount', { count: s.count })}</span>
                          <span className="font-semibold text-gray-900">{fmtUsd(s.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collection status */}
              {payBreakdown.collectionStatus.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">{t('paymentBreakdown.collectionStatus')}</p>
                  <div className="mt-2 space-y-2">
                    {payBreakdown.collectionStatus.map((c) => (
                      <div key={c.status} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                        <span className="text-gray-700">
                          {c.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase())}
                        </span>
                        <div className="flex gap-3 text-gray-600">
                          <span>{t('paymentBreakdown.orderCount', { count: c.orderCount })}</span>
                          <span className="font-semibold text-gray-900">{fmtUsd(c.totalCharge)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function KpiCard({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
