import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/pages/shared';
import { useDashboardData, useSearch, useShipmentsDashboard } from '@/hooks';
import type { ShipmentFilterTab, ShipmentRecord, ShipmentStatus } from '@/types';
import { ShipmentsFilters, ShipmentsHeader, ShipmentsSummary, ShipmentsTable } from '../components';
import { PageLoader } from '@/components/ui';
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
    shipment.priority,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
};

const statusLabels: Record<ShipmentStatus, string> = {
  in_transit: 'In-transit',
  delivered: 'Delivered',
  pending: 'Pending',
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

const buildCsv = (rows: ShipmentRecord[]): string => {
  const header = [
    'SKU',
    'Customer',
    'Origin',
    'Destination',
    'Departure',
    'ETA',
    'Status',
    'Type',
  ];

  const lines = rows.map((shipment) =>
    [
      shipment.sku,
      shipment.customer,
      shipment.origin,
      shipment.destination,
      exportDate(shipment.departureDate),
      exportDate(shipment.etaDate),
      statusLabels[shipment.status],
      shipment.mode,
    ]
      .map(escapeCsv)
      .join(',')
  );

  return [header.join(','), ...lines].join('\n');
};

export function ShipmentsPage(): ReactElement {
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } =
    useDashboardData();
  const { data: shipmentsData, isLoading: isShipmentsLoading, error: shipmentsError } =
    useShipmentsDashboard();
  const { query, setQuery } = useSearch();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<ShipmentFilterTab['value']>('all');
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ShipmentStatus>>(
    {}
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  const effectiveShipments = useMemo(() => {
    if (!shipmentsData) return [];
    return shipmentsData.shipments
      .map((shipment) => {
        const override = statusOverrides[shipment.id];
        return override ? { ...shipment, status: override } : shipment;
      })
      .filter((shipment) => !deletedIds.has(shipment.id));
  }, [shipmentsData, statusOverrides, deletedIds]);

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
        acc.totalValue += shipment.valueUSD;
        acc.statusCounts[shipment.status] += 1;
        return acc;
      },
      {
        totalWeight: 0,
        totalItems: 0,
        totalValue: 0,
        statusCounts: {
          in_transit: 0,
          delivered: 0,
          pending: 0,
        } as Record<ShipmentStatus, number>,
      }
    );

    const totalShipments = effectiveShipments.length;
    const averageFormat = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const currencyAverageFormat = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const averageWeight = totalShipments === 0 ? 0 : totals.totalWeight / totalShipments;
    const averageValue = totalShipments === 0 ? 0 : totals.totalValue / totalShipments;
    const averageItems = totalShipments === 0 ? 0 : totals.totalItems / totalShipments;

    return {
      overview: {
        ...shipmentsData.summary.overview,
        total: totalShipments,
        breakdown: [
          {
            id: 'in-transit',
            label: 'In Transit',
            value: totals.statusCounts.in_transit,
            status: 'in_transit' as const,
          },
          {
            id: 'delivered',
            label: 'Delivered',
            value: totals.statusCounts.delivered,
            status: 'delivered' as const,
          },
          {
            id: 'pending',
            label: 'Delayed/Pending',
            value: totals.statusCounts.pending,
            status: 'pending' as const,
          },
        ],
      },
      metrics: [
        {
          ...shipmentsData.summary.metrics[0],
          value: totals.totalWeight,
          helperText: `Average weight per shipment: ${averageFormat.format(averageWeight)} kg`,
        },
        {
          ...shipmentsData.summary.metrics[1],
          value: totals.totalValue,
          helperText: `Average value per shipment: ${currencyAverageFormat.format(averageValue)}`,
        },
        {
          ...shipmentsData.summary.metrics[2],
          value: totals.totalItems,
          helperText: `Average item per shipment: ${averageFormat.format(averageItems)}`,
        },
      ],
    };
  }, [shipmentsData, effectiveShipments]);

  const hasRows = filteredShipments.length > 0;
  const totalVisible = statusScopedShipments.length;
  const visibleLabel =
    totalVisible === 0
      ? 'No shipments available in this view.'
      : normalizedQuery
        ? `Showing ${filteredShipments.length} of ${totalVisible} shipment${
            totalVisible === 1 ? '' : 's'
          } for "${normalizedQuery}".`
        : `Showing ${filteredShipments.length} shipment${
            filteredShipments.length === 1 ? '' : 's'
          }.`;

  const handleCopy = async (): Promise<void> => {
    if (!hasRows) {
      setActionMessage('No shipments to copy.');
      return;
    }

    const csv = buildCsv(filteredShipments);

    try {
      await navigator.clipboard.writeText(csv);
      setActionMessage(`Copied ${filteredShipments.length} rows.`);
    } catch {
      setActionMessage('Copy failed.');
    }
  };

  const handleDownload = (): void => {
    if (!hasRows) {
      setActionMessage('No shipments to download.');
      return;
    }

    const csv = buildCsv(filteredShipments);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `shipments-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setActionMessage(`Downloaded ${filteredShipments.length} rows.`);
  };

  const handleDelete = (): void => {
    if (!hasRows) {
      setActionMessage('No shipments to delete.');
      return;
    }

    const confirmDelete = window.confirm(
      `Delete ${filteredShipments.length} shipment(s) from this view?`
    );

    if (!confirmDelete) return;

    const filteredIds = new Set(filteredShipments.map((shipment) => shipment.id));
    setDeletedIds((prev) => {
      const next = new Set(prev);
      filteredIds.forEach((id) => next.add(id));
      return next;
    });
    setActionMessage(`Deleted ${filteredShipments.length} rows.`);
  };

  const handleEdit = (): void => {
    if (!hasRows) {
      setActionMessage('No shipments to edit.');
      return;
    }

    const input = window.prompt(
      'Set status for filtered shipments (in_transit, delivered, pending):',
      'in_transit'
    );

    if (!input) return;

    const normalized = input.trim().toLowerCase().replace(/[\s-]/g, '_');
    const allowed: ShipmentStatus[] = ['in_transit', 'delivered', 'pending'];

    if (!allowed.includes(normalized as ShipmentStatus)) {
      setActionMessage('Invalid status.');
      return;
    }

    const filteredIds = new Set(filteredShipments.map((shipment) => shipment.id));
    setStatusOverrides((prev) => {
      const next = { ...prev };
      filteredIds.forEach((id) => {
        next[id] = normalized as ShipmentStatus;
      });
      return next;
    });
    setActionMessage(`Updated ${filteredShipments.length} rows.`);
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
      loadingLabel="Loading shipments..."
    >
      <div className="space-y-6">
        {shipmentsData ? (
          <>
            <ShipmentsHeader
              title={shipmentsData.header.title}
              subtitle={shipmentsData.header.subtitle}
              onTrackShipment={handleTrackShipment}
            />

            {summaryData && (
              <ShipmentsSummary
                overview={summaryData.overview}
                metrics={summaryData.metrics}
              />
            )}

            <ShipmentsFilters
              filters={shipmentsData.filters}
              active={activeFilter}
              onChange={setActiveFilter}
              onCopy={handleCopy}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onEdit={handleEdit}
              actionMessage={actionMessage}
              actionsDisabled={!hasRows}
            />

            <ShipmentsTable
              title={shipmentsData.table.title}
              items={filteredShipments}
              searchValue={query}
              onSearchChange={handleSearchChange}
              onSearchClear={handleSearchClear}
              searchPlaceholder="Search by SKU, customer, origin, destination..."
              searchMeta={visibleLabel}
            />
          </>
        ) : isShipmentsLoading ? (
          <PageLoader label="Loading shipment list..." />
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
            {shipmentsError ?? 'Shipment data unavailable.'}
          </div>
        )}
      </div>
    </AppShell>
  );
}
