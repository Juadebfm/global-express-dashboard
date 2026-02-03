import type { ReactElement } from 'react';
import { useDashboardData, useSearch } from '@/hooks';
import { AppShell, PageHeader, PagePlaceholder, type PlaceholderItem } from '@/pages/shared';

const inventoryItems: PlaceholderItem[] = [
  {
    id: 'inv-1',
    title: 'Packaging Materials',
    subtitle: '2,450 units · Reorder soon',
    tag: 'Low stock',
  },
  {
    id: 'inv-2',
    title: 'Cold Storage Units',
    subtitle: '12 units · Available',
    tag: 'Available',
  },
  {
    id: 'inv-3',
    title: 'Pallet Inventory',
    subtitle: '680 pallets · Stable',
    tag: 'Stable',
  },
];

export function InventoryPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading inventory...">
      <div className="space-y-6">
        <PageHeader
          title="Inventory"
          subtitle="Monitor stock levels and packaging capacity."
        />
        <PagePlaceholder
          title="Inventory Snapshot"
          description="Key inventory items to keep your operations running smoothly."
          items={inventoryItems}
          query={query}
          emptyLabel="No inventory items match your search."
        />
      </div>
    </AppShell>
  );
}
