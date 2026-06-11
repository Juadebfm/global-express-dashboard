import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  Plus,
} from 'lucide-react';
import {
  useCan,
  useDashboardData,
  useDeleteOrderImage,
  useMyPayments,
  useOrderDetail,
  useOrderImages,
  useOrderPayments,
  useOrders,
  useOrderTimeline,
  useRecordOfflinePayment,
  useSearch,
  useSendPaymentRequest,
  useShipmentsDashboard,
  useMeasurements,
  useRecordMeasurement,
  useUpdateOrderStatus,
  useUpdatePickupRep,
  useUpload,
  useVerifyOrderPayment,
  useWarehouseVerify,
  useCreateOrderForCustomer,
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
  OrderPaymentHistory,
  ReceiptApprovalPanel,
  PaymentReceiptSummary,
  SendPaymentPanel,
  MeasurementsTab,
  CustomerShipmentDetail,
  CustomerPaymentView,
  PickupRepForm,
  ImageGallery,
  OrderTimeline,
  CreateOrderModal,
} from './components';
import {
  canAddToShipment,
  canReVerifyPackages,
  includesQuery,
  isPaymentRelevant,
  isWarehouseVerifiable,
  needsAction,
  statusLabel,
  toView,
} from './types';
import type { DetailTab, OperatorFilter } from './types';

