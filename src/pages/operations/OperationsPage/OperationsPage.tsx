import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Ship, Package2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, AlertBanner } from '@/components/ui';
import { useAuth, useOrders, useRecordShipmentIntake } from '@/hooks';
import { getStatusStyle } from '@/lib/statusUtils';
import { formatTrackingDisplay, isInternalTracking } from '@/lib/trackingUtils';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';
import type { OrderListItem } from '@/types';
import { ShipmentIntakeModal } from '@/pages/shipments/components/ShipmentIntakeModal';

type Tab = 'arrivals' | 'needs-action' | 'in-batch' | 'dispatched';

const TABS: { id: Tab; label: string }[] = [
  { id: 'arrivals', label: "Today's Arrivals" },
  { id: 'needs-action', label: 'Needs Action' },
  { id: 'in-batch', label: 'In Batch' },
  { id: 'dispatched', label: 'Dispatched' },
];

const NEEDS_ACTION_STATUSES = new Set([
  'WAREHOUSE_RECEIVED',
  'ON_HOLD',
]);

const DISPATCHED_STATUSES = new Set([
  'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE',
  'READY_FOR_PICKUP',
  'LOCAL_COURIER_ASSIGNED',
  'IN_TRANSIT_TO_DESTINATION_CITY',
  'OUT_FOR_DELIVERY_DESTINATION_CITY',
  'DELIVERED_TO_RECIPIENT',
  'PICKED_UP_COMPLETED',
]);

function whatToDoNext(order: OrderListItem): string {
  if (order.statusV2 === 'WAREHOUSE_RECEIVED') return 'Add measurements';
  if (order.statusV2 === 'WAREHOUSE_VERIFIED_PRICED') return 'Add to batch';
  if (order.statusV2 === 'ON_HOLD') return 'Review hold reason';
  if (order.flaggedForAdminReview) return 'Review flag';
  return '';
}

function modeIcon(mode: string): ReactElement {
  if (mode === 'sea') return <Ship className="h-4 w-4" />;
  if (mode === 'air') return <Plane className="h-4 w-4" />;
  return <Package2 className="h-4 w-4" />;
}

function OperationRow({ order, action }: { order: OrderListItem; action?: ReactElement }): ReactElement {
  const style = getStatusStyle(order.statusV2);
  const raw = order.raw as Record<string, unknown>;
  const shippingMark = typeof raw['shippingMark'] === 'string' ? raw['shippingMark'] : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
      <span className="shrink-0 text-gray-400">{modeIcon(order.transportMode)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {shippingMark ?? (raw['description'] as string) ?? 'No description'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {order.senderName ?? 'Unknown customer'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {isInternalTracking(order.trackingNumber) ? (
                <span className="text-xs italic text-gray-400">
                  {formatTrackingDisplay(order.trackingNumber)}
                </span>
              ) : (
                <span className="text-xs font-mono text-gray-400">
                  {order.trackingNumber}
                </span>
              )}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  style.bgClass,
                  style.textClass,
                )}
              >
                {order.statusLabel || order.statusV2}
              </span>
            </div>
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}

export function OperationsPage(): ReactElement {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('arrivals');
  const [showIntake, setShowIntake] = useState(false);
  const recordIntake = useRecordShipmentIntake();

  const todayStr = new Date().toISOString().split('T')[0];

  const { orders: allArrivals, isLoading: arrivalsLoading, error: arrivalsError } = useOrders(
    1, 50, 'AWAITING_WAREHOUSE_RECEIPT'
  );
  const { orders: allOrders, isLoading: allLoading, error: allError } = useOrders(
    1, 100
  );

  const layoutUser = {
    displayName: user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
      : 'Staff',
    email: user?.email ?? '',
    avatarUrl: '/images/favicon.svg',
  };

  const todayArrivals = allArrivals.filter(
    (o) => o.createdAt && o.createdAt.startsWith(todayStr)
  );

  const needsActionOrders = allOrders.filter(
    (o) =>
      NEEDS_ACTION_STATUSES.has(o.statusV2) ||
      (o.statusV2 === 'WAREHOUSE_VERIFIED_PRICED' && !(o.raw as Record<string, unknown>)['dispatchBatchId']) ||
      o.flaggedForAdminReview
  );

  const inBatchOrders = allOrders.filter(
    (o) => !!(o.raw as Record<string, unknown>)['dispatchBatchId']
  );

  const dispatchedOrders = allOrders.filter((o) => DISPATCHED_STATUSES.has(o.statusV2));

  function renderList(
    items: OrderListItem[],
    loading: boolean,
    err: string | null,
    renderRow: (o: OrderListItem) => ReactElement,
  ): ReactElement {
    if (loading) {
      return (
        <Card className="p-0 divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
              <div className="h-4 w-4 rounded bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 rounded bg-gray-200" />
                <div className="h-3 w-1/3 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </Card>
      );
    }
    if (err) return <AlertBanner tone="error" message="Failed to load orders. Please refresh." />;
    if (items.length === 0) {
      return (
        <Card className="p-8 text-center">
          <p className="text-sm text-gray-500">No orders in this stage.</p>
        </Card>
      );
    }
    return (
      <Card className="p-0 divide-y divide-gray-100">
        {items.map((o) => renderRow(o))}
      </Card>
    );
  }

  return (
    <AppLayout user={layoutUser}>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Operations</h1>

        {/* Tab strip */}
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Today's Arrivals */}
        {tab === 'arrivals' && renderList(
          todayArrivals,
          arrivalsLoading,
          arrivalsError,
          (o) => (
            <OperationRow
              key={o.id}
              order={o}
              action={
                <button
                  type="button"
                  onClick={() => setShowIntake(true)}
                  className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Mark as received →
                </button>
              }
            />
          ),
        )}

        {/* Tab: Needs Action */}
        {tab === 'needs-action' && renderList(
          needsActionOrders,
          allLoading,
          allError,
          (o) => (
            <OperationRow
              key={o.id}
              order={o}
              action={
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-400">{whatToDoNext(o)}</p>
                </div>
              }
            />
          ),
        )}

        {/* Tab: In Batch */}
        {tab === 'in-batch' && renderList(
          inBatchOrders,
          allLoading,
          allError,
          (o) => {
            const batchId = (o.raw as Record<string, unknown>)['dispatchBatchId'] as string | undefined;
            return (
              <OperationRow
                key={o.id}
                order={o}
                action={
                  batchId ? (
                    <Link
                      to={ROUTES.BATCH_DETAIL.replace(':batchId', batchId)}
                      className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      Manage batch →
                    </Link>
                  ) : undefined
                }
              />
            );
          },
        )}

        {/* Tab: Dispatched */}
        {tab === 'dispatched' && renderList(
          dispatchedOrders,
          allLoading,
          allError,
          (o) => <OperationRow key={o.id} order={o} />,
        )}
      </div>

      {showIntake && (
        <ShipmentIntakeModal
          isPending={recordIntake.isPending}
          onClose={() => setShowIntake(false)}
          onSubmit={async (payload) => {
            await recordIntake.mutate(payload);
            setShowIntake(false);
          }}
        />
      )}
    </AppLayout>
  );
}
