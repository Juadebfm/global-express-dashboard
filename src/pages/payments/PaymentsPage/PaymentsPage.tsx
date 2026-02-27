import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useDashboardData, useSearch } from '@/hooks';
import { usePayments } from '@/hooks/usePayments';
import { AppShell, PageHeader, PagePlaceholder, type PlaceholderItem } from '@/pages/shared';
import type { ApiPayment } from '@/types';

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function mapPaymentToPlaceholder(payment: ApiPayment): PlaceholderItem {
  const amount = `${payment.currency} ${parseFloat(payment.amount).toLocaleString()}`;
  const date = formatDate(payment.paidAt ?? payment.createdAt);
  const subtitleParts = [amount, payment.paymentType, date].filter(Boolean);

  return {
    id: payment.id,
    title: `Payment ${payment.paystackReference || payment.id.slice(0, 8)}`,
    subtitle: subtitleParts.join(' — '),
    tag: payment.status,
  };
}

export function PaymentsPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { payments, total, isLoading: paymentsLoading, error: paymentsError } = usePayments();
  const { query } = useSearch();
  const items = useMemo(() => payments.map(mapPaymentToPlaceholder), [payments]);

  return (
    <AppShell
      data={data}
      isLoading={isLoading || paymentsLoading}
      error={error}
      loadingLabel="Loading payments..."
    >
      <div className="space-y-6">
        <PageHeader title="Payments" subtitle="Review payment transactions." />
        {paymentsError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {paymentsError}
          </div>
        )}
        <PagePlaceholder
          title="Payment Transactions"
          description={
            total > 0
              ? `${total} payment${total === 1 ? '' : 's'} found.`
              : 'All payment transactions will appear here.'
          }
          items={items}
          query={query}
          emptyLabel={paymentsError ? 'Unable to load payments.' : 'No payments match your search.'}
        />
      </div>
    </AppShell>
  );
}
