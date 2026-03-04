import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { AppShell } from '@/pages/shared';
import { useAuth, useDashboardData, useSearch, useShipmentsDashboard } from '@/hooks';
import type { ShipmentFilterTab, ShipmentRecord, StatusCategory } from '@/types';
import { ShipmentsFilters, ShipmentsHeader, ShipmentsSummary, ShipmentsTable } from '../components';
import { PageLoader } from '@/components/ui';
import { ROUTES } from '@/constants';
import i18n from '@/i18n/i18n';

const matchesQuery = (shipment: ShipmentRecord, query: string): boolean => {
  if (!query) return true;
  const haystack = [
    shipment.sku,
    shipment.customer,
    shipment.origin,
    shipment.destination,
    shipment.status,
    shipment.mode,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
};

const escapeCsv = (value: string | number): string => {
  const text = String(value);
  if (/["\n,]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const exportDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

const buildCsv = (
  rows: ShipmentRecord[],
  statusLabels: Record<StatusCategory, string>,
  csvHeaders: string[],
): string => {
  const lines = rows.map((shipment) =>
    [
      shipment.sku,
      shipment.customer,
      shipment.origin,
      shipment.destination,
      exportDate(shipment.departureDate),
      exportDate(shipment.etaDate),
      shipment.statusLabel || statusLabels[shipment.status],
      shipment.mode,
    ]
      .map(escapeCsv)
      .join(',')
  );

  return [csvHeaders.join(','), ...lines].join('\n');
};

export function ShipmentsPage(): ReactElement {
  const { t } = useTranslation('shipments');
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn } = useClerkAuth();
  const isCustomer = isClerkSignedIn && !user;
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } =
    useDashboardData();
  const { data: shipmentsData, isLoading: isShipmentsLoading, error: shipmentsError } =
    useShipmentsDashboard();
  const { query, setQuery } = useSearch();
  const navigate = useNavigate();

  const statusLabels: Record<StatusCategory, string> = useMemo(() => ({
    pending: t('statusLabels.pending'),
    active: t('statusLabels.active'),
    completed: t('statusLabels.completed'),
    exception: t('statusLabels.exception'),
  }), [t]);

  const csvHeaders = useMemo(() => [
    t('csv.trackingNumber'),
    t('csv.customer'),
    t('csv.origin'),
    t('csv.destination'),
    t('csv.departure'),
    t('csv.eta'),
    t('csv.status'),
    t('csv.type'),
  ], [t]);
  const [activeFilter, setActiveFilter] = useState<ShipmentFilterTab['value']>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  const effectiveShipments = useMemo(() => {
    if (!shipmentsData) return [];
    return shipmentsData.shipments;
  }, [shipmentsData]);

  const normalizedQuery = query.trim();

  const statusScopedShipments = useMemo(() => {
    if (!effectiveShipments.length) return [];
    if (activeFilter === 'all') return effectiveShipments;
    return effectiveShipments.filter((shipment) => shipment.status === activeFilter);
  }, [effectiveShipments, activeFilter]);

  const filteredShipments = useMemo(() => {
    if (!statusScopedShipments.length) return [];
    if (!normalizedQuery) return statusScopedShipments;
    return statusScopedShipments.filter((shipment) =>
      matchesQuery(shipment, normalizedQuery)
    );
  }, [statusScopedShipments, normalizedQuery]);

  const summaryData = useMemo(() => {
    if (!shipmentsData) return null;

    const totals = effectiveShipments.reduce(
      (acc, shipment) => {
        acc.totalWeight += shipment.weightKg;
        acc.totalItems += shipment.packageCount;
        acc.statusCounts[shipment.status] += 1;
        return acc;
      },
      {
        totalWeight: 0,
        totalItems: 0,
        statusCounts: {
          pending: 0,
          active: 0,
          completed: 0,
          exception: 0,
        } as Record<StatusCategory, number>,
      }
    );

    const totalShipments = effectiveShipments.length;
    const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
    const averageFormat = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const averageWeight = totalShipments === 0 ? 0 : totals.totalWeight / totalShipments;
    const averageItems = totalShipments === 0 ? 0 : totals.totalItems / totalShipments;

    return {
      overview: {
        ...shipmentsData.summary.overview,
        title: t('summary.totalShipments'),
        total: totalShipments,
        breakdown: [
          {
            id: 'pending',
            label: t('statusLabels.pending'),
            value: totals.statusCounts.pending,
            status: 'pending' as const,
          },
          {
            id: 'active',
            label: t('statusLabels.active'),
            value: totals.statusCounts.active,
            status: 'active' as const,
          },
          {
            id: 'completed',
            label: t('statusLabels.completed'),
            value: totals.statusCounts.completed,
            status: 'completed' as const,
          },
          {
            id: 'exception',
            label: t('statusLabels.exception'),
            value: totals.statusCounts.exception,
            status: 'exception' as const,
          },
        ],
      },
      metrics: [
        {
          ...shipmentsData.summary.metrics[0],
          title: t('summary.totalWeight'),
          value: totals.totalWeight,
          helperText: t('summary.averageWeight', { value: averageFormat.format(averageWeight) }),
        },
        {
          ...shipmentsData.summary.metrics[2],
          title: t('summary.totalItems'),
          value: totals.totalItems,
          helperText: t('summary.averageItems', { value: averageFormat.format(averageItems) }),
        },
      ],
    };
  }, [shipmentsData, effectiveShipments, t]);

  const translatedFilters = useMemo(() => [
    { id: 'all', label: t('filters.all'), value: 'all' as const },
    { id: 'pending', label: t('filters.pending'), value: 'pending' as const },
    { id: 'active', label: t('filters.active'), value: 'active' as const },
    { id: 'completed', label: t('filters.completed'), value: 'completed' as const },
    { id: 'exception', label: t('filters.exception'), value: 'exception' as const },
  ], [t]);

  const hasRows = filteredShipments.length > 0;
  const totalVisible = statusScopedShipments.length;
  const visibleLabel =
    totalVisible === 0
      ? t('visibleLabel.empty')
      : normalizedQuery
        ? t('visibleLabel.filtered', {
            showing: filteredShipments.length,
            total: totalVisible,
            query: normalizedQuery,
          })
        : t('visibleLabel.default', { count: filteredShipments.length });

  const handleCopy = async (): Promise<void> => {
    if (!hasRows) {
      setActionMessage(t('actions.nothingToCopy'));
      return;
    }

    const csv = buildCsv(filteredShipments, statusLabels, csvHeaders);

    try {
      await navigator.clipboard.writeText(csv);
      setActionMessage(t('actions.copied', { count: filteredShipments.length }));
    } catch {
      setActionMessage(t('actions.copyFailed'));
    }
  };

  const handleDownload = (): void => {
    if (!hasRows) {
      setActionMessage(t('actions.nothingToDownload'));
      return;
    }

    const csv = buildCsv(filteredShipments, statusLabels, csvHeaders);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `shipments-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setActionMessage(t('actions.downloaded', { count: filteredShipments.length }));
  };

  const handleTrackShipment = (): void => {
    navigate(ROUTES.SHIPMENT_TRACK);
  };

  const handleSearchChange = (value: string): void => {
    setQuery(value);
  };

  const handleSearchClear = (): void => {
    setQuery('');
  };

  return (
    <AppShell
      data={dashboardData}
      isLoading={isDashboardLoading}
      error={dashboardError}
      loadingLabel={t('loadingLabel')}
    >
      <div className="space-y-6">
        {shipmentsData ? (
          <>
            <ShipmentsHeader
              title={isCustomer ? t('header.titleCustomer') : t('header.titleOperator')}
              subtitle={isCustomer ? t('header.subtitleCustomer') : t('header.subtitleOperator')}
              onTrackShipment={handleTrackShipment}
            />

            {summaryData && (
              <ShipmentsSummary
                overview={summaryData.overview}
                metrics={summaryData.metrics}
              />
            )}

            <ShipmentsFilters
              filters={translatedFilters}
              active={activeFilter}
              onChange={setActiveFilter}
              onCopy={handleCopy}
              onDownload={handleDownload}
              actionMessage={actionMessage}
              actionsDisabled={!hasRows}
            />

            <ShipmentsTable
              title={t('shipmentList')}
              items={filteredShipments}
              searchValue={query}
              onSearchChange={handleSearchChange}
              onSearchClear={handleSearchClear}
              searchPlaceholder={t('searchPlaceholder')}
              searchMeta={visibleLabel}
            />
          </>
        ) : isShipmentsLoading ? (
          <PageLoader label={t('loadingShipmentList')} />
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
            {shipmentsError ?? t('unavailable')}
          </div>
        )}
      </div>
    </AppShell>
  );
}
