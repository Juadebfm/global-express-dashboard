import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  Package,
  Plane,
  Plus,
  Scale,
  Search,
  Ship,
  User,
  X,
} from 'lucide-react';
import {
  useAuth,
  useBatchRoster,
  useBatchStatusLabels,
  useAvailableOrdersForBatch,
  useAddOrderToBatch,
  useRemoveOrderFromBatch,
  useSetBatchMovementStatus,
  useCloseBatch,
  useCan,
} from '@/hooks';
import type { AvailableOrder } from '@/services';
import { getDisplayErrorMessage } from '@/lib/feedback';
import { AppLayout } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { useFeedbackStore } from '@/store';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';
import type { BatchRosterCustomer, BatchRosterOrder } from '@/types';

// Air-specific statuses (post-close movement)
const AIR_STATUSES = new Set([
  'DISPATCHED_TO_ORIGIN_AIRPORT',
  'AT_ORIGIN_AIRPORT',
  'BOARDED_ON_FLIGHT',
  'FLIGHT_DEPARTED',
  'FLIGHT_LANDED_LAGOS',
  'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE',
  'IN_EXTRA_TRUCK_MOVEMENT_LAGOS',
  'READY_FOR_PICKUP',
  'PICKED_UP_COMPLETED',
  'LOCAL_COURIER_ASSIGNED',
  'IN_TRANSIT_TO_DESTINATION_CITY',
  'OUT_FOR_DELIVERY_DESTINATION_CITY',
  'DELIVERED_TO_RECIPIENT',
  'ON_HOLD',
]);

const SEA_STATUSES = new Set([
  'DISPATCHED_TO_ORIGIN_PORT',
  'AT_ORIGIN_PORT',
  'LOADED_ON_VESSEL',
  'VESSEL_DEPARTED',
  'VESSEL_ARRIVED_LAGOS_PORT',
  'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE',
  'IN_EXTRA_TRUCK_MOVEMENT_LAGOS',
  'READY_FOR_PICKUP',
  'PICKED_UP_COMPLETED',
  'IN_TRANSIT_TO_DESTINATION_CITY',
  'OUT_FOR_DELIVERY_DESTINATION_CITY',
  'DELIVERED_TO_RECIPIENT',
  'ON_HOLD',
]);

const ROW_GRID = 'grid-cols-[1fr_220px_90px_70px]';

function ShipmentTypeBadge({ type, label }: { type: string; label: string }): ReactElement {
  if (type === 'd2d') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
        <Package className="h-3 w-3" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
      <Plane className="h-3 w-3" />
      {label}
    </span>
  );
}

