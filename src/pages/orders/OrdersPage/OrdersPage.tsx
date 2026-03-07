import type { FormEvent, ReactElement } from 'react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  useAuth,
  useDashboardData,
  useDeleteOrderImage,
  useOrderDetail,
  useOrderImages,
  useOrders,
  useOrderTimeline,
  useRecordOfflinePayment,
  useRestrictedGoods,
  useSearch,
  useSpecialPackagingTypes,
  useUpdateOrderStatus,
  useUpdatePickupRep,
  useUpload,
  useWarehouseVerify,
} from '@/hooks';
import type { ApiOrder, RecordOfflinePayload, WarehousePackage } from '@/types';
import { Button } from '@/components/ui';
import { AppShell, PageHeader } from '@/pages/shared';
import { ROUTES } from '@/constants';
import { getStatusStyle } from '@/lib/statusUtils';
import { cn, formatCurrency, formatDate, resolveLocation } from '@/utils';

const OPERATOR_FILTERS = [
  'all',
  'PREORDER_SUBMITTED',
  'AWAITING_WAREHOUSE_RECEIPT',
  'WAREHOUSE_RECEIVED',
  'WAREHOUSE_VERIFIED_PRICED',
] as const;

const EXCEPTION_STATUSES = [
  'ON_HOLD',
  'CANCELLED',
  'RESTRICTED_ITEM_REJECTED',
  'RESTRICTED_ITEM_OVERRIDE_APPROVED',
] as const;

const AIR_FLOW = [
  'DISPATCHED_TO_ORIGIN_AIRPORT',
  'AT_ORIGIN_AIRPORT',
  'BOARDED_ON_FLIGHT',
  'FLIGHT_DEPARTED',
  'FLIGHT_LANDED_LAGOS',
  'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE',
  'READY_FOR_PICKUP',
  'PICKED_UP_COMPLETED',
] as const;

const SEA_FLOW = [
  'DISPATCHED_TO_ORIGIN_PORT',
  'AT_ORIGIN_PORT',
  'LOADED_ON_VESSEL',
  'VESSEL_DEPARTED',
  'VESSEL_ARRIVED_LAGOS_PORT',
  'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE',
  'READY_FOR_PICKUP',
  'PICKED_UP_COMPLETED',
] as const;

type Mode = 'air' | 'sea' | '';
type AnyRecord = Record<string, unknown>;

interface OrderView {
  id: string;
  trackingNumber: string;
  statusV2: string;
  statusLabel: string;
  senderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  shipmentType: Mode;
  transportMode: Mode;
  paymentCollectionStatus: string;
  amountDue: number | null;
  finalChargeUsd: number | null;
  pricingSource: string;
  pickupRepName: string;
  pickupRepPhone: string;
  createdAt: string;
  origin: string;
  destination: string;
}

interface PackageForm {
  id: number;
  description: string;
  itemType: string;
  quantity: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weightKg: string;
  cbm: string;
  specialPackagingType: string;
  isRestricted: boolean;
  restrictedReason: string;
  restrictedOverrideApproved: boolean;
  restrictedOverrideReason: string;
}

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as AnyRecord)
    : null;
}

function pick(record: AnyRecord | null, keys: string[]): unknown {
  if (!record) return undefined;
  for (const key of keys) if (key in record) return record[key];
  return undefined;
}

function readString(record: AnyRecord | null, keys: string[]): string {
  const value = pick(record, keys);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return '';
}

