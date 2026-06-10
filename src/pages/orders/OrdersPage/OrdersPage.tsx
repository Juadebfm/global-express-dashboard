import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList,
  CreditCard,
  Image,
  Loader2,
  Package,
  Plus,
} from 'lucide-react';
import {
  useCan,
  useDashboardData,
  useDeleteOrderImage,
  useOrderDetail,
  useOrderImages,
  useOrderPayments,
  useOrders,
  useOrderTimeline,
  useRecordOfflinePayment,
  useSearch,
  useShipmentsDashboard,
  useUpdateOrderStatus,
  useUpdatePickupRep,
  useUpload,
  useVerifyOrderPayment,
  useWarehouseVerify,
} from '@/hooks';
import type { OrderListItem } from '@/types';
import { Button, Pagination, TableRowsSkeleton } from '@/components/ui';
import { AppShell, PageHeader } from '@/pages/shared';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';
import {
  OrderQueue,
  OrderDetailHeader,
  OverviewPanel,
  WarehouseVerifyForm,
  OfflinePaymentForm,
  ReceiptApprovalPanel,
  CustomerShipmentDetail,
  CustomerPaymentView,
  PickupRepForm,
  ImageGallery,
  OrderTimeline,
} from './components';
import {
  includesQuery,
  isPaymentRelevant,
  isWarehouseVerifiable,
  needsAction,
  statusLabel,
  toView,
} from './types';
import type { DetailTab, OperatorFilter } from './types';

const TABS: Array<{ key: DetailTab; icon: typeof ClipboardList }> = [
  { key: 'overview', icon: ClipboardList },
  { key: 'warehouse', icon: Package },
  { key: 'payment', icon: CreditCard },
  { key: 'images', icon: Image },
  { key: 'timeline', icon: ClipboardList },
];

