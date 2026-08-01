import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCapability, useDashboardData } from '@/hooks';
import type { UiAction } from '@/types';
import { DashboardHeader } from '@/pages/dashboard/components';
import { AppShell } from '@/pages/shared';
import { ROUTES } from '@/constants';
import { AdminKpiBar } from './components/AdminKpiBar';
import { NeedsAttentionPanel } from './components/NeedsAttentionPanel';
import { OpenBatchesSummary } from './components/OpenBatchesSummary';
import { TopCustomers } from './components/TopCustomers';

export function AdminDashboardPage(): ReactElement {
  const { t } = useTranslation('dashboard');
  const { data, isLoading, error } = useDashboardData();
  const navigate = useNavigate();
  // Top customers is fed by the operational reports endpoint; a role alone
  // must not expose it to an admin who has not been granted that capability.
  const canViewTopCustomers = useCapability('reports.operational.view');

  const handleAction = (action: UiAction): void => {
    if (action.id === 'trackShipment') navigate(ROUTES.SHIPMENT_TRACK);
    if (action.id === 'newOrder') navigate(ROUTES.NEW_SHIPMENT);
  };

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel={t('loadingLabel')}>
      <div className="space-y-8">
        {data && (
          <>
            <DashboardHeader
              title={data.app.pageTitle}
              subtitle={data.app.subtitle}
              actions={data.ui.actions}
              onAction={handleAction}
            />

            <section>
              <AdminKpiBar kpis={data.kpis} />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <NeedsAttentionPanel />
              <OpenBatchesSummary />
            </section>

            {canViewTopCustomers && (
              <section>
                <TopCustomers />
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
