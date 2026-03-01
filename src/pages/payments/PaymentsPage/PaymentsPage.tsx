import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardData, useSearch } from '@/hooks';
import { usePayments } from '@/hooks/usePayments';
import { AppShell, PageHeader, PagePlaceholder, type PlaceholderItem } from '@/pages/shared';
import type { ApiPayment } from '@/types';
import i18n from '@/i18n/i18n';

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

function useMapPaymentToPlaceholder() {
  const { t } = useTranslation('payments');
  return (payment: ApiPayment): PlaceholderItem => {
    const amount = `${payment.currency} ${parseFloat(payment.amount).toLocaleString()}`;
    const date = formatDate(payment.paidAt ?? payment.createdAt);
    const subtitleParts = [amount, payment.paymentType, date].filter(Boolean);

    return {
      id: payment.id,
      title: t('item.title', { reference: payment.paystackReference || payment.id.slice(0, 8) }),
      subtitle: subtitleParts.join(' — '),
      tag: payment.status,
    };
  };
}

export function PaymentsPage(): ReactElement {
  const { t } = useTranslation('payments');
  const { data, isLoading, error } = useDashboardData();
  const { payments, total, isLoading: paymentsLoading, error: paymentsError } = usePayments();
  const { query } = useSearch();
  const mapPaymentToPlaceholder = useMapPaymentToPlaceholder();
  const items = useMemo(() => payments.map(mapPaymentToPlaceholder), [payments, mapPaymentToPlaceholder]);

  return (
    <AppShell
      data={data}
      isLoading={isLoading || paymentsLoading}
      error={error}
      loadingLabel={t('loadingLabel')}
    >
      <div className="space-y-6">
        <PageHeader title={t('pageTitle')} subtitle={t('subtitle')} />
        {paymentsError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {paymentsError}
          </div>
        )}
        <PagePlaceholder
          title={t('transactions.title')}
          description={
            total > 0
              ? t('transactions.descriptionWithCount', { count: total })
              : t('transactions.descriptionEmpty')
          }
          items={items}
          query={query}
          emptyLabel={paymentsError ? t('errorEmpty') : t('empty')}
        />
      </div>
    </AppShell>
  );
}
