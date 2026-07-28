import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Receipt, ShieldCheck, X } from 'lucide-react';
import { AppShell, PageHeader } from '@/pages/shared';
import { useCan, useDashboardData, useOrders, usePayments, useSearch, useVerifyOrderPayment } from '@/hooks';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';
import type { ApiPayment, OrderListItem } from '@/types';
import { ReceiptApprovalPanel } from '@/pages/operations/OperationsPage/components/ReceiptApprovalPanel';
import { ReceiptModal } from './ReceiptModal';

function ReviewReceiptModal({ payment, onClose }: { payment: ApiPayment; onClose: () => void }): ReactElement {
  const verifyPayment = useVerifyOrderPayment(payment.orderId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-sm font-semibold text-white">{payment.trackingNumber}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ReceiptApprovalPanel
          payment={payment}
          isPending={verifyPayment.isPending}
          onVerify={async (paymentId, decision, note) => {
            const result = await verifyPayment.mutateAsync({ paymentId, payload: { decision, note } });
            return { warning: result.warning ?? null };
          }}
        />
      </div>
    </div>
  );
}

function amountDue(order: OrderListItem): number | null {
  const raw = order.raw as Record<string, unknown>;
  const value = raw.amountDue != null ? parseFloat(raw.amountDue as string) : null;
  return value != null && value > 0 ? value : null;
}

/** A priced-but-unpaid order with no payment attempt yet — synthesized so it
 *  shows up in the "All"/"pending" tabs alongside real payment records,
 *  instead of only being visible via the balance-due banner. */
type DisplayPayment = ApiPayment & { isAwaitingStart?: boolean };

function toAwaitingPayment(order: OrderListItem, due: number): DisplayPayment {
  const at = order.createdAt ?? new Date().toISOString();
  return {
    id: `due-${order.id}`,
    orderId: order.id,
    userId: '',
    trackingNumber: order.trackingNumber,
    amount: due.toFixed(2),
    currency: 'USD',
    paystackReference: '',
    proofReference: null,
    status: 'pending',
    paymentType: 'transfer',
    paidAt: null,
    createdAt: at,
    updatedAt: at,
    isAwaitingStart: true,
  };
}

const PAYMENT_STATUSES = ['all', 'pending', 'successful', 'failed', 'abandoned'] as const;

