import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList,
  CreditCard,
  Loader2,
  Package,
  Plus,
  Truck,
} from 'lucide-react';
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
  useShipmentsDashboard,
  useSpecialPackagingTypes,
  useUpdateOrderStatus,
  useUpdatePickupRep,
  useUpload,
  useWarehouseVerify,
} from '@/hooks';
import type { OrderListItem } from '@/types';
import { Button } from '@/components/ui';
import { AppShell, PageHeader } from '@/pages/shared';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';
import {
  OrderQueue,
  OrderDetailHeader,
  StatusProgression,
  WarehouseVerifyForm,
  OfflinePaymentForm,
  PickupRepForm,
  ImageGallery,
  OrderTimeline,
} from './components';
import {
  includesQuery,
  isPaymentRelevant,
  isWarehouseVerifiable,
  statusLabel,
  toView,
} from './types';
import type { DetailTab, OperatorFilter } from './types';

const TABS: Array<{ key: DetailTab; icon: typeof ClipboardList }> = [
  { key: 'overview', icon: ClipboardList },
  { key: 'warehouse', icon: Package },
  { key: 'payment', icon: CreditCard },
  { key: 'pickup', icon: Truck },
  { key: 'timeline', icon: ClipboardList },
];

export function OrdersPage(): ReactElement {
  const { t } = useTranslation(['orders', 'shipments']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOperator = user?.role === 'staff' || user?.role === 'admin' || user?.role === 'superadmin';
  const canDeleteImage = user?.role === 'admin' || user?.role === 'superadmin';
  const canApproveOverride = user?.role === 'admin' || user?.role === 'superadmin';
  const { query, setQuery } = useSearch();

  // ── Local UI state ────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<OperatorFilter>('all');
  const [selectedOrderIdState, setSelectedOrderIdState] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  // ── Data hooks ────────────────────────────────────────────────
  const statusFilter = isOperator && activeFilter !== 'all' ? activeFilter : undefined;
  const { data: appData, isLoading: appLoading, error: appError } = useDashboardData();
  const { orders, total, isLoading: ordersLoading, error: ordersError } = useOrders(1, 100, statusFilter, {
    enabled: !isOperator,
  });
  const {
    data: shipmentsData,
    isLoading: shipmentsLoading,
    error: shipmentsError,
  } = useShipmentsDashboard(
    { statusV2: statusFilter, page: 1, limit: 100 },
    { enabled: isOperator }
  );

  const operatorQueueOrders = useMemo<OrderListItem[]>(
    () =>
      (shipmentsData?.shipments ?? []).map((shipment) => ({
        id: shipment.id,
        trackingNumber: shipment.sku,
        senderName: shipment.customer || null,
        status: shipment.statusV2 || shipment.status,
        statusV2: shipment.statusV2,
        statusLabel: shipment.statusLabel,
        origin: shipment.origin,
        destination: shipment.destination,
        createdAt: shipment.createdAt ?? null,
        amount: shipment.valueUSD,
        raw: shipment as unknown as Record<string, unknown>,
      })),
    [shipmentsData]
  );

  const queueOrders = isOperator ? operatorQueueOrders : orders;
  const queueTotal = isOperator ? operatorQueueOrders.length : total;
  const queueError = isOperator ? shipmentsError : ordersError;
  const queueLoading = isOperator ? shipmentsLoading : ordersLoading;
  const visibleOrders = useMemo(() => queueOrders.filter((o) => includesQuery(o, query)), [queueOrders, query]);

  const selectedOrderId = useMemo(() => {
    if (!visibleOrders.length) return null;
    if (selectedOrderIdState && visibleOrders.some((o) => o.id === selectedOrderIdState)) {
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

  // ── Mutations ─────────────────────────────────────────────────
  const updateStatus = useUpdateOrderStatus();
  const verifyWarehouse = useWarehouseVerify();
  const recordOfflinePayment = useRecordOfflinePayment();
  const updatePickupRep = useUpdatePickupRep();
  const uploadImage = useUpload();
  const deleteOrderImage = useDeleteOrderImage();

  // ── Handlers ──────────────────────────────────────────────────
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleSelectOrder = (id: string): void => {
    setSelectedOrderIdState(id);
    setActiveTab('overview');
    setStatusNotice(null);
    setStatusError(null);
  };

  const handleStatusAdvance = async (statusV2: string): Promise<void> => {
    if (!selectedOrderId) return;
    setStatusNotice(null);
    setStatusError(null);
    try {
      await updateStatus.mutateAsync({ orderId: selectedOrderId, statusV2 });
      setStatusNotice(t('orders:status.success', { status: statusLabel(statusV2) }));
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : t('orders:status.errors.failed'));
    }
  };

  const handleWarehouseVerify = async (payload: Parameters<typeof verifyWarehouse.mutateAsync>[0]['payload']) => {
    if (!selectedOrderId) throw new Error('No order selected');
    return verifyWarehouse.mutateAsync({ orderId: selectedOrderId, payload });
  };

  const handleRecordOffline = async (orderId: string, payload: Parameters<typeof recordOfflinePayment.mutateAsync>[0]['payload']) => {
    await recordOfflinePayment.mutateAsync({ orderId, payload });
  };

  const handlePickupRep = async (orderId: string, name: string, phone: string) => {
    await updatePickupRep.mutateAsync({ orderId, pickupRepName: name, pickupRepPhone: phone });
  };

  const handleUploadImages = async (orderId: string, files: File[]) => {
    for (const file of files) await uploadImage.mutateAsync({ orderId, file });
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!selectedOrderId) return;
    await deleteOrderImage.mutateAsync({ imageId, orderId: selectedOrderId });
  };

  // ── Derived ───────────────────────────────────────────────────
  const orderImages = Array.isArray(imagesQuery.data) ? imagesQuery.data : [];
  const packagingTypes = Array.isArray(packagingTypesQuery.data) ? packagingTypesQuery.data : [];
  const restrictedGoods = Array.isArray(restrictedGoodsQuery.data) ? restrictedGoodsQuery.data : [];
  const timelineEvents = timelineQuery.data?.timeline ?? [];
  const showWarehouse = isOperator && view && isWarehouseVerifiable(view.statusV2);
  const showPayment = isOperator && view && isPaymentRelevant(view.paymentCollectionStatus);

  // Filter tabs to only show relevant ones
  const visibleTabs = TABS.filter((tab) => {
    if (tab.key === 'warehouse' && !isOperator) return false;
    if (tab.key === 'payment' && !isOperator) return false;
    return true;
  });

  const loading = appLoading || queueLoading;

  return (
    <AppShell data={appData} isLoading={loading} error={queueError ?? appError} loadingLabel={t('orders:loadingLabel')}>
      <div className="space-y-6">
        <PageHeader
          title={t('orders:pageTitle')}
          subtitle={t('orders:subtitle')}
          actions={
            isOperator ? (
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate(ROUTES.NEW_SHIPMENT)}
              >
                {t('orders:createClientOrder')}
              </Button>
            ) : undefined
          }
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {/* Left: Order Queue */}
          <OrderQueue
            orders={visibleOrders}
            total={queueTotal}
            selectedOrderId={selectedOrderId}
            isOperator={isOperator}
            activeFilter={activeFilter}
            query={query}
            onSelectOrder={handleSelectOrder}
            onFilterChange={setActiveFilter}
            onQueryChange={setQuery}
          />

          {/* Right: Detail Panel */}
          <section className="space-y-4">
            {!selectedOrderId ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                {t('orders:detail.selectOrder')}
              </div>
            ) : orderDetailQuery.isLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
                <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-gray-400" />
                {t('orders:detail.loading')}
              </div>
            ) : orderDetailQuery.error || !view ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {orderDetailQuery.error instanceof Error
                  ? orderDetailQuery.error.message
                  : t('orders:detail.error')}
              </div>
            ) : (
              <>
                {/* Header + pipeline stepper */}
                <OrderDetailHeader view={view} />

                {/* Tab bar */}
                <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
                  {visibleTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    let badge: string | null = null;
                    if (tab.key === 'warehouse' && showWarehouse) badge = '!';
                    if (tab.key === 'payment' && showPayment) badge = '$';
                    if (tab.key === 'timeline') badge = String(timelineEvents.length);

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                          'relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition',
                          isActive
                            ? 'bg-white text-brand-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t(`orders:tabs.${tab.key}`)}</span>
                        {badge && (
                          <span
                            className={cn(
                              'ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                              tab.key === 'warehouse'
                                ? 'bg-amber-100 text-amber-700'
                                : tab.key === 'payment'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-200 text-gray-600',
                            )}
                          >
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                {activeTab === 'overview' && isOperator && (
                  <StatusProgression
                    view={view}
                    isPending={updateStatus.isPending}
                    statusNotice={statusNotice}
                    statusError={statusError}
                    onAdvance={(s) => void handleStatusAdvance(s)}
                  />
                )}

                {activeTab === 'warehouse' && isOperator && (
                  showWarehouse ? (
                    <WarehouseVerifyForm
                      view={view}
                      canApproveOverride={canApproveOverride}
                      isPending={verifyWarehouse.isPending}
                      packagingTypes={packagingTypes}
                      restrictedGoods={restrictedGoods}
                      packagingError={packagingTypesQuery.error instanceof Error ? packagingTypesQuery.error.message : null}
                      restrictedError={restrictedGoodsQuery.error instanceof Error ? restrictedGoodsQuery.error.message : null}
                      onSubmit={handleWarehouseVerify}
                    />
                  ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5">
                      <h3 className="text-base font-semibold text-gray-900">{t('orders:warehouse.title')}</h3>
                      <p className="mt-2 text-sm text-gray-500">{t('orders:warehouse.notApplicable')}</p>
                    </div>
                  )
                )}

                {activeTab === 'payment' && isOperator && (
                  showPayment ? (
                    <OfflinePaymentForm
                      view={view}
                      isPending={recordOfflinePayment.isPending}
                      onSubmit={handleRecordOffline}
                    />
                  ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5">
                      <h3 className="text-base font-semibold text-gray-900">{t('orders:payment.title')}</h3>
                      <p className="mt-2 text-sm text-gray-500">{t('orders:payment.alreadyPaid')}</p>
                    </div>
                  )
                )}

                {activeTab === 'pickup' && (
                  <>
                    <PickupRepForm
                      view={view}
                      isPending={updatePickupRep.isPending}
                      onSubmit={handlePickupRep}
                    />
                    {isOperator && (
                      <ImageGallery
                        orderId={view.id}
                        images={orderImages}
                        isLoading={imagesQuery.isLoading}
                        error={imagesQuery.error instanceof Error ? imagesQuery.error.message : null}
                        canDelete={canDeleteImage}
                        isUploading={uploadImage.isPending}
                        onUpload={handleUploadImages}
                        onDelete={handleDeleteImage}
                      />
                    )}
                  </>
                )}

                {activeTab === 'timeline' && (
                  <OrderTimeline
                    events={timelineEvents}
                    isLoading={timelineQuery.isLoading}
                    error={timelineQuery.error instanceof Error ? timelineQuery.error : null}
                  />
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
