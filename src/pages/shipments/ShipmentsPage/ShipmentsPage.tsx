import type { ReactElement } from 'react';
import { useDashboardData, useSearch } from '@/hooks';
import { AppShell, PageHeader, PagePlaceholder, type PlaceholderItem } from '@/pages/shared';

const shipmentItems: PlaceholderItem[] = [
  {
    id: 'ship-1',
    title: 'Shanghai → Lagos',
    subtitle: 'Container GX-2011 · In transit',
    tag: 'In transit',
  },
  {
    id: 'ship-2',
    title: 'Seoul → Accra',
    subtitle: 'Airway GX-1882 · Delayed',
    tag: 'Delayed',
  },
  {
    id: 'ship-3',
    title: 'Shenzhen → Tema',
    subtitle: 'Vessel GX-1450 · On time',
    tag: 'On time',
  },
];

export function ShipmentsPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading shipments...">
      <div className="space-y-6">
        <PageHeader
          title="Shipments"
          subtitle="Track live logistics activity across regions."
        />
        <PagePlaceholder
          title="Recent Shipments"
          description="Overview of the latest shipments currently in the network."
          items={shipmentItems}
          query={query}
          emptyLabel="No shipments match your search."
        />
      </div>
    </AppShell>
  );
}