export function OrdersPage(): ReactElement {
  const { t } = useTranslation(['orders', 'shipments']);
  const navigate = useNavigate();
  const isOperator = useCan('app.operator');
  const isSuperAdmin = useCan('app.superadmin');
  const canDeleteImage = useCan('orders.deleteImage');
  const canApproveOverride = useCan('orders.approveOverride');
  const { query, setQuery } = useSearch();

  // ── Local UI state ────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<OperatorFilter>('all');
  const [selectedOrderIdState, setSelectedOrderIdState] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [showPaymentView, setShowPaymentView] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

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

  // ── Data hooks ────────────────────────────────────────────────
  const statusFilter = isOperator && activeFilter !== 'all' ? activeFilter : undefined;
  const { data: appData, isLoading: appLoading, error: appError } = useDashboardData();
  const {
    orders,
    pagination: ordersPagination,
    isLoading: ordersLoading,
    error: ordersError,
  } = useOrders(page, undefined, statusFilter, { enabled: !isOperator });
  const {
    data: shipmentsData,
    isLoading: shipmentsLoading,
    error: shipmentsError,
  } = useShipmentsDashboard(
    { statusV2: statusFilter, page },
    { enabled: isOperator },
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
        transportMode: shipment.transportMode ?? shipment.mode ?? 'air',
        paymentCollectionStatus: shipment.paymentCollectionStatus ?? 'PENDING',
        flaggedForAdminReview: shipment.flaggedForAdminReview === true,
        raw: shipment as unknown as Record<string, unknown>,
      })),
    [shipmentsData],
  );

  const queueOrders = isOperator ? operatorQueueOrders : orders;
  const queuePagination =
    isOperator && shipmentsData ? shipmentsData.pagination : ordersPagination;
  const queueTotal = queuePagination.total;
  const queueError = isOperator ? shipmentsError : ordersError;
  const queueLoading = isOperator ? shipmentsLoading : ordersLoading;
  const visibleOrders = useMemo(
    () => queueOrders.filter((o) => includesQuery(o, query)),
    [queueOrders, query],
  );

  const needsActionCount = useMemo(
    () =>
      operatorQueueOrders.filter((o) =>
        needsAction(o.statusV2, o.paymentCollectionStatus, o.flaggedForAdminReview),
      ).length,
    [operatorQueueOrders],
  );

  const selectedOrderId = useMemo(() => {
    if (!visibleOrders.length) return null;
    if (selectedOrderIdState && visibleOrders.some((o) => o.id === selectedOrderIdState)) {
      return selectedOrderIdState;
    }
    return visibleOrders[0].id;
  }, [visibleOrders, selectedOrderIdState]);

  const orderDetailQuery = useOrderDetail(selectedOrderId ?? undefined);
  const view = useMemo(
    () => (orderDetailQuery.data ? toView(orderDetailQuery.data) : null),
    [orderDetailQuery.data],
  );
  const timelineQuery = useOrderTimeline(selectedOrderId ?? undefined, Boolean(selectedOrderId));
  const imagesQuery = useOrderImages(selectedOrderId ?? undefined);
  const paymentsQuery = useOrderPayments(
    selectedOrderId ?? undefined,
    isOperator && activeTab === 'payment',
  );

  // ── Mutations ─────────────────────────────────────────────────
  const updateStatus = useUpdateOrderStatus();
  const verifyWarehouse = useWarehouseVerify();
  const recordOfflinePayment = useRecordOfflinePayment();
  const updatePickupRep = useUpdatePickupRep();
  const uploadImage = useUpload();
  const deleteOrderImage = useDeleteOrderImage();
  const verifyPayment = useVerifyOrderPayment(selectedOrderId ?? undefined);

  // ── Handlers ──────────────────────────────────────────────────
  const handleSelectOrder = (id: string): void => {
    setSelectedOrderIdState(id);
    setActiveTab('overview');
    setShowPaymentView(false);
    setMobileShowDetail(true);
  };

  const handleStatusAdvance = async (statusV2: string): Promise<void> => {
    if (!selectedOrderId) return;
    try {
      await updateStatus.mutateAsync({ orderId: selectedOrderId, statusV2 });
    } catch {
      // error surfaced via updateStatus.error
    }
  };

  const handleWarehouseVerify = async (
    payload: Parameters<typeof verifyWarehouse.mutateAsync>[0]['payload'],
  ) => {
    if (!selectedOrderId) throw new Error('No order selected');
    return verifyWarehouse.mutateAsync({ orderId: selectedOrderId, payload });
  };

  const handleRecordOffline = async (
    orderId: string,
    payload: Parameters<typeof recordOfflinePayment.mutateAsync>[0]['payload'],
  ) => {
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

  const handleVerifyPayment = async (
    paymentId: string,
    decision: 'approve' | 'reject',
    note?: string,
  ) => {
    await verifyPayment.mutateAsync({ paymentId, payload: { decision, note } });
  };

  // ── Derived ───────────────────────────────────────────────────
  const orderImages = Array.isArray(imagesQuery.data) ? imagesQuery.data : [];
  const timelineEvents = timelineQuery.data?.timeline ?? [];
  const goodsBreakdown = timelineQuery.data?.goodsBreakdown ?? [];
  const billableWeightKg = useMemo(() => {
    if (!goodsBreakdown.length) return null;
    const totalWeightKg = goodsBreakdown.reduce((sum, item) => sum + item.weightKg, 0);
    const totalVolumetricKg = goodsBreakdown.reduce((sum, item) => sum + item.cbm, 0) * 1000;
    return Math.max(totalWeightKg, totalVolumetricKg);
  }, [goodsBreakdown]);

  const orderPayments = Array.isArray(paymentsQuery.data) ? paymentsQuery.data : [];
  const pendingReceiptPayments = orderPayments.filter(
    (p) => p.proofReference && p.status === 'pending',
  );

  const effectiveView = useMemo(() => {
    if (!view || !searchParams.has('sim')) return view;
    return {
      ...view,
      statusV2: 'READY_FOR_PICKUP',
      statusLabel: 'Ready for Pickup',
      paymentCollectionStatus: 'AWAITING_PAYMENT',
      amountDue: 500,
    };
  }, [view, searchParams]);

  const showWarehouse = isOperator && effectiveView && isWarehouseVerifiable(effectiveView.statusV2);
  const showPayment = effectiveView && isPaymentRelevant(effectiveView.paymentCollectionStatus);

  const visibleTabs = TABS.filter((tab) => {
    if (tab.key === 'warehouse' && !isOperator) return false;
    if (tab.key === 'payment' && !showPayment) return false;
    return true;
  });

  return (
    <AppShell
      data={appData}
      isLoading={appLoading}
      error={queueError ?? appError}
      loadingLabel={t('orders:loadingLabel')}
    >
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

        <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          {/* Left: Order Queue + Pagination */}
          <div className={cn('space-y-3', mobileShowDetail ? 'hidden lg:block' : '')}>
            {queueLoading && queueOrders.length === 0 ? (
              <TableRowsSkeleton columns={3} rows={8} ariaLabel={t('orders:loadingLabel')} />
            ) : (
              <OrderQueue
                orders={visibleOrders}
                total={queueTotal}
                needsActionCount={needsActionCount}
                selectedOrderId={selectedOrderId}
                isOperator={isOperator}
                activeFilter={activeFilter}
                query={query}
                onSelectOrder={handleSelectOrder}
                onFilterChange={(value) => {
                  if (value !== activeFilter) setPage(1);
                  setActiveFilter(value);
                }}
                onQueryChange={setQuery}
              />
            )}
            {queuePagination.totalPages > 1 && (
              <Pagination
                page={queuePagination.page}
                totalPages={queuePagination.totalPages}
                total={queuePagination.total}
                labels={{
                  pageOf: (p, tp) =>
                    t('shipments:pagination.pageOf', { page: p, totalPages: tp }),
                  totalLabel: (count) => t('shipments:pagination.total', { count }),
                  prev: t('shipments:pagination.prev'),
                  next: t('shipments:pagination.next'),
                }}
                onPageChange={setPage}
              />
            )}
          </div>

          {/* Right: Detail Panel */}
          <section className={cn('space-y-4', !mobileShowDetail ? 'hidden lg:block' : '')}>
            {!selectedOrderId ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                {t('orders:detail.selectOrder')}
              </div>
            ) : orderDetailQuery.isLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
                <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-gray-400" />
                {t('orders:detail.loading')}
              </div>
            ) : orderDetailQuery.error || !effectiveView ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {orderDetailQuery.error instanceof Error
                  ? orderDetailQuery.error.message
                  : t('orders:detail.error')}
              </div>
            ) : !isOperator ? (
              /* ── Customer (external) view ── */
              showPaymentView ? (
                <CustomerPaymentView
                  view={effectiveView}
                  onBack={() => setShowPaymentView(false)}
                />
              ) : (
                <CustomerShipmentDetail
                  view={effectiveView}
                  timeline={timelineEvents}
                  timelineLoading={timelineQuery.isLoading}
                  onSettleBalance={() => setShowPaymentView(true)}
                  updatePickupRepPending={updatePickupRep.isPending}
                  onSubmitPickupRep={handlePickupRep}
                />
              )
            ) : (
              /* ── Operator (internal) view ── */
              <>
                {/* Always-visible header: tracking row + status card */}
                <OrderDetailHeader
                  view={effectiveView}
                  onAdvance={(s) => void handleStatusAdvance(s)}
                  onBack={mobileShowDetail ? () => setMobileShowDetail(false) : undefined}
                  advanceLoading={updateStatus.isPending}
                />

                {/* Status advance feedback */}
                {updateStatus.isSuccess && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                    Status updated to {statusLabel(effectiveView.statusV2)}.
                  </div>
                )}
                {updateStatus.isError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                    {updateStatus.error instanceof Error
                      ? updateStatus.error.message
                      : t('orders:status.errors.failed')}
                  </div>
                )}

                {/* Tab strip */}
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
                {activeTab === 'overview' && (
                  <OverviewPanel
                    view={effectiveView}
                    billableWeightKg={billableWeightKg}
                  />
                )}

                {activeTab === 'warehouse' && (
                  showWarehouse ? (
                    <WarehouseVerifyForm
                      view={effectiveView}
                      canApproveOverride={canApproveOverride}
                      isPending={verifyWarehouse.isPending}
                      onSubmit={handleWarehouseVerify}
                    />
                  ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5">
                      <h3 className="text-base font-semibold text-gray-900">
                        {t('orders:warehouse.title')}
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        {t('orders:warehouse.notApplicable')}
                      </p>
                    </div>
                  )
                )}

                {activeTab === 'payment' && (
                  <div className="space-y-4">
                    {/* Superadmin: receipt approval for pending receipts */}
                    {isSuperAdmin &&
                      pendingReceiptPayments.map((payment) => (
                        <ReceiptApprovalPanel
                          key={payment.id}
                          payment={payment}
                          isPending={verifyPayment.isPending}
                          onVerify={handleVerifyPayment}
                        />
                      ))}

                    {/* Operator: record offline payment */}
                    <OfflinePaymentForm
                      view={effectiveView}
                      isPending={recordOfflinePayment.isPending}
                      onSubmit={handleRecordOffline}
                    />
                  </div>
                )}

                {activeTab === 'images' && (
                  <>
                    <PickupRepForm
                      view={effectiveView}
                      isPending={updatePickupRep.isPending}
                      onSubmit={handlePickupRep}
                    />
                    <ImageGallery
                      orderId={effectiveView.id}
                      images={orderImages}
                      isLoading={imagesQuery.isLoading}
                      error={imagesQuery.error instanceof Error ? imagesQuery.error.message : null}
                      canDelete={canDeleteImage}
                      isUploading={uploadImage.isPending}
                      onUpload={handleUploadImages}
                      onDelete={handleDeleteImage}
                    />
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
