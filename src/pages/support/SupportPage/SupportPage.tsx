import type { ReactElement } from 'react';
import { useDashboardData, useSearch } from '@/hooks';
import { AppShell, PageHeader, PagePlaceholder, type PlaceholderItem } from '@/pages/shared';

const supportItems: PlaceholderItem[] = [
  {
    id: 'support-1',
    title: 'Ticket #1042',
    subtitle: 'Delivery delay follow-up · In progress',
    tag: 'Open',
  },
  {
    id: 'support-2',
    title: 'Knowledge Base',
    subtitle: 'Search SOPs for customs, air freight, and warehousing',
    tag: 'Docs',
  },
  {
    id: 'support-3',
    title: 'Live Chat',
    subtitle: 'Connect with a logistics specialist',
    tag: 'Online',
  },
];

export function SupportPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading support...">
      <div className="space-y-6">
        <PageHeader
          title="Support"
          subtitle="Get help with deliveries, billing, or account setup."
        />
        <PagePlaceholder
          title="Support Center"
          description="Quick access to assistance and documentation."
          items={supportItems}
          query={query}
          emptyLabel="No support items match your search."
        />
      </div>
    </AppShell>
  );
}
