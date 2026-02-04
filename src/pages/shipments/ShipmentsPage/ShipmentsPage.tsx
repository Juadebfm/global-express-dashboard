import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { AppShell } from '@/pages/shared';
import { useDashboardData, useSearch, useShipmentsDashboard } from '@/hooks';
import type { ShipmentFilterTab, ShipmentRecord } from '@/types';
import { ShipmentsFilters, ShipmentsHeader, ShipmentsSummary, ShipmentsTable } from '../components';
import { PageLoader } from '@/components/ui';

const matchesQuery = (shipment: ShipmentRecord, query: string): boolean => {
  if (!query) return true;
  const haystack = [
    shipment.sku,
    shipment.customer,
    shipment.origin,
    shipment.destination,
    shipment.status,
    shipment.mode,
    shipment.priority,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
};

export function ShipmentsPage(): ReactElement {
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } =
    useDashboardData();
  const { data: shipmentsData, isLoading: isShipmentsLoading, error: shipmentsError } =
    useShipmentsDashboard();
  const { query } = useSearch();
  const [activeFilter, setActiveFilter] = useState<ShipmentFilterTab['value']>('all');

  const filteredShipments = useMemo(() => {
    if (!shipmentsData) return [];

    return shipmentsData.shipments.filter((shipment) => {
      const matchesStatus =
        activeFilter === 'all' ? true : shipment.status === activeFilter;
      return matchesStatus && matchesQuery(shipment, query.trim());
    });
  }, [shipmentsData, activeFilter, query]);

  return (
    <AppShell
      data={dashboardData}
      isLoading={isDashboardLoading}
      error={dashboardError}
      loadingLabel="Loading shipments..."
    >
      <div className="space-y-6">
        {shipmentsData ? (
          <>
            <ShipmentsHeader
              title={shipmentsData.header.title}
              subtitle={shipmentsData.header.subtitle}
            />

            <ShipmentsSummary
              overview={shipmentsData.summary.overview}
              metrics={shipmentsData.summary.metrics}
            />

            <ShipmentsFilters
              filters={shipmentsData.filters}
              active={activeFilter}
              onChange={setActiveFilter}
            />

            <ShipmentsTable
              title={shipmentsData.table.title}
              items={filteredShipments}
            />
          </>
        ) : isShipmentsLoading ? (
          <PageLoader label="Loading shipment list..." />
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
            {shipmentsError ?? 'Shipment data unavailable.'}
          </div>
        )}
      </div>
    </AppShell>
  );
}
