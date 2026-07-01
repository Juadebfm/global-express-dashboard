import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  useCan,
  useDashboardData,
  useMyPayments,
  useOrderDetail,
  useOrders,
  useOrderTimeline,
  useSearch,
  useUpdatePickupRep,
} from '@/hooks';
import { Pagination, TableRowsSkeleton } from '@/components/ui';
import { AppShell, PageHeader } from '@/pages/shared';
import { cn } from '@/utils';
import {
  OrderQueue,
  CustomerShipmentDetail,
  CustomerPaymentView,
  OperatorOrdersView,
} from './components';
import { includesQuery, toView } from './types';
import type { OperatorFilter } from './types';

export function OrdersPage(): ReactElement {
  const isOperator = useCan('app.operator');
  if (isOperator) return <OperatorOrdersView />;
  return <CustomerOrdersView />;
}

function CustomerOrdersView(): ReactElement {
  const { t } = useTranslation(['orders', 'shipments']);
  const { query, setQuery } = useSearch();

  const [activeFilter, setActiveFilter] = useState<OperatorFilter>('all');
  const [selectedOrderIdState, setSelectedOrderIdState] = useState<string | null>(null);
  const [showPaymentView, setShowPaymentView] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const setPage = (next: number): void => {
    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        if (next <= 1) updated.delete('page');
        else updated.set('page', String(next));
        return updated;
      },
      { replace: true },
    );
  };

  const { data: appData, isLoading: appLoading, error: appError } = useDashboardData();

  const {
    orders,
    pagination: ordersPagination,
    isLoading: ordersLoading,
    error: ordersError,
  } = useOrders(page);

  const visibleOrders = useMemo(() => orders.filter((o) => includesQuery(o, query)), [orders, query]);

  const selectParam = searchParams.get('select');
  const tabParam = searchParams.get('tab');

  const selectedOrderId = useMemo(() => {
    if (!visibleOrders.length) return null;
    if (selectParam && visibleOrders.some((o) => o.id === selectParam)) return selectParam;
    if (selectedOrderIdState && visibleOrders.some((o) => o.id === selectedOrderIdState))
      return selectedOrderIdState;
    return visibleOrders[0].id;
  }, [visibleOrders, selectedOrderIdState, selectParam]);

  useEffect(() => {
    if (selectParam && tabParam) {
      // tab param is for deep-links; no-op in customer view (no tabs)
    }
  }, [selectParam, tabParam]);

  const orderDetailQuery = useOrderDetail(selectedOrderId ?? undefined);
  const view = useMemo(() => {
    if (!orderDetailQuery.data) return null;
    const v = toView(orderDetailQuery.data);
    if (!v.senderName && selectedOrderId) {
      const queueItem = visibleOrders.find((o) => o.id === selectedOrderId);
      if (queueItem?.senderName) return { ...v, senderName: queueItem.senderName };
    }
    return v;
  }, [orderDetailQuery.data, selectedOrderId, visibleOrders]);

  const timelineQuery = useOrderTimeline(selectedOrderId ?? undefined, Boolean(selectedOrderId));
  const myPaymentsQuery = useMyPayments(true);
  const updatePickupRep = useUpdatePickupRep();

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

  const timelineEvents = timelineQuery.data?.timeline ?? [];
  const myOrderPayments = useMemo(
    () => (myPaymentsQuery.data ?? []).filter((p) => p.orderId === selectedOrderId),
    [myPaymentsQuery.data, selectedOrderId],
  );

  const handleSelectOrder = (id: string): void => {
    setSelectedOrderIdState(id);
    setShowPaymentView(false);
    setMobileShowDetail(true);
    if (searchParams.has('select')) {
      setSearchParams((prev) => {
        const updated = new URLSearchParams(prev);
        updated.delete('select');
        return updated;
      }, { replace: true });
    }
  };

  const handlePickupRep = async (orderId: string, name: string, phone: string) => {
    await updatePickupRep.mutateAsync({ orderId, pickupRepName: name, pickupRepPhone: phone });
  };

  return (
    <AppShell
      data={appData}
      isLoading={appLoading}
      error={ordersError ?? appError}
      loadingLabel={t('orders:loadingLabel')}
    >
      <div className="space-y-6">
        <PageHeader
          title={t('orders:pageTitle')}
          subtitle={t('orders:subtitle')}
        />

        <div className="grid gap-4 md:gap-6 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          {/* Left: Order list */}
          <div className={cn('min-w-0 space-y-3', mobileShowDetail ? 'hidden md:block' : '')}>
            {ordersLoading && orders.length === 0 ? (
              <TableRowsSkeleton columns={3} rows={8} ariaLabel={t('orders:loadingLabel')} />
            ) : (
              <OrderQueue
                orders={visibleOrders}
                total={ordersPagination.total}
                needsActionCount={0}
                selectedOrderId={selectedOrderId}
                isOperator={false}
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
            {ordersPagination.totalPages > 1 && (
              <Pagination
                page={ordersPagination.page}
                totalPages={ordersPagination.totalPages}
                total={ordersPagination.total}
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

          {/* Right: Detail */}
          <section className={cn('min-w-0 space-y-4', !mobileShowDetail ? 'hidden md:block' : '')}>
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
            ) : showPaymentView ? (
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
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
