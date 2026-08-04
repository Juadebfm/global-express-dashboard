import type { ReactElement, ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Lock,
  Package,
  Plane,
  Plus,
  Scale,
  Search,
  Ship,
  Upload,
  User,
  X,
} from 'lucide-react';
import {
  useAuth,
  useBatchRoster,
  useBatchMovement,
  useAvailableOrdersForBatch,
  useAddOrderToBatch,
  useRemoveOrderFromBatch,
  useAdvanceBatchMovement,
  useCloseBatch,
  useCapability,
} from '@/hooks';
import { useBatchDocuments, useUploadBatchDocument } from '@/hooks/useBatchDocuments';
import type { AvailableOrder } from '@/services';
import { getDisplayErrorMessage } from '@/lib/feedback';
import { AppLayout } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useFeedbackStore } from '@/store';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';
import type {
  BatchRosterCustomer,
  BatchRosterOrder,
  BatchDocumentType,
  BatchMovementAction,
} from '@/types';

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
    <>
      {/* Summary row */}
      <tr
        onClick={() => setExpanded((v) => !v)}
        className="cursor-pointer hover:bg-gray-50 transition-colors"
      >
        {/* Customer name + mark */}
        <td className="px-4 py-4">
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
              <p className="mt-0.5 max-w-[180px] truncate font-mono text-xs text-gray-400" title={customer.shippingMark ?? undefined}>Mark: {customer.shippingMark}</p>
            </div>
          </div>
        </td>

        {/* Tracking number */}
        <td className="px-4 py-4 text-left">
          <p className="font-mono text-sm font-semibold text-gray-800">{customer.batchTrackingNumber}</p>
          <p className="text-xs text-gray-400">customer tracking no.</p>
        </td>

        {/* Orders */}
        <td className="px-4 py-4 text-right">
          <span className="text-sm text-gray-700">{customer.orderCount} orders</span>
        </td>

        {/* Weight */}
        <td className="px-4 py-4 text-right">
          <span className="text-sm text-gray-700">{customer.totalWeightKg} kg</span>
        </td>

        {/* Actions placeholder */}
        <td className="px-4 py-4" />
      </tr>

      {/* Expanded order rows */}
      {expanded && customer.orders.map((order: BatchRosterOrder) => {
        const isVerified = order.isWarehouseVerifiedAndPriced;
        const hasMovementStatus = Boolean(
          order.statusLabel && order.status !== 'WAREHOUSE_VERIFIED_PRICED',
        );
        return (
          <tr key={order.id} className="bg-gray-50/60">
            {/* Tracking + description — indented */}
            <td className="py-3 pl-12 pr-4" colSpan={2}>
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  to={`${ROUTES.ORDERS}?select=${order.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-mono text-sm font-semibold text-brand-500 shrink-0 hover:text-brand-600"
                >
                  {order.trackingNumber}
                </Link>
                {order.description && (
                  <span className="text-sm text-gray-500 truncate">{order.description}</span>
                )}
              </div>
            </td>

            {/* Badges (mode + status) */}
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <ShipmentTypeBadge type={order.shipmentType ?? ''} label={order.shipmentTypeLabel} />
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Verified &amp; priced
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Needs verification
                  </span>
                )}
                {hasMovementStatus && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {order.statusLabel}
                  </span>
                )}
              </div>
            </td>

            {/* Weight */}
            <td className="px-4 py-3 text-right">
              <span className="text-sm text-gray-500">{order.weightKg ?? '—'} kg</span>
            </td>

            {/* Remove action */}
            <td className="px-4 py-3 text-right">
              <div className="flex justify-end gap-2">
              {!isVerified && (
                <Link
                  to={`${ROUTES.ORDERS}?select=${order.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
                >
                  Review order
                </Link>
              )}
              {canManage && batchOpen && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemoveOrder(order.id, customer.customerName); }}
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
            </td>
          </tr>
        );
      })}
    </>
  );
}