function readNumber(record: AnyRecord | null, keys: string[]): number | null {
  const value = pick(record, keys);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseMode(value: unknown): Mode {
  if (typeof value !== 'string') return '';
  const normalized = value.toLowerCase().trim();
  if (normalized === 'air') return 'air';
  if (normalized === 'sea' || normalized === 'ocean') return 'sea';
  return '';
}

function statusLabel(status: string): string {
  return status
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parsePositive(value: string): number | undefined {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parsePositiveInt(value: string): number | undefined {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function newPackageForm(id: number): PackageForm {
  return {
    id,
    description: '',
    itemType: '',
    quantity: '1',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    weightKg: '',
    cbm: '',
    specialPackagingType: '',
    isRestricted: false,
    restrictedReason: '',
    restrictedOverrideApproved: false,
    restrictedOverrideReason: '',
  };
}

function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toView(order: ApiOrder): OrderView {
  const record = asRecord(order) ?? {};
  const sender = asRecord(pick(record, ['sender', 'customer', 'user']));
  const shipmentType = parseMode(pick(record, ['shipmentType']));
  const transportMode = parseMode(pick(record, ['transportMode'])) || shipmentType;
  return {
    id: readString(record, ['id', 'orderId']) || order.id,
    trackingNumber: readString(record, ['trackingNumber']) || order.trackingNumber,
    statusV2: readString(record, ['statusV2']) || order.statusV2,
    statusLabel: readString(record, ['statusLabel']) || order.statusLabel,
    senderId: readString(record, ['senderId', 'userId', 'customerId']) || readString(sender, ['id']),
    recipientName: readString(record, ['recipientName']),
    recipientPhone: readString(record, ['recipientPhone']),
    recipientAddress: resolveLocation(pick(record, ['recipientAddress'])),
    shipmentType,
    transportMode,
    paymentCollectionStatus: readString(record, ['paymentCollectionStatus']),
    amountDue: readNumber(record, ['amountDue']),
    finalChargeUsd: readNumber(record, ['finalChargeUsd']),
    pricingSource: readString(record, ['pricingSource']),
    pickupRepName: readString(record, ['pickupRepName']),
    pickupRepPhone: readString(record, ['pickupRepPhone']),
    createdAt: readString(record, ['createdAt']),
    origin: resolveLocation(pick(record, ['origin', 'originAddress'])) || 'Unknown',
    destination: resolveLocation(pick(record, ['destination', 'destinationAddress', 'recipientAddress'])) || 'Unknown',
  };
}

function nextStatus(current: string, mode: Mode): string | null {
  if (current === 'PREORDER_SUBMITTED') return 'AWAITING_WAREHOUSE_RECEIPT';
  if (current === 'AWAITING_WAREHOUSE_RECEIPT') return 'WAREHOUSE_RECEIVED';
  if (current === 'WAREHOUSE_VERIFIED_PRICED') {
    if (mode === 'air') return 'DISPATCHED_TO_ORIGIN_AIRPORT';
    if (mode === 'sea') return 'DISPATCHED_TO_ORIGIN_PORT';
  }
  const airIndex = AIR_FLOW.indexOf(current as (typeof AIR_FLOW)[number]);
  if (airIndex >= 0) return AIR_FLOW[airIndex + 1] ?? null;
  const seaIndex = SEA_FLOW.indexOf(current as (typeof SEA_FLOW)[number]);
  if (seaIndex >= 0) return SEA_FLOW[seaIndex + 1] ?? null;
  return null;
}

function mapPackageForm(pkg: PackageForm): WarehousePackage {
  return {
    description: pkg.description.trim() || undefined,
    itemType: pkg.itemType.trim() || undefined,
    quantity: parsePositiveInt(pkg.quantity),
    lengthCm: parsePositive(pkg.lengthCm),
    widthCm: parsePositive(pkg.widthCm),
    heightCm: parsePositive(pkg.heightCm),
    weightKg: parsePositive(pkg.weightKg),
    cbm: parsePositive(pkg.cbm),
    specialPackagingType: pkg.specialPackagingType || undefined,
    isRestricted: pkg.isRestricted,
    restrictedReason: pkg.isRestricted ? (pkg.restrictedReason.trim() || undefined) : undefined,
    restrictedOverrideApproved: pkg.isRestricted ? pkg.restrictedOverrideApproved : undefined,
    restrictedOverrideReason: pkg.isRestricted && pkg.restrictedOverrideApproved
      ? (pkg.restrictedOverrideReason.trim() || undefined)
      : undefined,
  };
}

function includesQuery(row: { trackingNumber: string; statusV2: string; statusLabel: string; origin: string | null; destination: string | null }, query: string): boolean {
  if (!query.trim()) return true;
  const haystack = `${row.trackingNumber} ${row.statusV2} ${row.statusLabel} ${row.origin ?? ''} ${row.destination ?? ''}`.toLowerCase();
  return haystack.includes(query.toLowerCase().trim());
}

export function OrdersPage(): ReactElement {
  const { t } = useTranslation(['orders', 'shipments']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOperator = user?.role === 'staff' || user?.role === 'admin' || user?.role === 'superadmin';
  const canDeleteImage = user?.role === 'admin' || user?.role === 'superadmin';
  const canApproveOverride = user?.role === 'admin' || user?.role === 'superadmin';
  const { query, setQuery } = useSearch();

  const [activeFilter, setActiveFilter] = useState<(typeof OPERATOR_FILTERS)[number]>('all');
  const [selectedOrderIdState, setSelectedOrderIdState] = useState<string | null>(null);
  const [nextPackageId, setNextPackageId] = useState(2);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [pickupNotice, setPickupNotice] = useState<string | null>(null);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [transportMode, setTransportMode] = useState<'air' | 'sea' | ''>('');
  const [departureDate, setDepartureDate] = useState('');
  const [manualCharge, setManualCharge] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [packages, setPackages] = useState<PackageForm[]>([newPackageForm(1)]);
  const [offlineUserId, setOfflineUserId] = useState('');
  const [offlineAmount, setOfflineAmount] = useState('');
  const [offlineType, setOfflineType] = useState<RecordOfflinePayload['paymentType']>('transfer');
  const [offlineReference, setOfflineReference] = useState('');
  const [offlineNote, setOfflineNote] = useState('');
  const [pickupName, setPickupName] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const statusFilter = isOperator && activeFilter !== 'all' ? activeFilter : undefined;
  const { data: appData, isLoading: appLoading, error: appError } = useDashboardData();
  const { orders, total, isLoading: ordersLoading, error: ordersError } = useOrders(1, 100, statusFilter);
  const visibleOrders = useMemo(() => orders.filter((order) => includesQuery(order, query)), [orders, query]);

  const selectedOrderId = useMemo(() => {
    if (!visibleOrders.length) return null;
    if (selectedOrderIdState && visibleOrders.some((order) => order.id === selectedOrderIdState)) {
      return selectedOrderIdState;
    }
    return visibleOrders[0].id;
  }, [visibleOrders, selectedOrderIdState]);

  const orderDetailQuery = useOrderDetail(selectedOrderId ?? undefined);
  const view = useMemo(() => (orderDetailQuery.data ? toView(orderDetailQuery.data) : null), [orderDetailQuery.data]);
  const timelineQuery = useOrderTimeline(selectedOrderId ?? undefined, Boolean(selectedOrderId));
  const imagesQuery = useOrderImages(selectedOrderId ?? undefined);
  const restrictedGoodsQuery = useRestrictedGoods({}, { enabled: isOperator });
  const packagingTypesQuery = useSpecialPackagingTypes({ enabled: isOperator });

  const updateStatus = useUpdateOrderStatus();
  const verifyWarehouse = useWarehouseVerify();
  const recordOfflinePayment = useRecordOfflinePayment();
  const updatePickupRep = useUpdatePickupRep();
  const uploadImage = useUpload();
  const deleteOrderImage = useDeleteOrderImage();

  const resetLocalForms = (): void => {
    setTransportMode('');
    setPackages([newPackageForm(1)]);
    setNextPackageId(2);
    setDepartureDate('');
    setManualCharge('');
    setManualReason('');
    setOfflineUserId('');
    setOfflineAmount('');
    setOfflineType('transfer');
    setOfflineReference('');
    setOfflineNote('');
    setPickupName('');
    setPickupPhone('');
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setStatusNotice(null);
    setStatusError(null);
    setVerifyNotice(null);
    setVerifyError(null);
    setPaymentNotice(null);
    setPaymentError(null);
    setPickupNotice(null);
    setPickupError(null);
    setImageNotice(null);
    setImageError(null);
  };

  const timelineRows = useMemo(() => {
    const rows = timelineQuery.data?.timeline ?? [];
    return [...rows].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [timelineQuery.data]);
  const packagingTypes = Array.isArray(packagingTypesQuery.data) ? packagingTypesQuery.data : [];
  const orderImages = Array.isArray(imagesQuery.data) ? imagesQuery.data : [];

  const effectiveTransportMode: 'air' | 'sea' = transportMode
    || ((view?.transportMode || view?.shipmentType || 'air') === 'sea' ? 'sea' : 'air');
  const effectiveOfflineUserId = offlineUserId || view?.senderId || '';
  const effectivePickupName = pickupName || view?.pickupRepName || '';
  const effectivePickupPhone = pickupPhone || view?.pickupRepPhone || '';

  const handleSelectOrder = (orderId: string): void => {
    setSelectedOrderIdState(orderId);
    resetLocalForms();
  };

  const handleStatus = async (statusV2: string): Promise<void> => {
    if (!selectedOrderId) return;
    setStatusNotice(null);
    setStatusError(null);
    try {
      await updateStatus.mutateAsync({ orderId: selectedOrderId, statusV2 });
      setStatusNotice(`Order moved to ${statusLabel(statusV2)}.`);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handlePackageChange = (id: number, key: keyof PackageForm, value: string | boolean): void => {
    setPackages((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!selectedOrderId) return;
    setVerifyNotice(null);
    setVerifyError(null);
    if (packages.some((pkg) => pkg.isRestricted && !pkg.restrictedReason.trim())) {
      setVerifyError('Provide restricted reason for restricted packages.');
      return;
    }
    if (!canApproveOverride && packages.some((pkg) => pkg.restrictedOverrideApproved)) {
      setVerifyError('Only admin/superadmin can approve restricted overrides.');
      return;
    }
    const manualFinalChargeUsd = manualCharge.trim() ? parsePositive(manualCharge) : undefined;
    if (manualFinalChargeUsd !== undefined && !manualReason.trim()) {
      setVerifyError('manualAdjustmentReason is required with manualFinalChargeUsd.');
      return;
    }
    try {
      const result = await verifyWarehouse.mutateAsync({
        orderId: selectedOrderId,
        payload: {
          transportMode: effectiveTransportMode,
          departureDate: toIso(departureDate),
          packages: packages.map(mapPackageForm),
          manualFinalChargeUsd,
          manualAdjustmentReason: manualReason.trim() || undefined,
        },
      });
      setVerifyNotice(`Warehouse verified. Final charge: ${formatCurrency(result.finalChargeUsd, 'USD')}`);
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : 'Warehouse verification failed');
    }
  };

  const handleOfflinePayment = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!selectedOrderId) return;
    setPaymentNotice(null);
    setPaymentError(null);
    const amount = parsePositive(offlineAmount);
    if (!effectiveOfflineUserId.trim()) {
      setPaymentError('userId is required.');
      return;
    }
    if (!amount) {
      setPaymentError('amount must be a positive number.');
      return;
    }
    try {
      await recordOfflinePayment.mutateAsync({
        orderId: selectedOrderId,
        payload: {
          userId: effectiveOfflineUserId.trim(),
          amount,
          paymentType: offlineType,
          proofReference: offlineReference.trim() || undefined,
          note: offlineNote.trim() || undefined,
        },
      });
      setPaymentNotice('Offline payment recorded.');
      setOfflineAmount('');
      setOfflineReference('');
      setOfflineNote('');
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Failed to record offline payment');
    }
  };

  const handlePickupRep = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!selectedOrderId) return;
    setPickupNotice(null);
    setPickupError(null);
    if (!effectivePickupName.trim()) {
      setPickupError('pickupRepName is required.');
      return;
    }
    try {
      await updatePickupRep.mutateAsync({
        orderId: selectedOrderId,
        pickupRepName: effectivePickupName.trim(),
        pickupRepPhone: effectivePickupPhone.trim(),
      });
      setPickupNotice('Pickup representative updated.');
    } catch (error) {
      setPickupError(error instanceof Error ? error.message : 'Failed to update pickup representative');
    }
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!selectedOrderId) return;
    setImageNotice(null);
    setImageError(null);
    if (files.length === 0) {
      setImageError('Select at least one image.');
      return;
    }
    try {
      for (const file of files) await uploadImage.mutateAsync({ orderId: selectedOrderId, file });
      setImageNotice(`Uploaded ${files.length} image(s).`);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleDeleteImage = async (imageId: string): Promise<void> => {
    if (!selectedOrderId) return;
    setImageNotice(null);
    setImageError(null);
    try {
      await deleteOrderImage.mutateAsync({ imageId, orderId: selectedOrderId });
      setImageNotice('Image deleted.');
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Failed to delete image');
    }
  };

  const loading = appLoading || ordersLoading;

  return (
    <AppShell data={appData} isLoading={loading} error={appError} loadingLabel={t('orders:loadingLabel')}>
      <div className="space-y-6">
        <PageHeader
          title={t('orders:pageTitle')}
          subtitle={t('orders:subtitle')}
          actions={
            isOperator ? (
              <Button size="sm" variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate(ROUTES.NEW_SHIPMENT)}>
                {t('orders:createClientOrder')}
              </Button>
            ) : undefined
          }
        />

        {ordersError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ordersError}
          </div>
        )}

        {isOperator && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Queue Filter</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {OPERATOR_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                    activeFilter === filter ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {filter === 'all'
                    ? 'All'
                    : t(`shipments:statusV2.${filter}`, { defaultValue: statusLabel(filter) })}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-4">
              <h2 className="text-base font-semibold text-gray-900">Order Queue</h2>
              <p className="mt-1 text-xs text-gray-500">{visibleOrders.length} shown / {total} total</p>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by tracking, status, or location"
                className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div className="max-h-[72vh] overflow-y-auto">
              {visibleOrders.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-gray-500">No orders found.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {visibleOrders.map((order) => {
                    const style = getStatusStyle(order.statusV2 || order.status);
                    const selected = order.id === selectedOrderId;
                    return (
                      <li key={order.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectOrder(order.id)}
                          className={cn(
                            'w-full px-4 py-4 text-left transition',
                            selected ? 'bg-brand-50' : 'hover:bg-gray-50'
                          )}
                        >
                          <p className="text-sm font-semibold text-gray-900">{order.trackingNumber}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {resolveLocation(order.origin)} {'->'} {resolveLocation(order.destination)}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <p className="text-xs text-gray-400">
                              {order.createdAt
                                ? formatDate(order.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })
                                : '-'}
                            </p>
                            <span className={cn('rounded-full px-2 py-1 text-[11px] font-semibold', style.bgClass, style.textClass)}>
                              {order.statusV2
                                ? t(`shipments:statusV2.${order.statusV2}`, { defaultValue: order.statusLabel || statusLabel(order.statusV2) })
                                : (order.statusLabel || statusLabel(order.status))}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="space-y-6">
            {!selectedOrderId ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                Select an order to continue.
              </div>
            ) : orderDetailQuery.isLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
                <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-gray-400" />
                Loading order details...
              </div>
            ) : orderDetailQuery.error || !view ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {orderDetailQuery.error instanceof Error ? orderDetailQuery.error.message : 'Failed to load order detail.'}
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{view.trackingNumber}</h2>
                      <p className="mt-1 text-sm text-gray-500">{view.origin} {'->'} {view.destination}</p>
                    </div>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', getStatusStyle(view.statusV2).bgClass, getStatusStyle(view.statusV2).textClass)}>
                      {t(`shipments:statusV2.${view.statusV2}`, { defaultValue: view.statusLabel || statusLabel(view.statusV2) })}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Info label="Recipient" value={view.recipientName || '-'} />
                    <Info label="Recipient Phone" value={view.recipientPhone || '-'} />
                    <Info label="Recipient Address" value={view.recipientAddress || '-'} />
                    <Info label="Sender ID" value={view.senderId || '-'} />
                    <Info label="Transport Mode" value={view.transportMode || view.shipmentType || '-'} />
                    <Info label="Payment Status" value={view.paymentCollectionStatus || '-'} />
                    <Info label="Amount Due" value={view.amountDue !== null ? formatCurrency(view.amountDue, 'USD') : '-'} />
                    <Info label="Final Charge" value={view.finalChargeUsd !== null ? formatCurrency(view.finalChargeUsd, 'USD') : '-'} />
                    <Info label="Pricing Source" value={view.pricingSource || '-'} />
                    <Info label="Created" value={view.createdAt ? formatDate(view.createdAt, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'} />
                  </div>
                </div>

                {isOperator && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <h3 className="text-base font-semibold text-gray-900">Status Progression</h3>
                    <p className="mt-1 text-sm text-gray-500">Use sequential status updates; exceptions are available below.</p>
                    {view.statusV2 === 'WAREHOUSE_RECEIVED' && (
                      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        WAREHOUSE_VERIFIED_PRICED must be set through warehouse verification.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nextStatus(view.statusV2, view.transportMode || view.shipmentType) ? (
                        <Button
                          size="sm"
                          variant="primary"
                          isLoading={updateStatus.isPending}
                          onClick={() => void handleStatus(nextStatus(view.statusV2, view.transportMode || view.shipmentType)!)}
                        >
                          Move to {t(`shipments:statusV2.${nextStatus(view.statusV2, view.transportMode || view.shipmentType)!}`, { defaultValue: statusLabel(nextStatus(view.statusV2, view.transportMode || view.shipmentType)!) })}
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-500">No sequential next status available.</span>
                      )}
                    </div>

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Exception Statuses</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {EXCEPTION_STATUSES.map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant="secondary"
                          isLoading={updateStatus.isPending}
                          onClick={() => void handleStatus(status)}
                        >
                          {t(`shipments:statusV2.${status}`, { defaultValue: statusLabel(status) })}
                        </Button>
                      ))}
                    </div>

                    {statusNotice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{statusNotice}</p>}
                    {statusError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{statusError}</p>}
                  </div>
                )}

                {isOperator && (
                  <form className="rounded-2xl border border-gray-200 bg-white p-5" onSubmit={(event) => void handleVerify(event)}>
                    <h3 className="text-base font-semibold text-gray-900">Warehouse Verification & Pricing</h3>
                    <p className="mt-1 text-sm text-gray-500">Verify packages, set transport mode, and compute pricing.</p>
                    {restrictedGoodsQuery.error && (
                      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        Restricted goods list unavailable: {restrictedGoodsQuery.error instanceof Error ? restrictedGoodsQuery.error.message : 'Unknown error'}
                      </p>
                    )}
                    {packagingTypesQuery.error && (
                      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        Special packaging list unavailable: {packagingTypesQuery.error instanceof Error ? packagingTypesQuery.error.message : 'Unknown error'}
                      </p>
                    )}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field label="Transport Mode">
                        <select value={effectiveTransportMode} onChange={(event) => setTransportMode(event.target.value as 'air' | 'sea')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500">
                          <option value="air">air</option>
                          <option value="sea">sea</option>
                        </select>
                      </Field>
                      <Field label="Departure Date">
                        <input type="datetime-local" value={departureDate} onChange={(event) => setDepartureDate(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                      </Field>
                      <Field label="Manual Final Charge (USD)">
                        <input type="number" min="0" step="0.01" value={manualCharge} onChange={(event) => setManualCharge(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                      </Field>
                      <Field label="Manual Adjustment Reason">
                        <input type="text" value={manualReason} onChange={(event) => setManualReason(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                      </Field>
                    </div>

                    <div className="mt-4 space-y-4">
                      {packages.map((pkg, index) => (
                        <div key={pkg.id} className="rounded-xl border border-gray-200 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900">Package {index + 1}</p>
                            {packages.length > 1 && (
                              <button type="button" onClick={() => setPackages((prev) => prev.filter((item) => item.id !== pkg.id))} className="text-xs font-semibold text-red-600 hover:text-red-700">
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <Input label="Description" value={pkg.description} onChange={(value) => handlePackageChange(pkg.id, 'description', value)} />
                            <Input label="Item Type" value={pkg.itemType} onChange={(value) => handlePackageChange(pkg.id, 'itemType', value)} />
                            <Input label="Quantity" type="number" min="1" value={pkg.quantity} onChange={(value) => handlePackageChange(pkg.id, 'quantity', value)} />
                            <Input label="Length (cm)" type="number" min="0" step="0.01" value={pkg.lengthCm} onChange={(value) => handlePackageChange(pkg.id, 'lengthCm', value)} />
                            <Input label="Width (cm)" type="number" min="0" step="0.01" value={pkg.widthCm} onChange={(value) => handlePackageChange(pkg.id, 'widthCm', value)} />
                            <Input label="Height (cm)" type="number" min="0" step="0.01" value={pkg.heightCm} onChange={(value) => handlePackageChange(pkg.id, 'heightCm', value)} />
                            <Input label="Weight (kg)" type="number" min="0" step="0.01" value={pkg.weightKg} onChange={(value) => handlePackageChange(pkg.id, 'weightKg', value)} />
                            <Input label="CBM (optional)" type="number" min="0" step="0.0001" value={pkg.cbm} onChange={(value) => handlePackageChange(pkg.id, 'cbm', value)} />
                            <Field label="Special Packaging Type">
                              <select value={pkg.specialPackagingType} onChange={(event) => handlePackageChange(pkg.id, 'specialPackagingType', event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500">
                                <option value="">None</option>
                                {packagingTypes.map((item) => (
                                  <option key={item.type} value={item.type}>{item.label}</option>
                                ))}
                              </select>
                            </Field>
                          </div>

                          <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input type="checkbox" checked={pkg.isRestricted} onChange={(event) => handlePackageChange(pkg.id, 'isRestricted', event.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                              Restricted item
                            </label>
                            {pkg.isRestricted && (
                              <>
                                <Input label="Restricted Reason" value={pkg.restrictedReason} onChange={(value) => handlePackageChange(pkg.id, 'restrictedReason', value)} />
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                  <input type="checkbox" checked={pkg.restrictedOverrideApproved} disabled={!canApproveOverride} onChange={(event) => handlePackageChange(pkg.id, 'restrictedOverrideApproved', event.target.checked)} className="h-4 w-4 rounded border-gray-300 disabled:cursor-not-allowed" />
                                  Override approved
                                </label>
                                {!canApproveOverride && (
                                  <p className="text-xs text-amber-700">Only admin/superadmin can approve overrides.</p>
                                )}
                                {pkg.restrictedOverrideApproved && (
                                  <Input label="Override Reason" value={pkg.restrictedOverrideReason} onChange={(value) => handlePackageChange(pkg.id, 'restrictedOverrideReason', value)} />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const id = nextPackageId;
                          setNextPackageId((prev) => prev + 1);
                          setPackages((prev) => [...prev, newPackageForm(id)]);
                        }}
                      >
                        Add Package
                      </Button>
                      <Button type="submit" size="sm" isLoading={verifyWarehouse.isPending}>
                        Submit Warehouse Verification
                      </Button>
                    </div>
                    {verifyNotice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{verifyNotice}</p>}
                    {verifyError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{verifyError}</p>}
                    {(restrictedGoodsQuery.data?.length ?? 0) > 0 && (
                      <p className="mt-3 text-xs text-gray-500">Restricted goods catalog loaded ({restrictedGoodsQuery.data?.length} items).</p>
                    )}
                  </form>
                )}

                {isOperator && (
                  <form className="rounded-2xl border border-gray-200 bg-white p-5" onSubmit={(event) => void handleOfflinePayment(event)}>
                    <h3 className="text-base font-semibold text-gray-900">Record Offline Payment</h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Input label="Customer User ID" value={effectiveOfflineUserId} onChange={setOfflineUserId} />
                      <Input label="Amount" type="number" min="0" step="0.01" value={offlineAmount} onChange={setOfflineAmount} />
                      <Field label="Payment Type">
                        <select value={offlineType} onChange={(event) => setOfflineType(event.target.value as RecordOfflinePayload['paymentType'])} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500">
                          <option value="transfer">transfer</option>
                          <option value="cash">cash</option>
                        </select>
                      </Field>
                      <Input label="Proof Reference" value={offlineReference} onChange={setOfflineReference} />
                      <div className="sm:col-span-2">
                        <Input label="Note" value={offlineNote} onChange={setOfflineNote} />
                      </div>
                      <div className="sm:col-span-2">
                        <Button type="submit" size="sm" isLoading={recordOfflinePayment.isPending}>Record Offline Payment</Button>
                      </div>
                    </div>
                    {paymentNotice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{paymentNotice}</p>}
                    {paymentError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{paymentError}</p>}
                  </form>
                )}

                <form className="rounded-2xl border border-gray-200 bg-white p-5" onSubmit={(event) => void handlePickupRep(event)}>
                  <h3 className="text-base font-semibold text-gray-900">Pickup Representative</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Input label="Pickup Rep Name" value={effectivePickupName} onChange={setPickupName} />
                    <Input label="Pickup Rep Phone" value={effectivePickupPhone} onChange={setPickupPhone} />
                    <div className="sm:col-span-2">
                      <Button type="submit" size="sm" isLoading={updatePickupRep.isPending}>Update Pickup Representative</Button>
                    </div>
                  </div>
                  {pickupNotice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{pickupNotice}</p>}
                  {pickupError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{pickupError}</p>}
                </form>

                {isOperator && (
                  <form className="rounded-2xl border border-gray-200 bg-white p-5" onSubmit={(event) => void handleUpload(event)}>
                    <h3 className="text-base font-semibold text-gray-900">Package Images</h3>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        Select files
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          multiple
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                        />
                      </label>
                      <span className="text-xs text-gray-500">{files.length > 0 ? `${files.length} selected` : 'No files selected'}</span>
                      <Button type="submit" size="sm" isLoading={uploadImage.isPending}>Upload</Button>
                    </div>
                    {imageNotice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{imageNotice}</p>}
                    {imageError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{imageError}</p>}
                    {imagesQuery.error && (
                      <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        {imagesQuery.error instanceof Error ? imagesQuery.error.message : 'Failed to load images'}
                      </p>
                    )}
                    <div className="mt-4 rounded-xl border border-gray-200">
                      {imagesQuery.isLoading ? (
                        <p className="px-4 py-6 text-sm text-gray-500">Loading images...</p>
                      ) : orderImages.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-500">No images uploaded.</p>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {orderImages.map((image) => (
                            <li key={image.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                              <a href={image.url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                                {image.r2Key || image.id}
                              </a>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>{image.createdAt ? formatDate(image.createdAt, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</span>
                                {canDeleteImage && (
                                  <button type="button" onClick={() => void handleDeleteImage(image.id)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700">
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </form>
                )}

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="text-base font-semibold text-gray-900">Order Timeline</h3>
                  {timelineQuery.error && (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      {timelineQuery.error instanceof Error ? timelineQuery.error.message : 'Failed to load timeline'}
                    </p>
                  )}
                  {timelineQuery.isLoading ? (
                    <p className="mt-3 text-sm text-gray-500">Loading timeline...</p>
                  ) : timelineRows.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">No timeline events yet.</p>
                  ) : (
                    <ol className="mt-4 space-y-4">
                      {timelineRows.map((item, index) => {
                        const style = getStatusStyle(item.status);
                        const isLast = index === timelineRows.length - 1;
                        return (
                          <li key={`${item.status}-${item.timestamp}-${index}`} className="relative flex gap-3">
                            <div className="flex flex-col items-center">
                              <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', style.dotClass)} />
                              {!isLast && <span className="mt-1 h-full w-px bg-gray-200" />}
                            </div>
                            <div className="pb-4">
                              <p className="text-sm font-semibold text-gray-800">
                                {t(`shipments:statusV2.${item.status}`, { defaultValue: item.statusLabel || statusLabel(item.status) })}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(item.timestamp, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

interface InfoProps {
  label: string;
  value: string;
}

function Info({ label, value }: InfoProps): ReactElement {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm text-gray-800">{value}</p>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactElement;
}

function Field({ label, children }: FieldProps): ReactElement {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  min?: string;
  step?: string;
}

function Input({ label, value, onChange, type = 'text', min, step }: InputProps): ReactElement {
  return (
    <Field label={label}>
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
      />
    </Field>
  );
}
