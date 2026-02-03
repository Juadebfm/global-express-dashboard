import type { ReactElement } from 'react';
import { useDashboardData, useSearch } from '@/hooks';
import { AppShell, PageHeader, PagePlaceholder, type PlaceholderItem } from '@/pages/shared';

const notificationItems: PlaceholderItem[] = [
  {
    id: 'note-1',
    title: 'Delay Alert: Seoul → Accra',
    subtitle: 'Weather disruption · Updated ETA 4h 15m',
    tag: 'Alert',
  },
  {
    id: 'note-2',
    title: 'Shipment Cleared: Shanghai → Lagos',
    subtitle: 'Customs cleared · Ready for transit',
    tag: 'Update',
  },
  {
    id: 'note-3',
    title: 'New Order Assigned',
    subtitle: 'Order GX-2044 added to your queue',
    tag: 'Info',
  },
];

export function NotificationsPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();

  return (
    <AppShell
      data={data}
      isLoading={isLoading}
      error={error}
      loadingLabel="Loading notifications..."
    >
      <div className="space-y-6">
        <PageHeader
          title="Notifications"
          subtitle="Stay informed with live operational updates."
        />
        <PagePlaceholder
          title="Latest Notifications"
          description="Operational alerts and updates across your network."
          items={notificationItems}
          query={query}
          emptyLabel="No notifications match your search."
        />
      </div>
    </AppShell>
  );
}
