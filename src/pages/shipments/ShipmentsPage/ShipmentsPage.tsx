import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Layers, PackagePlus } from 'lucide-react';
import { AppShell } from '@/pages/shared';
import {
  useAuth,
  useCan,
  useDashboardData,
  useRecordShipmentIntake,
  useSearch,
  useShipmentsDashboard,
} from '@/hooks';
import type { ShipmentFilterTab, ShipmentRecord, StatusCategory } from '@/types';
import {
  BatchOpsModal,
  ShipmentIntakeModal,
  ShipmentsFilters,
  ShipmentsHeader,
  ShipmentsSummary,
  ShipmentsTable,
} from '../components';
import { Button, Pagination, Skeleton } from '@/components/ui';
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

const exportDate = (value: string | null | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
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
  const isOperator = useCan('app.operator');
  const [activeFilter, setActiveFilter] = useState<ShipmentFilterTab['value']>('all');
  const operatorStatusV2 = isOperator && activeFilter !== 'all' ? activeFilter : undefined;

  // `?page=N` in the URL is the source of truth for the current page so a
  // refresh / deep link / browser-back keeps position. We coerce + clamp to
  // ≥1 so a hand-edited "page=0" or "page=foo" doesn't break the request.
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const setPage = (next: number): void => {
    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        if (next <= 1) {
          updated.delete('page');
        } else {
          updated.set('page', String(next));
        }
        return updated;
      },
      { replace: true },
    );
  };

  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } =
    useDashboardData();
  const { data: shipmentsData, isLoading: isShipmentsLoading, error: shipmentsError } =
    useShipmentsDashboard({ statusV2: operatorStatusV2, page });
  const { query, setQuery } = useSearch();
  const navigate = useNavigate();
  const recordIntake = useRecordShipmentIntake();
  const [showIntake, setShowIntake] = useState(false);
  const [showBatchOps, setShowBatchOps] = useState(false);

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
    if (isCustomer) {
      return effectiveShipments.filter((shipment) => shipment.status === activeFilter);
    }
    return effectiveShipments.filter((shipment) => shipment.statusV2 === activeFilter);
  }, [effectiveShipments, activeFilter, isCustomer]);

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

    // Headline reflects ALL matching shipments (from BE pagination.total),
    // while the per-status / weight / item totals below reflect only the
    // current page. The status-filter tabs let the user get an accurate
    // per-status total via the BE-filtered pagination.total of that tab.
    const totalShipments = shipmentsData.pagination.total;
    // Averages are over the rows we actually have weight/item data for
    // (current page). Dividing by pagination.total would over-flatten on
    // any page that isn't the full result set.
    const pageShipmentCount = effectiveShipments.length;
    const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
    const averageFormat = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const averageWeight = pageShipmentCount === 0 ? 0 : totals.totalWeight / pageShipmentCount;
    const averageItems = pageShipmentCount === 0 ? 0 : totals.totalItems / pageShipmentCount;

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

  const translatedFilters = useMemo(() => {
    if (!isCustomer) {
      return [
        { id: 'all', label: t('filters.all'), value: 'all' },
        {
          id: 'preordersWaiting',
          label: t('statusV2.PREORDER_SUBMITTED', { defaultValue: 'Pre-orders Waiting' }),
          value: 'PREORDER_SUBMITTED',
        },
        {
          id: 'awaitingWarehouse',
          label: t('statusV2.AWAITING_WAREHOUSE_RECEIPT', { defaultValue: 'Awaiting Warehouse Receipt' }),
          value: 'AWAITING_WAREHOUSE_RECEIPT',
        },
        {
          id: 'needsVerification',
          label: t('statusV2.WAREHOUSE_RECEIVED', { defaultValue: 'Received - Needs Verification' }),
          value: 'WAREHOUSE_RECEIVED',
        },
        {
          id: 'verifiedPriced',
          label: t('statusV2.WAREHOUSE_VERIFIED_PRICED', { defaultValue: 'Verified & Priced' }),
          value: 'WAREHOUSE_VERIFIED_PRICED',
        },
      ];
    }

    return [
      { id: 'all', label: t('filters.all'), value: 'all' },
      { id: 'pending', label: t('filters.pending'), value: 'pending' },
      { id: 'active', label: t('filters.active'), value: 'active' },
      { id: 'completed', label: t('filters.completed'), value: 'completed' },
      { id: 'exception', label: t('filters.exception'), value: 'exception' },
    ];
  }, [t, isCustomer]);

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

  const handleOpenShipment = (shipment: ShipmentRecord): void => {
    if (!isOperator) return;
    navigate(`/shipments/${shipment.id}`);
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

            {isOperator && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setShowIntake(true)}
                  className="inline-flex items-center gap-2"
                >
                  <PackagePlus className="h-4 w-4" />
                  Record intake
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowBatchOps(true)}
                  className="inline-flex items-center gap-2"
                >
                  <Layers className="h-4 w-4" />
                  Batch operations
                </Button>
              </div>
            )}

            {summaryData && (
              <ShipmentsSummary
                overview={summaryData.overview}
                metrics={summaryData.metrics}
              />
            )}

            <ShipmentsFilters
              filters={translatedFilters}
              active={activeFilter}
              onChange={(value) => {
                // Switching status filters changes the query — drop back to
                // page 1 so the URL doesn't strand us past the new totalPages.
                if (value !== activeFilter) setPage(1);
                setActiveFilter(value);
              }}
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
              onRowClick={isOperator ? handleOpenShipment : undefined}
            />

            {shipmentsData.pagination.totalPages > 1 && (
              <Pagination
                page={shipmentsData.pagination.page}
                totalPages={shipmentsData.pagination.totalPages}
                total={shipmentsData.pagination.total}
                labels={{
                  pageOf: (p, tp) =>
                    t('pagination.pageOf', { page: p, totalPages: tp }),
                  totalLabel: (count) =>
                    t('pagination.total', { count }),
                  prev: t('pagination.prev'),
                  next: t('pagination.next'),
                }}
                onPageChange={setPage}
              />
            )}
          </>
        ) : isShipmentsLoading ? (
          <ShipmentsTableSkeleton ariaLabel={t('loadingShipmentList')} />
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
            {shipmentsError ?? t('unavailable')}
          </div>
        )}
      </div>

      {showIntake && (
        <ShipmentIntakeModal
          isPending={recordIntake.isPending}
          onClose={() => setShowIntake(false)}
          onSubmit={async (payload) => {
            await recordIntake.mutate(payload);
            setShowIntake(false);
          }}
        />
      )}

      {showBatchOps && <BatchOpsModal onClose={() => setShowBatchOps(false)} />}
    </AppShell>
  );
}

/**
 * Inline skeleton for the shipments table while the first page of data is
 * in flight. Mirrors the real ShipmentsTable's row shape (8 columns at
 * varying widths) so the layout doesn't jump when real rows arrive.
 */
function ShipmentsTableSkeleton({ ariaLabel }: { ariaLabel: string }): ReactElement {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4"
    >
      <div className="border-b border-gray-100 pb-3">
        <Skeleton height={18} width="22%" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-gray-100 py-3 last:border-b-0 last:pb-0"
        >
          <Skeleton height={14} width="18%" />
          <Skeleton height={14} width="18%" />
          <Skeleton height={14} width="14%" />
          <Skeleton height={14} width="14%" />
          <Skeleton height={14} width="10%" />
          <Skeleton height={14} width="10%" />
          <Skeleton height={14} width="8%" />
          <Skeleton height={14} width="8%" />
        </div>
      ))}
    </div>
  );
}
