import type { ReactElement, ReactNode } from 'react';
import type { DashboardData } from '@/types';
import { AppLayout } from '@/components/layout';
import { PageLoader } from '@/components/ui';

interface AppShellProps {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  loadingLabel?: string;
  children: ReactNode;
}

export function AppShell({
  data,
  isLoading,
  error,
  loadingLabel = 'Loading...',
  children,
}: AppShellProps): ReactElement {
  if (isLoading) {
    return <PageLoader label={loadingLabel} />;
  }

  if (!data || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-red-600">
          {error ?? 'Dashboard data unavailable.'}
        </div>
      </div>
    );
  }

  return (
    <AppLayout ui={data.ui} user={data.user}>
      {children}
    </AppLayout>
  );
}
