import type { ReactElement } from 'react';
import { useDashboardData, useSearch } from '@/hooks';
import { AppShell, PageHeader, PagePlaceholder, type PlaceholderItem } from '@/pages/shared';

const settingsItems: PlaceholderItem[] = [
  {
    id: 'settings-1',
    title: 'Profile & Security',
    subtitle: 'Passwords, 2FA, and access management',
    tag: 'Owner',
  },
  {
    id: 'settings-2',
    title: 'Notifications',
    subtitle: 'Email, SMS, and in-app alerts',
    tag: 'Preferences',
  },
  {
    id: 'settings-3',
    title: 'Billing',
    subtitle: 'Invoices and payment methods',
    tag: 'Finance',
  },
];

export function SettingsPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading settings...">
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Configure preferences for your GlobalExpress account."
        />
        <PagePlaceholder
          title="Settings Modules"
          description="Manage how your account and organization operates."
          items={settingsItems}
          query={query}
          emptyLabel="No settings match your search."
        />
      </div>
    </AppShell>
  );
}