function CustomerRow({
  customer,
  batchOpen,
  canManage,
  onRemoveOrder,
  removingOrderId,
}: {
  customer: BatchRosterCustomer;
  batchOpen: boolean;
  canManage: boolean;
  onRemoveOrder: (orderId: string, customerName: string) => void;
  removingOrderId: string | null;
}): ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn('w-full grid items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors', ROW_GRID)}
      >
        {/* Customer name + mark */}
        <div className="flex items-start gap-2 min-w-0">
          {expanded
            ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
            : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
          }
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">{customer.customerName}</span>
              {!customer.allVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  Unverified orders
                </span>
              )}
            </div>
            <p className="mt-0.5 font-mono text-xs text-gray-400 truncate">Mark: {customer.shippingMark}</p>
          </div>
        </div>

        {/* Tracking number */}
        <div className="text-right">
          <p className="font-mono text-sm font-semibold text-gray-800">{customer.batchTrackingNumber}</p>
          <p className="text-xs text-gray-400">customer tracking no.</p>
        </div>

        {/* Orders */}
        <div className="text-right">
          <span className="text-sm text-gray-700">{customer.orderCount} orders</span>
        </div>

        {/* Weight */}
        <div className="text-right">
          <span className="text-sm text-gray-700">{customer.totalWeightKg} kg</span>
        </div>
      </button>

      {/* Expanded order rows */}
      {expanded && (
        <div className="divide-y divide-gray-50 border-t border-gray-100">
          {customer.orders.map((order: BatchRosterOrder) => {
            const isVerified = order.status.toLowerCase().includes('verified');
            return (
              <div key={order.id} className="flex items-center gap-3 bg-gray-50/60 px-4 py-3 pl-10">
                {/* Tracking + description */}
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <span className="font-mono text-sm font-semibold text-brand-500 shrink-0">
                    {order.trackingNumber}
                  </span>
                  {order.description && (
                    <span className="text-sm text-gray-500 truncate">{order.description}</span>
                  )}
                </div>

                {/* Right-side: badges + weight + remove */}
                <div className="flex items-center gap-2 shrink-0">
                  <ShipmentTypeBadge type={order.shipmentType} label={order.shipmentTypeLabel} />
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                  )}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', isVerified ? 'bg-emerald-500' : 'bg-amber-500')} />
                    {isVerified ? 'Verified' : order.statusLabel}
                  </span>
                  <span className="w-14 text-right text-sm text-gray-500">{order.weightKg} kg</span>
                  {canManage && batchOpen && (
                    <button
                      type="button"
                      onClick={() => onRemoveOrder(order.id, customer.customerName)}
                      disabled={removingOrderId === order.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                    >
                      {removingOrderId === order.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <X className="h-3 w-3" />
                      }
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function BatchDetailPage(): ReactElement {
  const { batchId } = useParams<{ batchId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const isSuperadmin = useCan('app.superadmin');
  const isAdmin = useCan('app.admin');
  const canManage = isAdmin || !!(user?.canManageShipmentBatches);

  const { data: roster, isLoading, error, refetch } = useBatchRoster(batchId);
  const { data: statusLabels } = useBatchStatusLabels();

  const addOrder = useAddOrderToBatch();
  const removeOrder = useRemoveOrderFromBatch();
  const updateStatus = useSetBatchMovementStatus();
  const closeBatchMutation = useCloseBatch();
  const availableOrders = useAvailableOrdersForBatch(batchId);

  // Combobox state for "Add order"
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AvailableOrder | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addOrderError, setAddOrderError] = useState<string | null>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const [removingOrderId, setRemovingOrderId] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const batch = roster?.batch;
  const summary = roster?.summary;
  const customers = roster?.customers ?? [];
  const isOpen = batch?.status === 'open';

  // Filter status labels by transport mode
  const relevantStatuses = (statusLabels ?? []).filter((s) => {
    if (!batch) return true;
    const set = batch.transportMode === 'air' ? AIR_STATUSES : SEA_STATUSES;
    return set.has(s.status);
  });

  const handleAddOrder = async (): Promise<void> => {
    setAddOrderError(null);
    if (!selectedOrder || !batchId) return;
    try {
      await addOrder.mutateAsync({ batchId, orderId: selectedOrder.orderId });
      setSelectedOrder(null);
      setQuery('');
      pushMessage({ tone: 'success', message: 'Order added to batch.' });
    } catch (err) {
      setAddOrderError(getDisplayErrorMessage(err, 'Failed to add order. Please try again.'));
    }
  };

  const filteredOrders = (availableOrders.data ?? []).filter((o) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      o.trackingNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerLastName.toLowerCase().includes(q) ||
      o.shippingMark.toLowerCase().includes(q) ||
      (o.description ?? '').toLowerCase().includes(q)
    );
  });

  const handleRemoveOrder = async (orderId: string, customerName: string): Promise<void> => {
    if (!batchId) return;
    setRemovingOrderId(orderId);
    try {
      await removeOrder.mutateAsync({ batchId, orderId });
      pushMessage({ tone: 'success', message: `Order removed from ${customerName}'s slot.` });
    } catch (err) {
      pushMessage({ tone: 'error', message: getDisplayErrorMessage(err, 'Failed to remove order. Please try again.') });
    } finally {
      setRemovingOrderId(null);
    }
  };

  const handleUpdateStatus = async (): Promise<void> => {
    if (!batchId || !selectedStatus) return;
    try {
      const result = await updateStatus.mutateAsync({ batchId, status: selectedStatus });
      pushMessage({ tone: 'success', message: `Status updated to "${result.statusLabel}" for ${result.updatedOrderCount} orders.` });
      setShowStatusModal(false);
      setSelectedStatus('');
    } catch (err) {
      pushMessage({ tone: 'error', message: getDisplayErrorMessage(err, 'Failed to update status. Please try again.') });
    }
  };

  const handleCloseBatch = async (): Promise<void> => {
    if (!batchId) return;
    try {
      const result = await closeBatchMutation.mutateAsync(batchId);
      pushMessage({ tone: 'success', message: `Batch closed. ${result.customersNotified} customers notified.` });
      setShowCloseConfirm(false);
      navigate(ROUTES.BATCHES);
    } catch (err) {
      pushMessage({ tone: 'error', message: getDisplayErrorMessage(err, 'Failed to close batch. Please try again.') });
      setShowCloseConfirm(false);
    }
  };

  const layoutUser = {
    displayName: user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
      : 'Staff',
    email: user?.email ?? '',
    avatarUrl: '/images/favicon.svg',
  };

  return (
    <AppLayout user={layoutUser}>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          to={ROUTES.BATCHES}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All batches
        </Link>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <Card className="p-8 text-center space-y-3">
            <p className="text-sm text-red-500">
              {error instanceof Error ? error.message : 'Failed to load batch'}
            </p>
            <Button variant="secondary" onClick={() => void refetch()}>Retry</Button>
          </Card>
        )}

        {/* Content */}
        {!isLoading && !error && batch && summary && (
          <>
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    batch.transportMode === 'air' ? 'bg-sky-50 text-sky-700' : 'bg-indigo-50 text-indigo-700',
                  )}>
                    {batch.transportMode === 'air' ? <Plane className="h-3 w-3" /> : <Ship className="h-3 w-3" />}
                    {batch.transportLabel}
                  </span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600',
                  )}>
                    {batch.statusLabel}
                  </span>
                </div>
                <h1 className="font-mono text-xl font-semibold text-gray-900">{batch.masterTrackingNumber}</h1>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {!isOpen && canManage && (
                  <Button variant="secondary" onClick={() => setShowStatusModal(true)}>
                    Update status
                  </Button>
                )}
                {isOpen && isSuperadmin && (
                  <Button
                    onClick={() => setShowCloseConfirm(true)}
                    disabled={!summary.canClose || closeBatchMutation.isPending}
                    title={!summary.canClose ? 'All orders must be verified before closing' : undefined}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Close batch
                  </Button>
                )}
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Customers', value: summary.totalCustomers, Icon: User, warn: false },
                { label: 'Orders', value: summary.totalOrders, Icon: Package, warn: false },
                { label: 'Total weight', value: `${summary.totalWeightKg} kg`, Icon: Scale, warn: false },
                {
                  label: 'Unverified orders',
                  value: summary.unverifiedOrders,
                  Icon: AlertTriangle,
                  warn: summary.unverifiedOrders > 0,
                },
              ].map((stat) => (
                <Card
                  key={stat.label}
                  className={cn('p-4', stat.warn ? 'border-amber-300 bg-amber-50' : '')}
                >
                  <stat.Icon className={cn('h-4 w-4 mb-2', stat.warn ? 'text-amber-500' : 'text-gray-400')} />
                  <p className={cn('text-2xl font-bold', stat.warn ? 'text-amber-600' : 'text-gray-900')}>
                    {stat.value}
                  </p>
                  <p className={cn('mt-0.5 text-xs', stat.warn ? 'text-amber-600' : 'text-gray-500')}>
                    {stat.label}
                  </p>
                </Card>
              ))}
            </div>

            {/* Unverified warning */}
            {summary.unverifiedOrders > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">{summary.unverifiedOrders} order{summary.unverifiedOrders !== 1 ? 's' : ''}</span> still need to be verified and priced before this batch can be closed.
                </p>
              </div>
            )}

            {/* Add order (open batch + canManage) */}
            {isOpen && canManage && (
              <Card className="p-4">
                <p className="text-sm font-medium text-gray-700">Add order manually</p>
                <p className="text-xs text-gray-400 mb-3">Orders are auto-assigned on verification. Use this only to correct missed assignments.</p>

                {/* Combobox */}
                <div ref={comboboxRef} className="relative">
                  {/* Selected order pill */}
                  {selectedOrder ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 rounded-xl border border-brand-400 bg-brand-50 px-3 py-2 text-sm">
                        <span className="font-mono text-brand-700 font-medium">{selectedOrder.trackingNumber}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-700">{selectedOrder.customerName} {selectedOrder.customerLastName}</span>
                        <span className="text-gray-400 text-xs ml-1">{selectedOrder.shippingMark}</span>
                        <button
                          type="button"
                          onClick={() => { setSelectedOrder(null); setQuery(''); setAddOrderError(null); }}
                          className="ml-auto text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <Button
                        onClick={() => void handleAddOrder()}
                        disabled={addOrder.isPending}
                      >
                        {addOrder.isPending
                          ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          : <Plus className="mr-1.5 h-4 w-4" />
                        }
                        Add
                      </Button>
                    </div>
                  ) : (
                    /* Search input */
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value);
                            setDropdownOpen(true);
                            setAddOrderError(null);
                          }}
                          onFocus={() => setDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                          placeholder="Search by tracking number, customer, or description…"
                          className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                        {availableOrders.isLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-300" />
                        )}
                      </div>
                      <Button disabled>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  )}

                  {/* Dropdown */}
                  {!selectedOrder && dropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                      {availableOrders.isLoading ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading available orders…
                        </div>
                      ) : filteredOrders.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-400">
                          {query ? 'No orders match your search.' : 'No eligible orders available for this batch.'}
                        </p>
                      ) : (
                        <ul className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                          {filteredOrders.map((order) => (
                            <li key={order.orderId}>
                              <button
                                type="button"
                                onMouseDown={() => {
                                  setSelectedOrder(order);
                                  setQuery('');
                                  setDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-semibold text-gray-800">
                                    {order.trackingNumber}
                                  </span>
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                    {order.shipmentType}
                                  </span>
                                  <span className="text-xs text-gray-400">{order.weight} kg</span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                                  <span>{order.customerName} {order.customerLastName}</span>
                                  <span className="text-gray-300">·</span>
                                  <span className="font-mono">{order.shippingMark}</span>
                                  {order.description && (
                                    <>
                                      <span className="text-gray-300">·</span>
                                      <span className="truncate max-w-50">{order.description}</span>
                                    </>
                                  )}
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {addOrderError && (
                  <p className="mt-2 text-xs text-red-500">{addOrderError}</p>
                )}
              </Card>
            )}

            {/* Roster */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {/* Roster header */}
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-semibold text-gray-900">Roster</h2>
                <span className="text-sm text-gray-400">{customers.length} customers</span>
              </div>

              {customers.length === 0 ? (
                <div className="border-t border-gray-100 p-10 text-center">
                  <p className="text-sm text-gray-400">No orders in this batch yet.</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Orders are added automatically once verified and priced. Use the form above for manual corrections.
                  </p>
                </div>
              ) : (
                <>
                  {/* Column headers */}
                  <div className={cn('grid items-center gap-4 border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400', ROW_GRID)}>
                    <span className="pl-6">Customer</span>
                    <span className="text-right">Customer Tracking No.</span>
                    <span className="text-right">Orders</span>
                    <span className="text-right">Weight</span>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-gray-100">
                    {customers.map((customer) => (
                      <CustomerRow
                        key={customer.slotId}
                        customer={customer}
                        batchOpen={isOpen}
                        canManage={canManage}
                        onRemoveOrder={(orderId) => void handleRemoveOrder(orderId, customer.customerName)}
                        removingOrderId={removingOrderId}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Update Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Update batch status</h2>
              <button
                type="button"
                onClick={() => { setShowStatusModal(false); setSelectedStatus(''); }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              The new status will be applied to all <span className="font-medium text-gray-700">{summary?.totalOrders ?? 0} orders</span> in this batch.
            </p>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Select status…</option>
              {relevantStatuses.map((s) => (
                <option key={s.status} value={s.status}>{s.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => void handleUpdateStatus()}
                disabled={!selectedStatus || updateStatus.isPending}
              >
                {updateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply status
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setShowStatusModal(false); setSelectedStatus(''); }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Close Batch Confirm Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Close this batch?</h2>
              <p className="mt-1 text-sm text-gray-500">
                This will seal the batch, finalise all invoices, and notify <span className="font-medium text-gray-700">{summary?.totalCustomers ?? 0} customers</span> of their payment amounts. The next verified order for this mode will open a new batch automatically.
              </p>
              <p className="mt-2 text-sm font-medium text-red-600">This cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-200"
                onClick={() => void handleCloseBatch()}
                disabled={closeBatchMutation.isPending}
              >
                {closeBatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Close batch
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowCloseConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
