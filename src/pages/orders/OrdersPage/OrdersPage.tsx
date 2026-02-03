import type { ReactElement } from 'react';
import { useDashboardData, useSearch } from '@/hooks';
import { AppShell, PageHeader, PagePlaceholder, type PlaceholderItem } from '@/pages/shared';

const orderItems: PlaceholderItem[] = [
  {
    id: 'order-1',
    title: 'Order GX-2044',
    subtitle: 'Origin: Shenzhen · Destination: Lagos',
    tag: 'Processing',
  },
  {
    id: 'order-2',
    title: 'Order GX-1987',
    subtitle: 'Origin: Seoul · Destination: Accra',
    tag: 'Ready',
  },
  {
    id: 'order-3',
    title: 'Order GX-1762',
    subtitle: 'Origin: Shanghai · Destination: Tema',
    tag: 'Dispatched',
  },
];

export function OrdersPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading orders...">
      <div className="space-y-6">
        <PageHeader
          title="Orders"
          subtitle="Review active and recently created customer orders."
        />
        <PagePlaceholder
          title="Order Queue"
          description="Latest orders across all logistics channels."
          items={orderItems}
          query={query}
          emptyLabel="No orders match your search."
        />
      </div>
    </AppShell>
  );
}
