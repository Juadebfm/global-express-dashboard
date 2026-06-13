import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserCircle } from 'lucide-react';
import { useSearch, useDashboardData, useAuth } from '@/hooks';
import type { ActiveDelivery, KpiCard, UiAction } from '@/types';
import {
  ActiveDeliveries,
  DashboardHeader,
  DashboardShipmentSummary,
  KpiGrid,
  ShipmentListSection,
} from '../components';
import { AppShell } from '@/pages/shared';
import { ROUTES } from '@/constants';

export function DashboardPage(): ReactElement {
  const { t } = useTranslation('dashboard');
  const { query } = useSearch();
  const { data, isLoading, error } = useDashboardData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const normalizedQuery = query.trim().toLowerCase();

  const filteredKpis = useMemo((): KpiCard[] => {
    if (!data) return [];
    if (normalizedQuery.length === 0) return data.kpis;
    return data.kpis.filter(
      (item) =>
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.helperText.toLowerCase().includes(normalizedQuery)
    );
  }, [data, normalizedQuery]);

  const filteredDeliveries = useMemo((): ActiveDelivery[] => {
    if (!data) return [];
    if (normalizedQuery.length === 0) return data.activeDeliveries.items;
    return data.activeDeliveries.items.filter((item) => {
      const location = `${item.location.city} ${item.location.state}`;
      return (
        location.toLowerCase().includes(normalizedQuery) ||
        item.statusLabel.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [data, normalizedQuery]);

  const handleAction = (action: UiAction): void => {
    if (action.id === 'trackShipment') navigate(ROUTES.SHIPMENT_TRACK);
    if (action.id === 'newOrder') navigate(ROUTES.NEW_SHIPMENT);
  };

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel={t('loadingLabel')}>
      <div className="space-y-8">
        {user?.mustCompleteProfile && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-3 text-sm text-amber-800">
              <UserCircle className="h-5 w-5 shrink-0" />
              <span>Your profile is incomplete. Add your details to unlock all features.</span>
            </div>
            <Link
              to={ROUTES.PROFILE}
              className="shrink-0 text-sm font-semibold text-amber-800 underline-offset-2 hover:underline"
            >
              Complete profile
            </Link>
          </div>
        )}
        {data && (
          <>
            <DashboardHeader
              title={data.app.pageTitle}
              subtitle={data.app.subtitle}
              actions={data.ui.actions}
              onAction={handleAction}
            />

            <section>
              <KpiGrid items={filteredKpis} emptyLabel={t('kpiGrid.emptyLabel')} />
            </section>

            <section>
              <DashboardShipmentSummary />
            </section>

            <section>
              <ActiveDeliveries
                title={data.activeDeliveries.title}
                subtitle={data.activeDeliveries.subtitle}
                items={filteredDeliveries}
                emptyLabel={t('activeDeliveries.emptyLabel')}
              />
            </section>

            <section>
              <ShipmentListSection />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
