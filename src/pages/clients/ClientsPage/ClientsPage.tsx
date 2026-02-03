import type { ReactElement } from 'react';
import { useDashboardData, useSearch } from '@/hooks';
import { AppShell, PageHeader, PagePlaceholder, type PlaceholderItem } from '@/pages/shared';

const clientItems: PlaceholderItem[] = [
  {
    id: 'client-1',
    title: 'Kora Foods Ltd.',
    subtitle: 'Lagos · 4 active shipments',
    tag: 'Active',
  },
  {
    id: 'client-2',
    title: 'Hanwha Logistics',
    subtitle: 'Seoul · 2 active shipments',
    tag: 'Priority',
  },
  {
    id: 'client-3',
    title: 'Pearl Exporters',
    subtitle: 'Accra · 1 active shipment',
    tag: 'Active',
  },
];

export function ClientsPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading clients...">
      <div className="space-y-6">
        <PageHeader
          title="Clients"
          subtitle="Manage relationships and ongoing shipment activity."
        />
        <PagePlaceholder
          title="Client Highlights"
          description="Key client accounts currently shipping with GlobalExpress."
          items={clientItems}
          query={query}
          emptyLabel="No clients match your search."
        />
      </div>
    </AppShell>
  );
}
