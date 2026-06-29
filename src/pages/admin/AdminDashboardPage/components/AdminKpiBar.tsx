import type { ReactElement } from 'react';
import { useShipmentsDashboard } from '@/hooks';
import type { KpiCard } from '@/types';
import { cn } from '@/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  loading?: boolean;
  accent?: boolean;
}

function StatCard({ label, value, loading = false, accent = false }: StatCardProps): ReactElement {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      {loading ? (
        <div className="mt-2.5 h-7 w-24 animate-pulse rounded-lg bg-gray-100" />
      ) : (
        <p className={cn('mt-2 text-2xl font-semibold', accent ? 'text-brand-500' : 'text-gray-900')}>
          {value}
        </p>
      )}
    </div>
  );
}

interface AdminKpiBarProps {
  kpis: KpiCard[];
}

export function AdminKpiBar({ kpis }: AdminKpiBarProps): ReactElement {
  // Fetch with a high limit so weight/items cover the full dataset
  const { data: shipmentsData, isLoading: shipmentsLoading } = useShipmentsDashboard({
    page: 1,
    limit: 100,
  });

  const shipments = shipmentsData?.shipments ?? [];
  const totalWeight = shipments.reduce((sum, s) => sum + s.weightKg, 0);
  const totalItems = shipments.reduce((sum, s) => sum + s.packageCount, 0);

  // KPI cards from the server (already role-scoped), plus two computed metrics
  const totalCards = kpis.length + 2;
  const colsClass =
    totalCards <= 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : totalCards === 5
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';

  return (
    <div className={cn('grid gap-4', colsClass)}>
      {kpis.map((kpi) => (
        <StatCard
          key={kpi.id}
          label={kpi.title}
          value={kpi.display ?? kpi.value}
        />
      ))}
      <StatCard
        label="Total Weight"
        value={shipmentsLoading ? '' : `${totalWeight.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`}
        loading={shipmentsLoading}
      />
      <StatCard
        label="Total Items"
        value={shipmentsLoading ? '' : totalItems}
        loading={shipmentsLoading}
      />
    </div>
  );
}