function MobileCustomerCard({
  customer,
  batchOpen,
  canManage,
  onRemoveOrder,
  removingOrderId,
}: {
  customer: BatchRosterCustomer;
  batchOpen: boolean;
  canManage: boolean;
  onRemoveOrder: (orderId: string) => void;
  removingOrderId: string | null;
}): ReactElement {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="px-4 py-4">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{customer.customerName}</span>
            {!customer.allVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                Unverified
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs font-mono text-gray-400 truncate">Mark: {customer.shippingMark}</p>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />}
      </button>
      {/* Stats row */}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Tracking No.</p>
          <p className="text-xs font-mono font-semibold text-gray-800">{customer.batchTrackingNumber}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Orders / Weight</p>
          <p className="text-xs text-gray-700">{customer.orderCount} orders · {customer.totalWeightKg} kg</p>
        </div>
      </div>
      {/* Expanded orders */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {customer.orders.map((order: BatchRosterOrder) => {
            const isVerified = order.isWarehouseVerifiedAndPriced;
            const hasMovementStatus = Boolean(
              order.statusLabel && order.status !== 'WAREHOUSE_VERIFIED_PRICED',
            );
            return (
              <div key={order.id} className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`${ROUTES.ORDERS}?select=${order.id}`}
                    className="font-mono text-sm font-semibold text-brand-500 hover:text-brand-600"
                  >
                    {order.trackingNumber}
                  </Link>
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Verified &amp; priced
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Needs verification
                    </span>
                  )}
                </div>
                {hasMovementStatus && <p className="mt-1 text-xs text-gray-500">{order.statusLabel}</p>}
                {order.description && (
                  <p className="mt-0.5 text-xs text-gray-500 truncate">{order.description}</p>
                )}
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{order.weightKg ?? '—'} kg</span>
                  {!isVerified && (
                    <Link
                      to={`${ROUTES.ORDERS}?select=${order.id}`}
                      className="text-xs font-medium text-amber-700 hover:text-amber-800"
                    >
                      Review order
                    </Link>
                  )}
                  {canManage && batchOpen && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRemoveOrder(order.id); }}
                      disabled={removingOrderId === order.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                    >
                      {removingOrderId === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
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

const AIR_DOCUMENT_TYPES: { value: BatchDocumentType; label: string }[] = [
  { value: 'mawb', label: 'MAWB (Master Airway Bill)' },
  { value: 'other', label: 'Other' },
];

const SEA_DOCUMENT_TYPES: { value: BatchDocumentType; label: string }[] = [
  { value: 'bill_of_lading', label: 'Bill of Lading' },
  { value: 'container_photo', label: 'Container Photo' },
  { value: 'vessel_photo', label: 'Vessel Photo' },
  { value: 'other', label: 'Other' },
];

function BatchDocumentsSection({
  batchId,
  transportMode,
  canManage,
  pushMessage,
}: {
  batchId: string;
  transportMode: string;
  canManage: boolean;
  pushMessage: (msg: { tone: 'success' | 'error'; message: string }) => void;
}): ReactElement {
  const { data: documents, isLoading } = useBatchDocuments(batchId);
  const upload = useUploadBatchDocument(batchId);
  const [docType, setDocType] = useState<BatchDocumentType>('other');
  const fileRef = useRef<HTMLInputElement>(null);

  const docTypes = transportMode === 'air' ? AIR_DOCUMENT_TYPES : SEA_DOCUMENT_TYPES;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await upload.mutateAsync({ file, documentType: docType });
      pushMessage({ tone: 'success', message: 'Document uploaded.' });
    } catch (err) {
      pushMessage({ tone: 'error', message: getDisplayErrorMessage(err, 'Upload failed. Please try again.') });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="font-semibold text-gray-900">Documents</h2>
        {canManage && (
          <div className="flex items-center gap-2">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as BatchDocumentType)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {docTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <Upload className="mr-1.5 h-4 w-4" />
              }
              Upload
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="application/pdf,image/*"
              onChange={(e) => void handleFileChange(e)}
            />
          </div>
        )}
      </div>

      <div className="border-t border-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        ) : !documents?.length ? (
          <div className="flex flex-col items-center gap-1 py-10 text-center">
            <FileText className="h-8 w-8 text-gray-200" />
            <p className="text-sm text-gray-400">No documents uploaded yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 px-5 py-3">
                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {doc.fileName ?? doc.documentType.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{doc.documentType.replace(/_/g, ' ')}</p>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function BatchDetailPage(): ReactElement {
  const { batchId } = useParams<{ batchId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  // Roster edits (add/remove order, movement status) are guarded by
  // requireCapability('batches.manage'); closing a batch is a separate,
  // stronger grant, batches.finalise. Do not fall back to the retired
  // canManageShipmentBatches profile flag: only the live matrix may open
  // capability-gated batch controls.
  const canManage = useCapability('batches.manage');
  const canFinalise = useCapability('batches.finalise');

  const { data: roster, isLoading, error, refetch } = useBatchRoster(batchId);
  const { data: movement, isLoading: isMovementLoading } = useBatchMovement(batchId);

  const addOrder = useAddOrderToBatch();
  const removeOrder = useRemoveOrderFromBatch();
  const advanceMovement = useAdvanceBatchMovement();
  const closeBatchMutation = useCloseBatch();
  const availableOrders = useAvailableOrdersForBatch(batchId, canManage);

  // Combobox state for "Add order"
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AvailableOrder | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addOrderError, setAddOrderError] = useState<string | null>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const [removingOrderId, setRemovingOrderId] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<{ orderId: string; customerName: string } | null>(null);
  const [selectedMovementAction, setSelectedMovementAction] = useState<BatchMovementAction | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const batch = roster?.batch;
  const summary = roster?.summary;
  const customers = roster?.customers ?? [];
  const isOpen = batch?.status === 'open';

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

  const handleRemoveOrder = (orderId: string, customerName: string): void => {
    setRemoveConfirm({ orderId, customerName });
  };

  const confirmRemoveOrder = async (): Promise<void> => {
    if (!batchId || !removeConfirm) return;
    const { orderId, customerName } = removeConfirm;
    setRemovingOrderId(orderId);
    try {
      await removeOrder.mutateAsync({ batchId, orderId });
      setRemoveConfirm(null);
      pushMessage({ tone: 'success', message: `Order removed from ${customerName}'s slot.` });
    } catch (err) {
      pushMessage({ tone: 'error', message: getDisplayErrorMessage(err, 'Failed to remove order. Please try again.') });
    } finally {
      setRemovingOrderId(null);
    }
  };

  const confirmMovementAction = async (): Promise<void> => {
    if (!batchId || !selectedMovementAction) return;
    try {
      const result = await advanceMovement.mutateAsync({
        batchId,
        statusV2: selectedMovementAction.statusV2,
      });
      pushMessage({
        tone: 'success',
        message: `Batch moved to ${result.movement.currentStatusLabel} for ${result.updatedOrderCount} orders.`,
      });
      setSelectedMovementAction(null);
    } catch (err) {
      pushMessage({ tone: 'error', message: getDisplayErrorMessage(err, 'Unable to update batch movement. Please try again.') });
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
    avatarUrl: user?.avatarUrl ?? null,
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
                  {!isMovementLoading && movement?.currentStatusLabel && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {movement.currentStatusLabel}
                    </span>
                  )}
                </div>
                <h1 className="font-mono text-xl font-semibold text-gray-900">{batch.masterTrackingNumber}</h1>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {isOpen && canFinalise && (
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

            {/* The backend decides which batch movement actions are valid. */}
            {!isOpen && movement && (
              <Card className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Batch movement</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Current stage: <span className="font-medium text-gray-700">{movement.currentStatusLabel ?? 'No movement stage recorded'}</span>
                    </p>
                  </div>
                  {canManage && movement.allowedActions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {movement.allowedActions.map((action) => (
                        <Button
                          key={action.statusV2}
                          variant={action.kind === 'advance' ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => setSelectedMovementAction(action)}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                {canManage && movement.allowedActions.length === 0 && movement.currentStatus === 'IN_TRANSIT_TO_LAGOS_OFFICE' && (
                  <p className="mt-3 text-sm text-gray-500">
                    No further batch-level movement is available. Pickup and local delivery are managed per order.
                  </p>
                )}
                {canManage && movement.allowedActions.length === 0 && movement.currentStatus !== 'IN_TRANSIT_TO_LAGOS_OFFICE' && (
                  <p className="mt-3 text-sm text-gray-500">No batch movement action is currently available.</p>
                )}
              </Card>
            )}

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
                        <span className="ml-1 max-w-[120px] truncate text-xs text-gray-400" title={selectedOrder.shippingMark ?? undefined}>{selectedOrder.shippingMark}</span>
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
                                  <span className="max-w-[120px] truncate font-mono" title={order.shippingMark ?? undefined}>{order.shippingMark}</span>
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
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
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
                  {/* Mobile: card list */}
                  <div className="divide-y divide-gray-100 md:hidden border-t border-gray-100">
                    {customers.map((customer) => (
                      <MobileCustomerCard
                        key={customer.slotId}
                        customer={customer}
                        batchOpen={isOpen}
                        canManage={canManage}
                        onRemoveOrder={(orderId) => void handleRemoveOrder(orderId, customer.customerName)}
                        removingOrderId={removingOrderId}
                      />
                    ))}
                  </div>
                  {/* Desktop: existing table */}
                  <table className="w-full text-sm border-t border-gray-100 hidden md:table">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 pb-3 pt-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                          <span className="pl-6">Customer</span>
                        </th>
                        <th className="px-4 pb-3 pt-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Customer Tracking No.</th>
                        <th className="px-4 pb-3 pt-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Orders</th>
                        <th className="px-4 pb-3 pt-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Weight</th>
                        <th className="px-4 pb-3 pt-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
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
                    </tbody>
                  </table>
                </>
              )}
            </div>

            {/* Documents section */}
            {batchId && (
              <BatchDocumentsSection
                batchId={batchId}
                transportMode={batch.transportMode}
                canManage={canManage}
                pushMessage={pushMessage}
              />
            )}
          </>
        )}
      </div>

      {/* Movement confirmation — actions come exclusively from the backend. */}
      {selectedMovementAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedMovementAction.kind === 'advance'
                  ? `Move batch to ${selectedMovementAction.label}?`
                  : `${selectedMovementAction.label}?`}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedMovementAction(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                aria-label="Close confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              {selectedMovementAction.description}
            </p>
            <p className="text-sm text-gray-500">
              This applies to all <span className="font-medium text-gray-700">{summary?.totalOrders ?? 0} orders</span> in this batch.
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => void confirmMovementAction()}
                disabled={advanceMovement.isPending}
              >
                {advanceMovement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedMovementAction(null)}
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

      <ConfirmModal
        isOpen={!!removeConfirm}
        tone="danger"
        title="Remove order from batch?"
        message={removeConfirm ? `${removeConfirm.customerName}'s order will be removed from this batch and returned to the assignment queue.` : ''}
        confirmLabel="Remove order"
        isLoading={!!removingOrderId}
        onConfirm={() => void confirmRemoveOrder()}
        onCancel={() => setRemoveConfirm(null)}
      />
    </AppLayout>
  );
}
