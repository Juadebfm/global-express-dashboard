import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useDashboardData, useOrders, useSearch } from '@/hooks';
import type { OrderListItem } from '@/types';
import { AppShell, PageHeader, PagePlaceholder, type PlaceholderItem } from '@/pages/shared';

function formatStatusLabel(status: string): string {
  return status
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function mapOrderToPlaceholder(order: OrderListItem): PlaceholderItem {
  const subtitleParts: string[] = [];

  if (order.origin || order.destination) {
    subtitleParts.push(
      `Origin: ${order.origin ?? 'Unknown'} - Destination: ${order.destination ?? 'Unknown'}`
    );
  }

  const createdAt = formatDate(order.createdAt);
  if (createdAt) {
    subtitleParts.push(`Created: ${createdAt}`);
  }

  return {
    id: order.id,
    title: `Order ${order.trackingNumber}`,
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(' - ') : undefined,
    tag: order.statusLabel || formatStatusLabel(order.status),
  };
}

export function OrdersPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { orders, total, isLoading: isOrdersLoading, error: ordersError } = useOrders();
  const { query } = useSearch();
  const orderItems = useMemo(() => orders.map(mapOrderToPlaceholder), [orders]);

  return (
    <AppShell
      data={data}
      isLoading={isLoading || isOrdersLoading}
      error={error}
      loadingLabel="Loading orders..."
    >
      <div className="space-y-6">
        <PageHeader
          title="Orders"
          subtitle="Review active and recently created customer orders."
        />
        {ordersError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ordersError}
          </div>
        )}
        <PagePlaceholder
          title="Order Queue"
          description={
            total > 0
              ? `${total} order${total === 1 ? '' : 's'} available from backend.`
              : 'Latest orders across all logistics channels.'
          }
          items={orderItems}
          query={query}
          emptyLabel={ordersError ? 'Unable to load orders.' : 'No orders match your search.'}
        />
      </div>
    </AppShell>
  );
}
