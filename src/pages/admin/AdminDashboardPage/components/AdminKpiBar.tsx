import type { ReactElement } from 'react';
import { Clock, DollarSign, Layers, Package, Scale, Truck, type LucideIcon } from 'lucide-react';
import { useShipmentsDashboard } from '@/hooks';
import type { KpiCard } from '@/types';
import { cn } from '@/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  'all orders': Package,
  'active shipments': Truck,
  'pending orders': Clock,
  'revenue (mtd)': DollarSign,
  'total weight': Scale,
  'total items': Layers,
};

function getIcon(title: string): LucideIcon {
  return ICON_MAP[title.toLowerCase()] ?? Package;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  loading?: boolean;
  accent?: boolean;
}

function StatCard({ label, value, icon: Icon, loading = false, accent = false }: StatCardProps): ReactElement {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
        <Icon className="h-4 w-4 text-gray-700" strokeWidth={1.75} />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      {loading ? (
        <div className="mt-1.5 h-7 w-20 animate-pulse rounded-lg bg-gray-100" />
      ) : (
        <p className={cn('mt-1 text-2xl font-semibold', accent ? 'text-brand-500' : 'text-gray-900')}>
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
  const { data: shipmentsData, isLoading: shipmentsLoading } = useShipmentsDashboard({
    page: 1,
    limit: 100,
  });

  const shipments = shipmentsData?.shipments ?? [];
  const totalWeight = shipments.reduce((sum, s) => sum + s.weightKg, 0);
  const totalItems = shipments.reduce((sum, s) => sum + s.packageCount, 0);

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
          icon={getIcon(kpi.title)}
        />
      ))}
      <StatCard
        label="Total Weight"
        icon={Scale}
        value={shipmentsLoading ? '' : `${totalWeight.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`}
        loading={shipmentsLoading}
      />
      <StatCard
        label="Total Items"
        icon={Layers}
        value={shipmentsLoading ? '' : totalItems}
        loading={shipmentsLoading}
      />
    </div>
  );
}
