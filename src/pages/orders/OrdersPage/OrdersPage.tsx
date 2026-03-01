import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useDashboardData, useOrders, useSearch, useAuth } from '@/hooks';
import type { OrderListItem } from '@/types';
import { Button } from '@/components/ui';
import { AppShell, PageHeader, PagePlaceholder, type PlaceholderItem } from '@/pages/shared';
import { ROUTES } from '@/constants';
import { resolveLocation } from '@/utils';

function formatStatusLabel(status: string): string {
  return status
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null, locale: string = 'en-US'): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function mapOrderToPlaceholder(
  order: OrderListItem,
  t: (key: string, opts?: Record<string, unknown>) => string,
  locale: string,
): PlaceholderItem {
  const subtitleParts: string[] = [];
  const tLoc = (v: unknown): string => {
    const str = resolveLocation(v);
    return str ? t(`shipments:locations.${str}`, { defaultValue: str }) : '';
  };

  if (order.origin || order.destination) {
    subtitleParts.push(
      `${t('item.origin', { origin: tLoc(order.origin ?? 'Unknown') })} - ${t('item.destination', { destination: tLoc(order.destination ?? 'Unknown') })}`
    );
  }

  const createdAt = formatDate(order.createdAt, locale);
  if (createdAt) {
    subtitleParts.push(t('item.created', { date: createdAt }));
  }

  const statusTag = order.statusV2
    ? t(`shipments:statusV2.${order.statusV2}`, { defaultValue: order.statusLabel || formatStatusLabel(order.status) })
    : (order.statusLabel || formatStatusLabel(order.status));

  return {
    id: order.id,
    title: t('item.title', { trackingNumber: order.trackingNumber }),
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(' - ') : undefined,
    tag: statusTag,
  };
}

export function OrdersPage(): ReactElement {
  const { t, i18n } = useTranslation('orders');
  const dateLocale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
  const { data, isLoading, error } = useDashboardData();
  const { orders, total, isLoading: isOrdersLoading, error: ordersError } = useOrders();
  const { query } = useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const orderItems = useMemo(() => orders.map((o) => mapOrderToPlaceholder(o, t, dateLocale)), [orders, t, dateLocale]);

  const isOperator =
    user?.role === 'staff' || user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <AppShell
      data={data}
      isLoading={isLoading || isOrdersLoading}
      error={error}
      loadingLabel={t('loadingLabel')}
    >
      <div className="space-y-6">
        <PageHeader
          title={t('pageTitle')}
          subtitle={t('subtitle')}
          actions={
            isOperator ? (
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                className="bg-brand-500 text-white hover:bg-brand-600"
                onClick={() => navigate(ROUTES.NEW_SHIPMENT)}
              >
                {t('createClientOrder')}
              </Button>
            ) : undefined
          }
        />
        {ordersError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ordersError}
          </div>
        )}
        <PagePlaceholder
          title={t('queue.title')}
          description={
            total > 0
              ? t('queue.descriptionWithCount', { count: total })
              : t('queue.descriptionEmpty')
          }
          items={orderItems}
          query={query}
          emptyLabel={ordersError ? t('errorEmpty') : t('empty')}
        />
      </div>
    </AppShell>
  );
}
