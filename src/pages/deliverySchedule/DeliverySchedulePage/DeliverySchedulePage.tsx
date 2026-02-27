import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { AlertBanner } from '@/components/ui';
import { useDashboardData, useSearch, useShipmentsDashboard } from '@/hooks';
import { AppShell, PageHeader } from '@/pages/shared';

import { getStatusStyle } from '@/lib/statusUtils';

function toTimestamp(value: string): number {
  const date = new Date(value);
  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DeliverySchedulePage(): ReactElement {
  const { data: dashboardData, isLoading, error } = useDashboardData();
  const {
    data: shipmentsData,
    isLoading: shipmentsLoading,
    error: shipmentsError,
  } = useShipmentsDashboard();
  const { query } = useSearch();

  const upcomingDeliveries = useMemo(() => {
    const rows = shipmentsData?.shipments ?? [];
    const normalizedQuery = query.trim().toLowerCase();

    return rows
      .filter((row) => row.status !== 'completed')
      .filter((row) => {
        if (!normalizedQuery) return true;
        const haystack = [
          row.sku,
          row.customer,
          row.origin,
          row.destination,
          row.status,
          row.mode,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => toTimestamp(a.etaDate) - toTimestamp(b.etaDate));
  }, [shipmentsData, query]);

  return (
    <AppShell
      data={dashboardData}
      isLoading={isLoading || shipmentsLoading}
      error={error}
      loadingLabel="Loading delivery schedule..."
    >
      <div className="space-y-6">
        <PageHeader
          title="Delivery Schedule"
          subtitle="Live upcoming deliveries powered by your shipment data."
        />

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Deliveries</h2>
              <p className="mt-1 text-sm text-gray-500">
                {upcomingDeliveries.length} deliver
                {upcomingDeliveries.length === 1 ? 'y' : 'ies'}
                {query.trim() ? ' match your search' : ' scheduled'}
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {shipmentsError && (
              <div className="px-5 py-6">
                <AlertBanner tone="error" message={shipmentsError} />
              </div>
            )}

            {!shipmentsError && upcomingDeliveries.length === 0 && (
              <div className="px-5 py-8">
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500">
                  {query.trim()
                    ? 'No delivery schedule items match your search.'
                    : 'No upcoming deliveries available yet.'}
                </div>
              </div>
            )}

            {!shipmentsError &&
              upcomingDeliveries.map((row) => (
                <article
                  key={row.id}
                  className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">{row.sku}</span>
                      {(() => {
                        const style = getStatusStyle(row.statusV2);
                        return (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.bgClass} ${style.textClass}`}
                          >
                            {row.statusLabel || row.status}
                          </span>
                        );
                      })()}
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-600">
                        {row.mode}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900">
                      {row.origin} to {row.destination}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Customer: {row.customer} · Packages: {row.packageCount}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span>Departure: {formatDate(row.departureDate)}</span>
                      <span>ETA: {formatDate(row.etaDate)}</span>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
