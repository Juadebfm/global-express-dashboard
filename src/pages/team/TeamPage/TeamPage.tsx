import type { ReactElement } from 'react';
import { useDashboardData, useSearch } from '@/hooks';
import { AppShell, PageHeader, PagePlaceholder, type PlaceholderItem } from '@/pages/shared';

const teamItems: PlaceholderItem[] = [
  {
    id: 'team-1',
    title: 'Operations Unit',
    subtitle: '6 members · Lagos hub',
    tag: 'Active',
  },
  {
    id: 'team-2',
    title: 'Air Freight Team',
    subtitle: '4 members · Seoul hub',
    tag: 'On duty',
  },
  {
    id: 'team-3',
    title: 'Compliance Crew',
    subtitle: '3 members · Accra hub',
    tag: 'Available',
  },
];

export function TeamPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading team...">
      <div className="space-y-6">
        <PageHeader
          title="Team"
          subtitle="Manage people and assignments across logistics hubs."
        />
        <PagePlaceholder
          title="Team Overview"
          description="Teams currently assigned to key routes and operations."
          items={teamItems}
          query={query}
          emptyLabel="No team records match your search."
        />
      </div>
    </AppShell>
  );
}