function formatAmount(payment: ApiPayment): string {
  const amount = parseFloat(payment.amount);
  if (!Number.isFinite(amount)) return `${payment.currency} ${payment.amount}`;
  return `${payment.currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function matchesQuery(payment: ApiPayment, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    payment.trackingNumber,
    payment.amount,
    payment.currency,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

function statusStyle(payment: DisplayPayment): { label: string; bgClass: string; textClass: string; dotClass: string } {
  if (payment.isAwaitingStart) {
    return { label: 'Awaiting payment', bgClass: 'bg-amber-50', textClass: 'text-amber-700', dotClass: 'bg-amber-500' };
  }
  if (payment.status === 'successful') {
    return { label: 'successful', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', dotClass: 'bg-emerald-500' };
  }
  if (payment.status === 'failed') {
    return { label: 'failed', bgClass: 'bg-red-50', textClass: 'text-red-700', dotClass: 'bg-red-500' };
  }
  if (payment.status === 'abandoned') {
    return { label: 'abandoned', bgClass: 'bg-amber-50', textClass: 'text-amber-700', dotClass: 'bg-amber-500' };
  }
  return { label: 'pending', bgClass: 'bg-blue-50', textClass: 'text-blue-700', dotClass: 'bg-blue-500' };
}

export function PaymentsPage(): ReactElement {
  const { t } = useTranslation('payments');
  const navigate = useNavigate();
  const isSuperadmin = useCan('app.superadmin');
  const { data, isLoading, error } = useDashboardData();
  const { query, setQuery } = useSearch();
  const [activeStatus, setActiveStatus] = useState<(typeof PAYMENT_STATUSES)[number]>('all');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [reviewPayment, setReviewPayment] = useState<ApiPayment | null>(null);

  // Amount-due banner is customer-only — superadmin sees every user's
  // transactions here, not a personal balance.
  const { orders: myOrders } = useOrders(1, 100, undefined, { enabled: !isSuperadmin });
  const dueOrders = useMemo(
    () => (isSuperadmin ? [] : myOrders.filter((o) => amountDue(o) != null)),
    [myOrders, isSuperadmin],
  );

  const paymentsQuery = usePayments({
    status: activeStatus === 'all' ? undefined : activeStatus,
    userId: isSuperadmin && userIdFilter.trim() ? userIdFilter.trim() : undefined,
  });

  // Only surface synthetic "awaiting payment" rows on the tabs a real pending
  // payment would also appear under — not successful/failed/abandoned, which
  // describe an attempt that already happened.
  const awaitingPayments = useMemo<DisplayPayment[]>(() => {
    if (isSuperadmin || (activeStatus !== 'all' && activeStatus !== 'pending')) return [];
    const alreadyPending = new Set(
      paymentsQuery.payments.filter((p) => p.status === 'pending').map((p) => p.orderId),
    );
    return dueOrders
      .filter((o) => !alreadyPending.has(o.id))
      .map((o) => toAwaitingPayment(o, amountDue(o)!));
  }, [dueOrders, paymentsQuery.payments, activeStatus, isSuperadmin]);

  const filteredPayments = useMemo<DisplayPayment[]>(
    () => [...awaitingPayments, ...paymentsQuery.payments].filter((payment) => matchesQuery(payment, query)),
    [awaitingPayments, paymentsQuery.payments, query]
  );

  return (
    <AppShell
      data={data}
      isLoading={isLoading}
      error={error}
      loadingLabel={t('loadingLabel')}
    >
      <div className="space-y-6">
        <PageHeader
          title={t('pageTitle')}
          subtitle={t('subtitle')}
        />

        {dueOrders.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Balance due · {dueOrders.length} shipment{dueOrders.length !== 1 ? 's' : ''}
            </p>
            <div className="mt-2 divide-y divide-amber-100">
              {dueOrders.map((order) => {
                const due = amountDue(order);
                return (
                  <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{order.trackingNumber}</p>
                      <p className="text-xs text-amber-700">
                        ${due?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} due
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`${ROUTES.ORDERS}?select=${encodeURIComponent(order.id)}&pay=1`)}
                      className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                    >
                      Pay now
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {paymentsQuery.error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {paymentsQuery.error}
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Status
              </p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setActiveStatus(status)}
                    className={[
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                      activeStatus === status
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                    ].join(' ')}
                  >
                    {status === 'all' ? 'All' : status}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tracking number or amount..."
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              {isSuperadmin && (
                <input
                  type="text"
                  value={userIdFilter}
                  onChange={(event) => setUserIdFilter(event.target.value)}
                  placeholder="Filter by userId"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm text-gray-500">
              {paymentsQuery.isLoading
                ? 'Loading payment records...'
                : `${filteredPayments.length} of ${paymentsQuery.total + awaitingPayments.length} records`}
            </p>
          </div>

          {/* Mobile: card list */}
          <div className="divide-y divide-gray-100 md:hidden">
            {paymentsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 py-4 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                </div>
              ))
            ) : filteredPayments.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-400">No payments found</p>
            ) : (
              filteredPayments.map((payment) => {
                const style = statusStyle(payment);
                return (
                  <div key={payment.id} className="px-4 py-4">
                    {/* Primary row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-semibold text-gray-900 truncate">
                          {payment.trackingNumber || '—'}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {payment.isAwaitingStart ? (
                            <span className="text-gray-400">No payment started</span>
                          ) : (
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600">
                              {payment.paymentType}
                            </span>
                          )}
                        </p>
                      </div>
                      {/* Status badge */}
                      <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', style.bgClass, style.textClass)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', style.dotClass)} />
                        {style.label}
                      </span>
                    </div>
                    {/* Detail grid */}
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Amount</p>
                        <p className="text-xs font-semibold text-gray-900">{formatAmount(payment)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Date</p>
                        <p className="text-xs text-gray-700">{formatDateTime(payment.paidAt ?? payment.createdAt)}</p>
                      </div>
                    </div>
                    {/* Receipt / Pay now / Review */}
                    {payment.isAwaitingStart ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => navigate(`${ROUTES.ORDERS}?select=${encodeURIComponent(payment.orderId)}&pay=1`)}
                          className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                        >
                          Pay now
                        </button>
                      </div>
                    ) : payment.status === 'pending' ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setReviewPayment(payment)}
                          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Review
                        </button>
                      </div>
                    ) : payment.proofReference ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setReceiptUrl(payment.proofReference)}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          View Receipt
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Tracking</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Type</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paymentsQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                      Loading payments...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => {
                    const style = statusStyle(payment);
                    return (
                    <tr key={payment.id} className="transition hover:bg-gray-50">
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="font-mono text-xs font-medium text-gray-700">
                          {payment.trackingNumber || '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-900">
                        {formatAmount(payment)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {payment.isAwaitingStart ? (
                          <span className="text-xs text-gray-400">Not started</span>
                        ) : (
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600">
                            {payment.paymentType}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', style.bgClass, style.textClass)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', style.dotClass)} />
                          {style.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                        {formatDateTime(payment.paidAt ?? payment.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {payment.isAwaitingStart ? (
                          <button
                            type="button"
                            onClick={() => navigate(`${ROUTES.ORDERS}?select=${encodeURIComponent(payment.orderId)}&pay=1`)}
                            className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                          >
                            Pay now
                          </button>
                        ) : payment.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => setReviewPayment(payment)}
                            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Review
                          </button>
                        ) : payment.proofReference ? (
                          <button
                            type="button"
                            onClick={() => setReceiptUrl(payment.proofReference)}
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {receiptUrl && (
        <ReceiptModal url={receiptUrl} onClose={() => setReceiptUrl(null)} />
      )}

      {reviewPayment && (
        <ReviewReceiptModal payment={reviewPayment} onClose={() => setReviewPayment(null)} />
      )}
    </AppShell>
  );
}
