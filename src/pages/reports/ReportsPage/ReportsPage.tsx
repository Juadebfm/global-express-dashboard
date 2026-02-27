import type { ReactElement } from 'react';
import { useDashboardData } from '@/hooks';
import { useReportSummary, useOrdersByStatus } from '@/hooks/useReports';
import { AppShell, PageHeader } from '@/pages/shared';

export function ReportsPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { data: summary, isLoading: summaryLoading } = useReportSummary();
  const { data: statusBreakdown, isLoading: statusLoading } = useOrdersByStatus();

  const nairaFormatter = new Intl.NumberFormat('en-NG');

  return (
    <AppShell
      data={data}
      isLoading={isLoading || summaryLoading || statusLoading}
      error={error}
      loadingLabel="Loading reports..."
    >
      <div className="space-y-6">
        <PageHeader title="Reports" subtitle="Business analytics and insights." />

        {summary && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{summary.totalOrders}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{summary.totalUsers}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {summary.currency === 'NGN' ? '₦' : summary.currency}{' '}
                {nairaFormatter.format(parseFloat(summary.totalRevenue) || 0)}
              </p>
            </div>
          </div>
        )}

        {statusBreakdown && statusBreakdown.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900">Orders by Status</h3>
            <div className="mt-4 space-y-2">
              {statusBreakdown.map((entry) => (
                <div key={entry.statusV2} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {entry.statusV2.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="font-semibold text-gray-900">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
