import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useSearch } from '@/hooks';
import type { ActiveDelivery, DashboardData, KpiCard } from '@/types';
import { getDashboardData } from '@/services';
import {
  ActiveDeliveries,
  DashboardHeader,
  KpiGrid,
  SecondaryStatsGrid,
  ShipmentTrendsChart,
} from '../components';

export function DashboardPage(): ReactElement {
  const { query } = useSearch();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getDashboardData()
      .then((response) => {
        if (isMounted) {
          setData(response);
          setError(null);
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard';
        if (isMounted) {
          setError(message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-red-600">
          {error ?? 'Dashboard data unavailable.'}
        </div>
      </div>
    );
  }

  return (
    <AppLayout ui={data.ui} user={data.user}>
      <div className="space-y-8">
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
      </div>
    </AppLayout>
  );
}
