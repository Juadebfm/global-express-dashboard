import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Boxes,
  ChevronDown,
  ClipboardList,
  MoreVertical,
  Package,
  Search,
  Trash2,
} from 'lucide-react';
import { useAuth, useDashboardData, useSearch } from '@/hooks';
import { useBulkOrders } from '@/hooks/useBulkOrders';
import { AppShell, PageHeader } from '@/pages/shared';
import type { ApiBulkOrder, ApiBulkOrderItem } from '@/types';
import { getStatusStyle } from '@/lib/statusUtils';
import { deleteBulkOrder, getBulkOrderById, updateBulkOrderStatus } from '@/services';
import { cn } from '@/utils';

const TOKEN_KEY = 'globalxpress_token';

// ── Helpers ─────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'active' | 'completed' | 'exception';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'exception', label: 'Exception' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatWeight(kg: number | undefined): string {
  if (kg == null) return '—';
  return `${kg.toLocaleString()} kg`;
}

function formatValue(value: number | undefined): string {
  if (value == null) return '—';
  return `$${value.toLocaleString()}`;
}

function getStatusCategory(statusV2: string): StatusFilter {
  const style = getStatusStyle(statusV2);
  return style.category as StatusFilter;
}

// ── Component ───────────────────────────────────────────────────

export function BulkOrdersPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { bulkOrders, total, isLoading: ordersLoading, error: ordersError } = useBulkOrders();
  const { query, setQuery } = useSearch();
  const { user } = useAuth();

  const [activeOrder, setActiveOrder] = useState<ApiBulkOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [openMenu, setOpenMenu] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Close status dropdown on outside click
  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-status-menu]')) return;
      setOpenMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenu]);

  // Close row context menu on outside click
  useEffect(() => {
    if (!openRowMenuId) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-row-menu]') || target.closest('[data-row-menu-button]')) return;
      setOpenRowMenuId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openRowMenuId]);

  // Auto-dismiss messages
  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  useEffect(() => {
    if (!actionError) return;
    const timeout = window.setTimeout(() => setActionError(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [actionError]);

  // ── Filtering ──────────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return bulkOrders.filter((order) => {
      const matchesSearch =
        !needle ||
        `${order.id} ${order.origin} ${order.destination} ${order.statusLabel} ${order.notes ?? ''}`
          .toLowerCase()
          .includes(needle);
      const matchesStatus =
        statusFilter === 'all' || getStatusCategory(order.statusV2) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bulkOrders, query, statusFilter]);

  // ── Summary stats ──────────────────────────────────────────────

  const summaryStats = useMemo(() => {
    const totalOrders = bulkOrders.length;
    const totalItems = bulkOrders.reduce((acc, o) => acc + o.itemCount, 0);
    const statusCounts = bulkOrders.reduce(
      (acc, o) => {
        const cat = getStatusCategory(o.statusV2);
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return { totalOrders, totalItems, activeCount: statusCounts['active'] ?? 0 };
  }, [bulkOrders]);

  // ── Actions ────────────────────────────────────────────────────

  const handleViewDetail = async (order: ApiBulkOrder): Promise<void> => {
    setDetailLoading(true);
    setActionError(null);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      const detail = await getBulkOrderById(token, order.id);
      setActiveOrder(detail);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to load bulk order details.');
      setActiveOrder(order);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (orderId: string): Promise<void> => {
    const shouldDelete = window.confirm('Delete this bulk order? This cannot be undone.');
    if (!shouldDelete) return;
    setActionError(null);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      await deleteBulkOrder(token, orderId);
      setActionMessage('Bulk order deleted.');
      if (activeOrder?.id === orderId) setActiveOrder(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete bulk order.');
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string): Promise<void> => {
    setActionError(null);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      await updateBulkOrderStatus(token, orderId, newStatus);
      setActionMessage('Status updated.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <AppShell
      data={data}
      isLoading={isLoading || ordersLoading}
      error={error}
      loadingLabel="Loading bulk orders..."
    >
      <div className="space-y-6">
        {activeOrder ? (
          /* ── Detail View ────────────────────────────────────── */
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setActiveOrder(null)}
              className="inline-flex items-center gap-2 text-xl font-semibold text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              Bulk Orders
            </button>

            {actionError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}
            {actionMessage && (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {actionMessage}
              </div>
            )}

            {/* Order info card */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-semibold text-gray-700">Bulk Order Details</p>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">Order ID</p>
                  <p className="text-base font-semibold text-gray-900">{activeOrder.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">Route</p>
                  <p className="text-base font-semibold text-gray-900">
                    {activeOrder.origin} → {activeOrder.destination}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">Status</p>
                  <StatusBadge statusV2={activeOrder.statusV2} label={activeOrder.statusLabel} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">Items</p>
                  <p className="text-base font-semibold text-gray-900">{activeOrder.itemCount}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">Created</p>
                  <p className="text-base font-semibold text-gray-900">{formatDate(activeOrder.createdAt)}</p>
                </div>
                {activeOrder.notes && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-xs font-semibold uppercase text-gray-400">Notes</p>
                    <p className="text-sm text-gray-700">{activeOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Admin-only actions */}
              {isAdmin && (
                <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => void handleUpdateStatus(activeOrder.id, 'WAREHOUSE_RECEIVED')}
                    className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    Mark Received
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(activeOrder.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Order
                  </button>
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="rounded-3xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Items ({activeOrder.items?.length ?? activeOrder.itemCount})
                </h2>
              </div>
              <div className="px-6 py-6">
                {detailLoading ? (
                  <div className="py-8 text-center text-sm text-gray-500">Loading items...</div>
                ) : (activeOrder.items ?? []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                    No items found for this bulk order.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-gray-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-6 py-4">Tracking #</th>
                          <th className="px-6 py-4">Recipient</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4">Weight</th>
                          <th className="px-6 py-4">Value</th>
                          <th className="px-6 py-4">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {(activeOrder.items ?? []).map((item: ApiBulkOrderItem) => (
                          <tr key={item.id} className="transition hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-800">
                              {item.trackingNumber}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-800">{item.recipientName}</p>
                              {item.recipientPhone && (
                                <p className="text-xs text-gray-500">{item.recipientPhone}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {item.description || '—'}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {formatWeight(item.weightKg)}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {formatValue(item.declaredValue)}
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {formatDate(item.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── List View ──────────────────────────────────────── */
          <>
            <PageHeader title="Bulk Orders" subtitle="Manage bulk shipment orders." />

            {ordersError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {ordersError}
              </div>
            )}
            {actionError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}
            {actionMessage && (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {actionMessage}
              </div>
            )}

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Bulk Orders</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">{summaryStats.totalOrders}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <Boxes className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Items</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">{summaryStats.totalItems}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Across all bulk orders
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Package className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Orders</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">{summaryStats.activeCount}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Currently in logistics pipeline
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Search + filter bar */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-gray-900">Bulk Order Queue</h2>
                <p className="text-sm text-gray-500">
                  {total > 0
                    ? `${total} bulk order${total === 1 ? '' : 's'} available.`
                    : 'Bulk orders will appear here.'}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="relative w-full max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by ID, origin, destination..."
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none transition focus:border-brand-500"
                  />
                </div>
                <div className="relative" data-status-menu>
                  <button
                    type="button"
                    onClick={() => setOpenMenu((prev) => !prev)}
                    className="inline-flex w-40 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-gray-300"
                  >
                    {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
                    <ChevronDown
                      className={cn('h-4 w-4 text-gray-400 transition', openMenu && 'rotate-180')}
                    />
                  </button>
                  {openMenu && (
                    <div className="absolute z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                      {STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setStatusFilter(option.value);
                            setOpenMenu(false);
                          }}
                          className={cn(
                            'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                            statusFilter === option.value
                              ? 'bg-brand-50 font-semibold text-brand-600'
                              : 'text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Order List</h3>
              <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Route</th>
                      <th className="px-6 py-4">Items</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Created</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="cursor-pointer transition hover:bg-gray-50"
                        onClick={() => void handleViewDetail(order)}
                      >
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {order.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {order.origin} → {order.destination}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-800">{order.itemCount}</span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge statusV2={order.statusV2} label={order.statusLabel} />
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-flex" data-row-menu>
                            <button
                              type="button"
                              data-row-menu-button
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenRowMenuId((prev) =>
                                  prev === order.id ? null : order.id
                                );
                              }}
                              className="text-gray-400 hover:text-gray-600"
                              aria-label="More"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {openRowMenuId === order.id && (
                              <div className="absolute right-0 top-6 z-20 w-44 rounded-xl border border-gray-200 bg-white p-1 text-left shadow-lg">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleViewDetail(order);
                                    setOpenRowMenuId(null);
                                  }}
                                  className="w-full rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
                                >
                                  View Details
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleDelete(order.id);
                                      setOpenRowMenuId(null);
                                    }}
                                    className="w-full rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                                  >
                                    Delete Order
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredOrders.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-500">
                    {bulkOrders.length === 0
                      ? 'No bulk orders found.'
                      : 'No bulk orders match your filters.'}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ── Status badge component ──────────────────────────────────────

function StatusBadge({ statusV2, label }: { statusV2: string; label: string }): ReactElement {
  const style = getStatusStyle(statusV2);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
        style.bgClass,
        style.textClass
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dotClass)} />
      {label}
    </span>
  );
}
