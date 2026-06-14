import type { ReactElement } from 'react';
import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  Plane,
  Plus,
  Ship,
  Trash2,
  X,
} from 'lucide-react';
import {
  useAuth,
  useBatchRoster,
  useBatchStatusLabels,
  useAddOrderToBatch,
  useRemoveOrderFromBatch,
  useSetBatchMovementStatus,
  useCloseBatch,
  useCan,
} from '@/hooks';
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
    <div className={cn('rounded-xl border bg-white', !customer.allVerified && 'border-amber-200')}>
      {/* Customer summary row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-xl transition-colors"
      >
        <span className="flex-1 min-w-0">
          <span className="font-medium text-gray-900">{customer.customerName}</span>
          <span className="ml-2 font-mono text-xs text-gray-400">{customer.shippingMark}</span>
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-xs text-gray-600 hidden sm:block">
            {customer.batchTrackingNumber}
          </span>
          <span className="text-xs text-gray-500">{customer.orderCount} orders</span>
          <span className="text-xs text-gray-500">{customer.totalWeightKg} kg</span>
          {!customer.allVerified && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Unverified
            </span>
          )}
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Tracking number (mobile) */}
      <div className="px-4 pb-1 sm:hidden">
        <span className="font-mono text-xs text-gray-400">{customer.batchTrackingNumber}</span>
      </div>

      {/* Expanded orders */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {customer.orders.map((order: BatchRosterOrder) => (
            <div key={order.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-gray-700">{order.trackingNumber}</span>
                  {order.shipmentType === 'd2d' && (
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                      D2D
                    </span>
                  )}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {order.statusLabel}
                  </span>
                </div>
                <div className="mt-1 flex gap-3 text-xs text-gray-400">
                  {order.description && <span>{order.description}</span>}
                  <span>{order.weightKg} kg</span>
                  {order.declaredValueUsd && <span>${order.declaredValueUsd}</span>}
                </div>
              </div>
              {canManage && batchOpen && (
                <button
                  type="button"
                  onClick={() => onRemoveOrder(order.id, customer.customerName)}
                  disabled={removingOrderId === order.id}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Remove from batch"
                >
                  {removingOrderId === order.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />
                  }
                </button>
              )}
            </div>
          ))}
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

  const [addOrderId, setAddOrderId] = useState('');
  const [addOrderError, setAddOrderError] = useState<string | null>(null);
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
    const orderId = addOrderId.trim();
    if (!orderId || !batchId) return;
    try {
      await addOrder.mutateAsync({ batchId, orderId });
      setAddOrderId('');
      pushMessage({ tone: 'success', message: 'Order added to batch.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add order';
      setAddOrderError(msg);
    }
  };

  const handleRemoveOrder = async (orderId: string, customerName: string): Promise<void> => {
    if (!batchId) return;
    setRemovingOrderId(orderId);
    try {
      await removeOrder.mutateAsync({ batchId, orderId });
      pushMessage({ tone: 'success', message: `Order removed from ${customerName}'s slot.` });
    } catch (err) {
      pushMessage({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to remove order' });
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
      pushMessage({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update status' });
    }
  };

  const handleCloseBatch = async (): Promise<void> => {
    if (!batchId) return;
    try {
      const result = await closeBatchMutation.mutateAsync(batchId);
      pushMessage({ tone: 'success', message: `Batch closed. ${result.customersNotified} customers notified.` });
      setShowCloseConfirm(false);
      // Navigate to the new open batch that was auto-created
      navigate(ROUTES.BATCH_DETAIL.replace(':batchId', result.nextBatch.id));
    } catch (err) {
      pushMessage({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to close batch' });
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
                { label: 'Customers', value: summary.totalCustomers },
                { label: 'Orders', value: summary.totalOrders },
                { label: 'Total weight', value: `${summary.totalWeightKg} kg` },
                { label: 'Unverified', value: summary.unverifiedOrders, warn: summary.unverifiedOrders > 0 },
              ].map((stat) => (
                <Card key={stat.label} className={cn('p-4', stat.warn ? 'border-amber-200 bg-amber-50' : '')}>
                  <p className={cn('text-2xl font-bold', stat.warn ? 'text-amber-700' : 'text-gray-900')}>
                    {stat.value}
                  </p>
                  <p className={cn('text-xs mt-1', stat.warn ? 'text-amber-600' : 'text-gray-500')}>{stat.label}</p>
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
                <p className="text-sm font-medium text-gray-700 mb-3">Add order to batch</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addOrderId}
                    onChange={(e) => { setAddOrderId(e.target.value); setAddOrderError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleAddOrder(); }}
                    placeholder="Order ID (UUID)"
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <Button
                    onClick={() => void handleAddOrder()}
                    disabled={!addOrderId.trim() || addOrder.isPending}
                  >
                    {addOrder.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Plus className="h-4 w-4" />
                    }
                  </Button>
                </div>
                {addOrderError && (
                  <p className="mt-2 text-xs text-red-500">{addOrderError}</p>
                )}
              </Card>
            )}

            {/* Roster */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Roster</h2>
                <span className="text-sm text-gray-400">{customers.length} customers</span>
              </div>

              {customers.length === 0 ? (
                <Card className="p-10 text-center">
                  <p className="text-sm text-gray-400">No customers in this batch yet.</p>
                  {isOpen && canManage && (
                    <p className="mt-1 text-sm text-gray-400">Add verified orders above to start filling the batch.</p>
                  )}
                </Card>
              ) : (
                <div className="space-y-2">
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
                This will seal the batch, finalise all invoices, and notify <span className="font-medium text-gray-700">{summary?.totalCustomers ?? 0} customers</span> of their payment amounts. A new open batch will be created automatically.
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
