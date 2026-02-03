import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useSearch, useDashboardData } from '@/hooks';
import type { ActiveDelivery, KpiCard } from '@/types';
import {
  ActiveDeliveries,
  DashboardHeader,
  KpiGrid,
  SecondaryStatsGrid,
  ShipmentTrendsChart,
} from '../components';
import { AppShell } from '@/pages/shared';

export function DashboardPage(): ReactElement {
  const { query } = useSearch();
  const { data, isLoading, error } = useDashboardData();

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

  const filteredSecondaryStats = useMemo((): KpiCard[] => {
    if (!data) return [];
    if (normalizedQuery.length === 0) return data.secondaryStats;
    return data.secondaryStats.filter(
      (item) =>
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.helperText.toLowerCase().includes(normalizedQuery)
    );
  }, [data, normalizedQuery]);

  const filteredDeliveries = useMemo((): ActiveDelivery[] => {
    if (!data) return [];
    if (normalizedQuery.length === 0) return data.activeDeliveries.items;
    return data.activeDeliveries.items.filter((item) => {
      const location = `${item.location.city} ${item.location.state} ${item.location.country}`;
      return (
        location.toLowerCase().includes(normalizedQuery) ||
        item.statusLabel.toLowerCase().includes(normalizedQuery) ||
        String(item.activeShipments).includes(normalizedQuery)
      );
    });
  }, [data, normalizedQuery]);

  return (
    <AppShell
      data={data}
      isLoading={isLoading}
      error={error}
      loadingLabel="Loading dashboard..."
    >
      <div className="space-y-8">
        {data && (
          <>
            <DashboardHeader
              title={data.app.pageTitle}
              subtitle={data.app.subtitle}
              actions={data.ui.actions}
            />

            <section>
              <KpiGrid items={filteredKpis} emptyLabel="No matching KPIs found." />
            </section>

            <section>
              <SecondaryStatsGrid
                items={filteredSecondaryStats}
                emptyLabel="No matching secondary stats found."
              />
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
          </>
        )}
      </div>
    </AppShell>
  );
}
