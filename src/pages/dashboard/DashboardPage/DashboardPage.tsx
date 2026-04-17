import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSearch, useDashboardData } from '@/hooks';
import type { ActiveDelivery, KpiCard, UiAction } from '@/types';
import {
  ActiveDeliveries,
  DashboardHeader,
  KpiGrid,
} from '../components';
import { AppShell } from '@/pages/shared';
import { ROUTES } from '@/constants';

export function DashboardPage(): ReactElement {
  const { t } = useTranslation('dashboard');
  const { query } = useSearch();
  const { data, isLoading, error } = useDashboardData();
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
              <ActiveDeliveries
                title={data.activeDeliveries.title}
                subtitle={data.activeDeliveries.subtitle}
                items={filteredDeliveries}
                emptyLabel={t('activeDeliveries.emptyLabel')}
              />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