const TABS: Array<{ key: DetailTab }> = [
  { key: 'overview' },
  { key: 'warehouse' },
  { key: 'measurements' },
  { key: 'payment' },
  { key: 'images' },
  { key: 'timeline' },
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
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);

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
  // 'needs_action' is a FE-only composite filter — don't send it as statusV2 to the API.
  const statusFilter = isOperator && activeFilter !== 'all' && activeFilter !== 'needs_action' ? activeFilter : undefined;
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
  const visibleOrders = useMemo(() => {
    const matched = queueOrders.filter((o) => includesQuery(o, query));
    if (isOperator && activeFilter === 'needs_action') {
      return matched.filter((o) =>
        needsAction(o.statusV2, o.paymentCollectionStatus, o.flaggedForAdminReview),
      );
    }
    return matched;
  }, [queueOrders, query, isOperator, activeFilter]);

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
  const view = useMemo(() => {
    if (!orderDetailQuery.data) return null;
    const v = toView(orderDetailQuery.data);
    // Detail endpoint may not include customer name — fall back to queue item which always has it
    if (!v.senderName && selectedOrderId) {
      const queueItem = queueOrders.find((o) => o.id === selectedOrderId);
      if (queueItem?.senderName) return { ...v, senderName: queueItem.senderName };
    }
    return v;
  }, [orderDetailQuery.data, selectedOrderId, queueOrders]);
  const timelineQuery = useOrderTimeline(selectedOrderId ?? undefined, Boolean(selectedOrderId));
  const imagesQuery = useOrderImages(selectedOrderId ?? undefined);
  const measurementsQuery = useMeasurements(
    view?.shipmentType === 'd2d' && activeTab === 'measurements' ? (selectedOrderId ?? undefined) : undefined,
  );
  const recordMeasurement = useRecordMeasurement();
  const isPaidInFull = view?.paymentCollectionStatus === 'PAID_IN_FULL';
  const paymentsQuery = useOrderPayments(
    selectedOrderId ?? undefined,
    isOperator && (activeTab === 'payment' || isPaidInFull),
  );
  const myPaymentsQuery = useMyPayments(!isOperator);

  // ── Mutations ─────────────────────────────────────────────────
  const updateStatus = useUpdateOrderStatus();
  const verifyWarehouse = useWarehouseVerify();
  const recordOfflinePayment = useRecordOfflinePayment();
  const createOrderForCustomer = useCreateOrderForCustomer();
  const updatePickupRep = useUpdatePickupRep();
  const uploadImage = useUpload();
  const deleteOrderImage = useDeleteOrderImage();
  const verifyPayment = useVerifyOrderPayment(selectedOrderId ?? undefined);
  const sendPaymentDetails = useSendPaymentRequest();

  // ── Handlers ──────────────────────────────────────────────────
  const handleSelectOrder = (id: string): void => {
    setSelectedOrderIdState(id);
    setActiveTab('overview');
    setShowPaymentView(false);
    setMobileShowDetail(true);
    // Clear stale mutation state from the previous order so banners don't bleed across selections.
    updateStatus.reset();
    verifyWarehouse.reset();
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
  ): Promise<{ warning: string | null }> => {
    const result = await recordOfflinePayment.mutateAsync({ orderId, payload });
    return { warning: result.warning ?? null };
  };

  const handleCreateOrderForCustomer = async (submitPayload: {
    senderId: string;
    recipientName: string;
    recipientPhone: string;
    recipientEmail: string;
    shipmentType: 'air' | 'sea';
    weight: string;
    declaredValue: string;
    description: string;
    orderDirection: 'outbound';
    idempotencyKey: string;
  }): Promise<{ trackingNumber: string }> => {
    const { idempotencyKey, ...orderPayload } = submitPayload;
    const result = await createOrderForCustomer.mutateAsync({ payload: orderPayload, idempotencyKey });
    return { trackingNumber: result.trackingNumber };
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
  ): Promise<{ warning: string | null }> => {
    const result = await verifyPayment.mutateAsync({ paymentId, payload: { decision, note } });
    return { warning: result.warning ?? null };
  };

  // ── Derived ───────────────────────────────────────────────────
  const orderImages = Array.isArray(imagesQuery.data) ? imagesQuery.data : [];
  const timelineEvents = timelineQuery.data?.timeline ?? [];
  const billableWeightKg = useMemo(() => {
    const breakdown = timelineQuery.data?.goodsBreakdown;
    if (!breakdown?.length) return null;
    const totalWeightKg = breakdown.reduce((sum, item) => sum + item.weightKg, 0);
    const totalVolumetricKg = breakdown.reduce((sum, item) => sum + item.cbm, 0) * 1000;
    return Math.max(totalWeightKg, totalVolumetricKg);
  }, [timelineQuery.data?.goodsBreakdown]);

  const orderPayments = Array.isArray(paymentsQuery.data) ? paymentsQuery.data : [];
  const myOrderPayments = useMemo(
    () => (myPaymentsQuery.data ?? []).filter((p) => p.orderId === selectedOrderId),
    [myPaymentsQuery.data, selectedOrderId],
  );
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

  const isFirstVerify = isOperator && !!effectiveView && isWarehouseVerifiable(effectiveView.statusV2);
  const isReVerify = isOperator && !!effectiveView && canReVerifyPackages(effectiveView.statusV2);
  const showWarehouse = isFirstVerify || isReVerify;
  const showPayment = effectiveView && isPaymentRelevant(effectiveView.paymentCollectionStatus);

  const isCancelled = effectiveView?.statusV2?.toUpperCase() === 'CANCELLED';
  const isD2D = effectiveView?.shipmentType === 'd2d';

  const visibleTabs = TABS.filter((tab) => {
    if (isCancelled && (tab.key === 'warehouse' || tab.key === 'payment' || tab.key === 'measurements')) return false;
    if ((tab.key === 'warehouse' || tab.key === 'payment' || tab.key === 'measurements') && !isOperator) return false;
    if (tab.key === 'warehouse' && !showWarehouse) return false;
    if (tab.key === 'measurements' && !isD2D) return false;
    return true;
  });

  const effectiveTab = visibleTabs.some((t) => t.key === activeTab) ? activeTab : 'overview';

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
          <div className={cn('min-w-0 space-y-3', mobileShowDetail ? 'hidden lg:block' : '')}>
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
          <section className={cn('min-w-0 space-y-4', !mobileShowDetail ? 'hidden lg:block' : '')}>
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
                  payments={myOrderPayments}
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
                  onAddToShipment={
                    isOperator && !!effectiveView && canAddToShipment(effectiveView.statusV2)
                      ? () => setActiveTab('warehouse')
                      : undefined
                  }
                  onCreateOrderForCustomer={
                    effectiveView.senderId
                      ? () => setShowCreateOrderModal(true)
                      : undefined
                  }
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

                {/* Tab strip + content */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="scrollbar-none flex overflow-x-auto border-b border-gray-200">
                  {visibleTabs.map((tab) => {
                    const isActive = effectiveTab === tab.key;
                    const paymentDot = tab.key === 'payment' && showPayment;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                          'relative flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-medium transition border-b-2 -mb-px',
                          isActive
                            ? 'border-brand-500 text-gray-900'
                            : 'border-transparent text-gray-500 hover:text-gray-700',
                        )}
                      >
                        {t(`orders:tabs.${tab.key}`)}
                        {paymentDot && (
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                {effectiveTab === 'overview' && (
                  <OverviewPanel
                    view={effectiveView}
                    billableWeightKg={billableWeightKg}
                  />
                )}

                {effectiveTab === 'warehouse' && showWarehouse && (
                  <WarehouseVerifyForm
                    key={`${selectedOrderId}-${isReVerify ? 're' : 'first'}`}
                    view={effectiveView}
                    isD2D={isD2D}
                    imageCount={orderImages.length}
                    canApproveOverride={canApproveOverride}
                    isPending={verifyWarehouse.isPending}
                    mode={isReVerify ? 're-verify' : 'first-verify'}
                    initialPackages={isReVerify ? (timelineQuery.data?.goodsBreakdown ?? []) : []}
                    onSwitchToImages={() => setActiveTab('images')}
                    onSubmit={handleWarehouseVerify}
                  />
                )}

                {effectiveTab === 'measurements' && isD2D && (
                  <MeasurementsTab
                    orderId={effectiveView.id}
                    measurements={measurementsQuery.data ?? []}
                    isLoading={measurementsQuery.isLoading}
                    canRecord={isOperator}
                    isPending={recordMeasurement.isPending}
                    onRecord={(orderId, data) => recordMeasurement.mutate({ orderId, ...data })}
                  />
                )}

                {effectiveTab === 'payment' && (
                  <div>
                    {/* Send / resend payment notification — shown whenever priced and not yet fully paid */}
                    {!isPaidInFull && effectiveView.finalChargeUsd !== null && (
                      <SendPaymentPanel
                        view={effectiveView}
                        isPending={sendPaymentDetails.isPending}
                        onSend={() => sendPaymentDetails.mutate(effectiveView.id)}
                      />
                    )}

                    {isPaidInFull ? (
                      <PaymentReceiptSummary
                        payments={orderPayments}
                        isLoading={paymentsQuery.isLoading}
                      />
                    ) : (
                      <>
                        {/* Superadmin: approve / reject uploaded receipts */}
                        {isSuperAdmin &&
                          pendingReceiptPayments.map((payment) => (
                            <ReceiptApprovalPanel
                              key={payment.id}
                              payment={payment}
                              isPending={verifyPayment.isPending}
                              onVerify={handleVerifyPayment}
                            />
                          ))}
                        <OfflinePaymentForm
                          view={effectiveView}
                          isPending={recordOfflinePayment.isPending}
                          onSubmit={handleRecordOffline}
                        />
                      </>
                    )}

                    <OrderPaymentHistory
                      payments={orderPayments}
                      isLoading={paymentsQuery.isLoading}
                    />
                  </div>
                )}

                {effectiveTab === 'images' && (
                  <div className="p-5 space-y-4">
                    {!['PICKED_UP_COMPLETED', 'DELIVERED_TO_RECIPIENT', 'CANCELLED'].includes(effectiveView.statusV2) && (
                      <PickupRepForm
                        view={effectiveView}
                        isPending={updatePickupRep.isPending}
                        onSubmit={handlePickupRep}
                      />
                    )}
                    <ImageGallery
                      orderId={effectiveView.id}
                      images={orderImages}
                      isLoading={imagesQuery.isLoading}
                      error={imagesQuery.error instanceof Error ? imagesQuery.error.message : null}
                      canDelete={canDeleteImage}
                      canUpload={!['PICKED_UP_COMPLETED', 'DELIVERED_TO_RECIPIENT', 'CANCELLED'].includes(effectiveView.statusV2)}
                      isUploading={uploadImage.isPending}
                      onUpload={handleUploadImages}
                      onDelete={handleDeleteImage}
                    />
                  </div>
                )}

                {effectiveTab === 'timeline' && (
                  <div className="p-5">
                    <OrderTimeline
                      events={timelineEvents}
                      isLoading={timelineQuery.isLoading}
                      error={timelineQuery.error instanceof Error ? timelineQuery.error : null}
                    />
                  </div>
                )}
                </div>{/* end tab outer card */}
              </>
            )}
          </section>
        </div>
      </div>

      {showCreateOrderModal && effectiveView && (
        <CreateOrderModal
          view={effectiveView}
          isPending={createOrderForCustomer.isPending}
          onSubmit={handleCreateOrderForCustomer}
          onClose={() => {
            setShowCreateOrderModal(false);
            createOrderForCustomer.reset();
          }}
        />
      )}
    </AppShell>
  );
}
