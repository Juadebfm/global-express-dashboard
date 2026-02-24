import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch, useDashboardData, useShipmentsDashboard } from '@/hooks';
import type { ActiveDelivery, KpiCard, UiAction } from '@/types';
import {
  ActiveDeliveries,
  DashboardHeader,
  DashboardShipmentList,
  KpiGrid,
  ShipmentTrendsChart,
} from '../components';
import { AppShell } from '@/pages/shared';
import { ROUTES } from '@/constants';

export function DashboardPage(): ReactElement {
  const { query } = useSearch();
  const { data, isLoading, error } = useDashboardData();
  const { data: shipmentsData } = useShipmentsDashboard();
  const navigate = useNavigate();

  const normalizedQuery = query.trim().toLowerCase();

  const filteredKpis = useMemo((): KpiCard[] => {
    if (!data) return [];
    if (normalizedQuery.length === 0) return data.kpis;
    return data.kpis.filter(
      (item) =>
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.helperText.toLowerCase().includes(normalizedQuery)
    );
  }, [data, normalizedQuery]);

  const filteredDeliveries = useMemo((): ActiveDelivery[] => {
    if (!data) return [];
    if (normalizedQuery.length === 0) return data.activeDeliveries.items;
    return data.activeDeliveries.items.filter((item) => {
      const location = `${item.location.city} ${item.location.state}`;
      return (
        location.toLowerCase().includes(normalizedQuery) ||
        item.statusLabel.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [data, normalizedQuery]);

  const filteredShipments = useMemo(() => {
    const all = shipmentsData?.shipments ?? [];
    if (normalizedQuery.length === 0) return all;
    return all.filter(
      (s) =>
        s.sku.toLowerCase().includes(normalizedQuery) ||
        s.customer.toLowerCase().includes(normalizedQuery) ||
        s.origin.toLowerCase().includes(normalizedQuery) ||
        s.destination.toLowerCase().includes(normalizedQuery)
    );
  }, [shipmentsData, normalizedQuery]);

  const handleAction = (action: UiAction): void => {
    if (action.id === 'trackShipment') navigate(ROUTES.SHIPMENT_TRACK);
  };

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading dashboard...">
      <div className="space-y-8">
        {data && (
          <>
            <DashboardHeader
              title={data.app.pageTitle}
              subtitle={data.app.subtitle}
              actions={data.ui.actions}
              onAction={handleAction}
            />

            <section>
              <KpiGrid items={filteredKpis} emptyLabel="No matching KPIs found." />
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
              <ShipmentTrendsChart chart={data.charts.shipmentTrends} />
              <ActiveDeliveries
                title={data.activeDeliveries.title}
                subtitle={data.activeDeliveries.subtitle}
                items={filteredDeliveries}
                emptyLabel="No matching deliveries found."
              />
            </section>

            <section>
              <DashboardShipmentList shipments={filteredShipments} />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
