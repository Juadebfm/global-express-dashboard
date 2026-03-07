import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell, PageHeader } from '@/pages/shared';
import { useAuth, useDashboardData, usePayments, useSearch } from '@/hooks';
import type { ApiPayment } from '@/types';

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
    payment.paystackReference,
    payment.id,
    payment.orderId,
    payment.userId,
    payment.status,
    payment.paymentType,
    payment.currency,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

export function PaymentsPage(): ReactElement {
  const { t } = useTranslation('payments');
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const { data, isLoading, error } = useDashboardData();
  const { query, setQuery } = useSearch();
  const [activeStatus, setActiveStatus] = useState<(typeof PAYMENT_STATUSES)[number]>('all');
  const [userIdFilter, setUserIdFilter] = useState('');

  const paymentsQuery = usePayments({
    status: activeStatus === 'all' ? undefined : activeStatus,
    userId: isSuperadmin && userIdFilter.trim() ? userIdFilter.trim() : undefined,
  });

  const filteredPayments = useMemo(
    () => paymentsQuery.payments.filter((payment) => matchesQuery(payment, query)),
    [paymentsQuery.payments, query]
  );

  const loadingAll = isLoading || paymentsQuery.isLoading;

  return (
    <AppShell
      data={data}
      isLoading={loadingAll}
      error={error}
      loadingLabel={t('loadingLabel')}
    >
      <div className="space-y-6">
        <PageHeader
          title={t('pageTitle')}
          subtitle={t('subtitle')}
        />

        {paymentsQuery.error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {paymentsQuery.error}
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
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
                placeholder="Search reference, order, user..."
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

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-500">
            Showing {filteredPayments.length} of {paymentsQuery.total} payment records
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {payment.paystackReference || payment.id}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{payment.orderId}</td>
                      <td className="px-4 py-3 text-gray-600">{payment.userId}</td>
                      <td className="px-4 py-3 text-gray-700">{formatAmount(payment)}</td>
                      <td className="px-4 py-3 text-gray-700">{payment.paymentType}</td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'rounded-full px-2.5 py-1 text-xs font-semibold',
                            payment.status === 'successful'
                              ? 'bg-emerald-50 text-emerald-700'
                              : payment.status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : payment.status === 'abandoned'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-blue-50 text-blue-700',
                          ].join(' ')}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDateTime(payment.paidAt ?? payment.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
