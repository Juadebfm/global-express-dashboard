import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Plane, Ship, Package2 } from 'lucide-react';
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
  // Air transit pipeline
  'DISPATCHED_TO_ORIGIN_AIRPORT',
  'AT_ORIGIN_AIRPORT',
  'BOARDED_ON_FLIGHT',
  'FLIGHT_DEPARTED',
  'FLIGHT_LANDED_LAGOS',
  // Sea transit pipeline
  'DISPATCHED_TO_ORIGIN_PORT',
  'AT_ORIGIN_PORT',
  'LOADED_ON_VESSEL',
  'VESSEL_DEPARTED',
  'VESSEL_ARRIVED_LAGOS_PORT',
  // Shared final-mile
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
            <p className="max-w-[180px] truncate text-sm font-medium text-gray-900" title={shippingMark ?? undefined}>
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

function BatchGroup({
  batchId,
  orders,
  linkLabel = 'Manage batch →',
}: {
  batchId: string;
  orders: OrderListItem[];
  linkLabel?: string;
}): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const shortId = batchId.slice(0, 8);
  const firstMode = orders[0]?.transportMode ?? 'air';

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
      >
        {expanded
          ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
        }
        <span className="shrink-0 text-gray-400">{modeIcon(firstMode)}</span>
        <span className="text-base font-semibold text-gray-900 font-mono">{shortId}</span>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600">
          {orders.length} order{orders.length !== 1 ? 's' : ''}
        </span>
        <Link
          to={ROUTES.BATCH_DETAIL.replace(':batchId', batchId)}
          onClick={(e) => e.stopPropagation()}
          className="ml-auto shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          {linkLabel}
        </Link>
      </button>
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Mobile: cards */}
          <div className="divide-y divide-gray-100 md:hidden">
            {orders.map((o) => {
              const style = getStatusStyle(o.statusV2);
              const raw = o.raw as Record<string, unknown>;
              const shippingMark = typeof raw['shippingMark'] === 'string' ? raw['shippingMark'] : null;
              const description = typeof raw['description'] === 'string' ? raw['description'] : null;
              const weight = typeof raw['weight'] === 'number' || typeof raw['weight'] === 'string' ? raw['weight'] : null;
              return (
                <div key={o.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900 max-w-[180px] truncate" title={shippingMark ?? description ?? undefined}>
                      {shippingMark ?? description ?? 'No description'}
                    </p>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', style.bgClass, style.textClass)}>
                      {o.statusLabel || o.statusV2}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{o.senderName ?? 'Unknown'}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Tracking</p>
                      <p className="text-xs font-mono text-gray-600">
                        {isInternalTracking(o.trackingNumber)
                          ? formatTrackingDisplay(o.trackingNumber)
                          : o.trackingNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Weight</p>
                      <p className="text-xs text-gray-600">{weight != null ? `${weight} kg` : '—'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 bg-gray-50">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 bg-gray-50">Customer</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 bg-gray-50">Tracking No.</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 bg-gray-50">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400 bg-gray-50">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => {
                  const style = getStatusStyle(o.statusV2);
                  const raw = o.raw as Record<string, unknown>;
                  const shippingMark = typeof raw['shippingMark'] === 'string' ? raw['shippingMark'] : null;
                  const description = typeof raw['description'] === 'string' ? raw['description'] : null;
                  const weight = typeof raw['weight'] === 'number' || typeof raw['weight'] === 'string'
                    ? raw['weight']
                    : null;

                  return (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <span className="block max-w-[150px] truncate" title={shippingMark ?? description ?? undefined}>
                          {shippingMark ?? description ?? 'No description'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {o.senderName ?? 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        {isInternalTracking(o.trackingNumber) ? (
                          <span className="text-xs italic text-gray-400">
                            {formatTrackingDisplay(o.trackingNumber)}
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-gray-400">
                            {o.trackingNumber}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          style.bgClass,
                          style.textClass,
                        )}>
                          {o.statusLabel || o.statusV2}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">
                        {weight != null ? `${weight} kg` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function OperationsPage(): ReactElement {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('arrivals');
  const [intakeOrder, setIntakeOrder] = useState<{ id: string; shippingMark: string | null } | null>(null);
  const recordIntake = useRecordShipmentIntake();

  const todayStr = new Date().toISOString().split('T')[0];

  const { orders: allArrivals, isLoading: arrivalsLoading, error: arrivalsError } = useOrders(
    1, 50, 'AWAITING_WAREHOUSE_RECEIPT'
  );
  const { orders: allOrders, total: allTotal, isLoading: allLoading, error: allError } = useOrders(
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
      && !DISPATCHED_STATUSES.has(o.statusV2)
  );

  // Group inBatchOrders by dispatchBatchId
  const batchGroups = inBatchOrders.reduce<Map<string, OrderListItem[]>>((map, o) => {
    const batchId = (o.raw as Record<string, unknown>)['dispatchBatchId'] as string;
    const existing = map.get(batchId) ?? [];
    existing.push(o);
    map.set(batchId, existing);
    return map;
  }, new Map());

  const dispatchedOrders = allOrders.filter((o) => DISPATCHED_STATUSES.has(o.statusV2));

  const dispatchedBatchGroups = dispatchedOrders.reduce<Map<string, OrderListItem[]>>((map, o) => {
    const batchId = (o.raw as Record<string, unknown>)['dispatchBatchId'] as string | undefined;
    const key = batchId ?? '__unbatched__';
    const existing = map.get(key) ?? [];
    existing.push(o);
    map.set(key, existing);
    return map;
  }, new Map());

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Operations</h1>
          <Link
            to={ROUTES.ORDERS}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            View all orders →
          </Link>
        </div>

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
          (o) => {
            const raw = o.raw as Record<string, unknown>;
            const shippingMark = typeof raw['shippingMark'] === 'string' ? raw['shippingMark'] : null;
            return (
              <OperationRow
                key={o.id}
                order={o}
                action={
                  <button
                    type="button"
                    onClick={() => setIntakeOrder({ id: o.id, shippingMark })}
                    className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Mark as received →
                  </button>
                }
              />
            );
          },
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

        {/* Tab: In Batch — grouped by dispatchBatchId */}
        {tab === 'in-batch' && (
          allLoading ? (
            <Card className="p-0 divide-y divide-gray-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                  <div className="h-4 w-4 rounded bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 rounded bg-gray-200" />
                    <div className="h-3 w-1/3 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </Card>
          ) : allError ? (
            <AlertBanner tone="error" message="Failed to load orders. Please refresh." />
          ) : batchGroups.size === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-gray-500">No orders in this stage.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {Array.from(batchGroups.entries()).map(([batchId, orders]) => (
                <BatchGroup key={batchId} batchId={batchId} orders={orders} />
              ))}
            </div>
          )
        )}

        {/* Tab: Dispatched — grouped by batch so staff can see contents on arrival */}
        {tab === 'dispatched' && (
          allLoading ? (
            <Card className="p-0 divide-y divide-gray-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                  <div className="h-4 w-4 rounded bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 rounded bg-gray-200" />
                    <div className="h-3 w-1/3 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </Card>
          ) : allError ? (
            <AlertBanner tone="error" message="Failed to load orders. Please refresh." />
          ) : dispatchedBatchGroups.size === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-gray-500">No dispatched orders yet.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {Array.from(dispatchedBatchGroups.entries()).map(([key, orders]) =>
                key === '__unbatched__' ? (
                  <Card key="unbatched" className="p-0 divide-y divide-gray-100">
                    {orders.map((o) => <OperationRow key={o.id} order={o} />)}
                  </Card>
                ) : (
                  <BatchGroup
                    key={key}
                    batchId={key}
                    orders={orders}
                    linkLabel="View batch →"
                  />
                )
              )}
            </div>
          )
        )}

        {/* Pagination gap notice */}
        {allTotal > 100 && (
          <p className="text-xs text-amber-600 text-center py-2">
            Showing first 100 orders. Use Batches page to manage older entries.
          </p>
        )}
      </div>

      {intakeOrder && (
        <ShipmentIntakeModal
          isPending={recordIntake.isPending}
          initialShippingMark={intakeOrder.shippingMark ?? undefined}
          onClose={() => setIntakeOrder(null)}
          onSubmit={async (payload) => {
            await recordIntake.mutate(payload);
            setIntakeOrder(null);
          }}
        />
      )}
    </AppLayout>
  );
}
