import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import {
  useAuth,
  useCan,
  useSearch,
  useShipmentsDashboard,
} from '@/hooks';
import type { ShipmentFilterTab, ShipmentRecord } from '@/types';
import {
  ShipmentsFilters,
  ShipmentsTable,
} from '@/pages/shipments/components';
import { Pagination, TableRowsSkeleton } from '@/components/ui';
import { ROUTES } from '@/constants';

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
  statusLabels: Record<string, string>,
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

export function ShipmentListSection(): ReactElement {
  const { t } = useTranslation('shipments');
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn } = useClerkAuth();
  const isCustomer = isClerkSignedIn && !user;
  const isOperator = useCan('app.operator');
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<ShipmentFilterTab['value']>('all');
  const [page, setPage] = useState(1);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const operatorStatusV2 = isOperator && activeFilter !== 'all' ? activeFilter : undefined;

  const { data: shipmentsData, isLoading: isShipmentsLoading, error: shipmentsError } =
    useShipmentsDashboard({ statusV2: operatorStatusV2, page });

  const { query, setQuery } = useSearch();


  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  const statusLabels = useMemo(() => ({
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

  const effectiveShipments = useMemo(() => shipmentsData?.shipments ?? [], [shipmentsData]);

  const normalizedQuery = query.trim();

  const statusScopedShipments = useMemo(() => {
    if (!effectiveShipments.length) return [];
    if (activeFilter === 'all') return effectiveShipments;
    if (isCustomer) {
      return effectiveShipments.filter((s) => s.status === activeFilter);
    }
    return effectiveShipments.filter((s) => s.statusV2 === activeFilter);
  }, [effectiveShipments, activeFilter, isCustomer]);

  const filteredShipments = useMemo(() => {
    if (!statusScopedShipments.length) return [];
    if (!normalizedQuery) return statusScopedShipments;
    return statusScopedShipments.filter((s) => matchesQuery(s, normalizedQuery));
  }, [statusScopedShipments, normalizedQuery]);

  const translatedFilters = useMemo(() => {
    if (!isCustomer) {
      return [
        { id: 'all', label: t('filters.all'), value: 'all' },
        { id: 'preordersWaiting', label: t('statusV2.PREORDER_SUBMITTED', { defaultValue: 'Bookings Submitted' }), value: 'PREORDER_SUBMITTED' },
        { id: 'awaitingWarehouse', label: t('statusV2.AWAITING_WAREHOUSE_RECEIPT', { defaultValue: 'Awaiting Warehouse Receipt' }), value: 'AWAITING_WAREHOUSE_RECEIPT' },
        { id: 'needsVerification', label: t('statusV2.WAREHOUSE_RECEIVED', { defaultValue: 'Received - Needs Verification' }), value: 'WAREHOUSE_RECEIVED' },
        { id: 'verifiedPriced', label: t('statusV2.WAREHOUSE_VERIFIED_PRICED', { defaultValue: 'Verified & Priced' }), value: 'WAREHOUSE_VERIFIED_PRICED' },
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
        ? t('visibleLabel.filtered', { showing: filteredShipments.length, total: totalVisible, query: normalizedQuery })
        : t('visibleLabel.default', { count: filteredShipments.length });

  const handleCopy = async (): Promise<void> => {
    if (!hasRows) { setActionMessage(t('actions.nothingToCopy')); return; }
    const csv = buildCsv(filteredShipments, statusLabels, csvHeaders);
    try {
      await navigator.clipboard.writeText(csv);
      setActionMessage(t('actions.copied', { count: filteredShipments.length }));
    } catch {
      setActionMessage(t('actions.copyFailed'));
    }
  };

  const handleDownload = (): void => {
    if (!hasRows) { setActionMessage(t('actions.nothingToDownload')); return; }
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

  const handleRowClick = (shipment: ShipmentRecord): void => {
    navigate(`${ROUTES.ORDERS}?select=${encodeURIComponent(shipment.id)}`);
  };

  const handleFilterChange = (value: string): void => {
    if (value !== activeFilter) setPage(1);
    setActiveFilter(value);
  };

  if (isShipmentsLoading) {
    return <TableRowsSkeleton columns={8} ariaLabel={t('loadingShipmentList')} />;
  }

  if (!shipmentsData) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
        {shipmentsError ?? t('unavailable')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ShipmentsFilters
        filters={translatedFilters}
        active={activeFilter}
        onChange={handleFilterChange}
        onCopy={handleCopy}
        onDownload={handleDownload}
        actionMessage={actionMessage}
        actionsDisabled={!hasRows}
      />

      <ShipmentsTable
        title={t('shipmentList')}
        items={filteredShipments}
        searchValue={query}
        onSearchChange={(v) => setQuery(v)}
        onSearchClear={() => setQuery('')}
        searchPlaceholder={t('searchPlaceholder')}
        searchMeta={visibleLabel}
        onRowClick={handleRowClick}
      />

      {shipmentsData.pagination.totalPages > 1 && (
        <Pagination
          page={shipmentsData.pagination.page}
          totalPages={shipmentsData.pagination.totalPages}
          total={shipmentsData.pagination.total}
          labels={{
            pageOf: (p, tp) => t('pagination.pageOf', { page: p, totalPages: tp }),
            totalLabel: (count) => t('pagination.total', { count }),
            prev: t('pagination.prev'),
            next: t('pagination.next'),
          }}
          onPageChange={setPage}
        />
      )}

    </div>
  );
}
