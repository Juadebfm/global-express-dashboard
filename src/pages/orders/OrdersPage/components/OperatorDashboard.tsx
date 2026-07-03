import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Box,
  ClipboardCheck,
  CreditCard,
  Loader2,
  PackagePlus,
  Plane,
  Send,
  ShieldAlert,
  Ship,
  Truck,
} from 'lucide-react';
import {
  useAuth,
  useCan,
  useDashboardData,
  useOrders,
  useOrderDetail,
  useRecordShipmentIntake,
  useSendPaymentRequest,
} from '@/hooks';
import type { OrderListItem } from '@/types';
import { cn } from '@/utils';
import { formatTrackingDisplay } from '@/lib/trackingUtils';
import { AppShell } from '@/pages/shared';
import { ShipmentIntakeModal } from '@/pages/shipments/components';
import { toView, needsAction, STATUS_LABELS } from '../types';
import type { QueueKind } from './QueueShell';
import { AllCaughtUp } from './AllCaughtUp';
import { VerifyQueueStep } from './VerifyQueueStep';
import { HoldQueueStep } from './HoldQueueStep';
import { BatchQueueStep } from './BatchQueueStep';
import { PaymentQueueStep } from './PaymentQueueStep';

// ── State machine ────────────────────────────────────────────────────────────

type ViewState =
  | { kind: 'dashboard' }
  | { kind: 'queue'; queueType: QueueKind; orders: OrderListItem[]; index: number }
  | { kind: 'all-caught-up'; queueType: QueueKind };

// ── Queue membership ─────────────────────────────────────────────────────────

function getQueueOrders(orders: OrderListItem[], kind: QueueKind): OrderListItem[] {
  switch (kind) {
    case 'verify':
      return orders.filter(
        (o) =>
          o.statusV2 === 'WAREHOUSE_RECEIVED' ||
          o.statusV2 === 'CLAIM_APPROVED_PENDING_BULK_PROCESSING',
      );
    case 'holds':
      return orders.filter(
        (o) => o.statusV2 === 'ON_HOLD' && !(o.raw as Record<string, unknown>).dispatchBatchId,
      );
    case 'batch':
      return orders.filter(
        (o) =>
          o.statusV2 === 'WAREHOUSE_VERIFIED_PRICED' &&
          o.paymentCollectionStatus?.toUpperCase() === 'PAID_IN_FULL' &&
          !(o.raw as Record<string, unknown>).dispatchBatchId,
      );
    case 'payment':
      return orders.filter(
        (o) =>
          o.statusV2 === 'WAREHOUSE_VERIFIED_PRICED' &&
          o.paymentCollectionStatus?.toUpperCase() !== 'PAID_IN_FULL',
      );
    case 'escalated':
      return orders.filter((o) => o.statusV2 === 'ON_HOLD' && !!o.escalatedAt);
  }
}

function getAwaitingPaymentOrders(orders: OrderListItem[]): OrderListItem[] {
  return orders.filter(
    (o) =>
      o.statusV2 === 'WAREHOUSE_VERIFIED_PRICED' &&
      o.paymentCollectionStatus?.toUpperCase() === 'UNPAID',
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function waitLabel(createdAt: string | null): string {
  if (!createdAt) return '';
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
}

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface TaskCardProps {
  icon: ReactElement;
  label: string;
  count: number;
  color: string;
  onClick: () => void;
}

function TaskCard({ icon, label, count, color, onClick }: TaskCardProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count === 0}
      className={cn(
        'flex flex-col gap-2 rounded-2xl border bg-white p-5 text-left transition',
        count > 0
          ? 'cursor-pointer hover:border-gray-300 hover:shadow-sm'
          : 'cursor-default opacity-50',
      )}
    >
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{count}</p>
        <p className="text-sm font-medium text-gray-500">{label}</p>
      </div>
      {count > 0 && (
        <span className="mt-auto text-xs font-semibold text-brand-500">See orders →</span>
      )}
    </button>
  );
}

interface PriorityRowProps {
  order: OrderListItem;
  actionLabel: string;
  onAction: () => void;
}

function PriorityRow({ order, actionLabel, onAction }: PriorityRowProps): ReactElement {
  const isSea = order.transportMode === 'sea';
  const isD2D = (order.raw as Record<string, unknown>).shipmentType === 'd2d';
  const isOnHold = order.statusV2 === 'ON_HOLD';
  const wait = waitLabel(order.createdAt);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
          isD2D ? 'bg-purple-100' : isSea ? 'bg-blue-100' : 'bg-brand-100',
        )}
      >
        {isD2D ? (
          <Truck className="h-4 w-4 text-purple-600" />
        ) : isSea ? (
          <Ship className="h-4 w-4 text-blue-600" />
        ) : (
          <Plane className="h-4 w-4 text-brand-600" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-900">
            {order.senderName || formatTrackingDisplay(order.trackingNumber)}
          </p>
          {isOnHold && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              On hold
            </span>
          )}
        </div>
        <p className="truncate text-xs text-gray-500">
          {order.statusLabel || STATUS_LABELS[order.statusV2] || order.statusV2.replace(/_/g, ' ')}
          {wait ? ` · ${wait} ago` : ''}
        </p>
      </div>

      <button
        type="button"
        onClick={onAction}
        className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
      >
        {actionLabel} →
      </button>
    </div>
  );
}

// ── Recently sorted ──────────────────────────────────────────────────────────

const SORTED_EXCLUDE = new Set([
  'PREORDER_SUBMITTED',
  'AWAITING_WAREHOUSE_RECEIPT',
  'WAREHOUSE_RECEIVED',
  'CLAIM_APPROVED_PENDING_BULK_PROCESSING',
  'ON_HOLD',
  'WAREHOUSE_VERIFIED_PRICED',
  'CANCELLED',
  'RESTRICTED_ITEM_REJECTED',
]);

function statusBadgeClass(statusV2: string): string {
  const s = statusV2.toUpperCase();
  if (s.startsWith('DELIVERED') || s === 'PICKED_UP_COMPLETED') return 'bg-emerald-100 text-emerald-700';
  if (s.startsWith('IN_TRANSIT') || s.startsWith('OUT_FOR_DELIVERY')) return 'bg-blue-100 text-blue-700';
  if (s.startsWith('CUSTOMS') || s.startsWith('READY_FOR_PICKUP')) return 'bg-purple-100 text-purple-700';
  if (s.startsWith('LOADED') || s.startsWith('VESSEL') || s.startsWith('AT_ORIGIN_PORT')) return 'bg-cyan-100 text-cyan-700';
  if (s.startsWith('BOARDED') || s.startsWith('FLIGHT') || s.startsWith('AT_ORIGIN_AIRPORT')) return 'bg-sky-100 text-sky-700';
  return 'bg-gray-100 text-gray-600';
}

// ── Dashboard view ─────────────────────────────────────────────────────────

interface DashboardViewProps {
  allOrders: OrderListItem[];
  counts: Record<QueueKind, number>;
  isSuperAdmin: boolean;
  onStartQueue: (kind: QueueKind) => void;
  onShowIntake: () => void;
  userName: string;
}

function DashboardView({
  allOrders,
  counts,
  isSuperAdmin,
  onStartQueue,
  onShowIntake,
  userName,
}: DashboardViewProps): ReactElement {
  const paymentOrders = getQueueOrders(allOrders, 'payment');
  const outstandingUsd = paymentOrders.reduce((sum, o) => {
    const raw = o.raw as Record<string, unknown>;
    const charge = raw.finalChargeUsd != null ? parseFloat(raw.finalChargeUsd as string) : 0;
    const paid = raw.totalPaidUsd != null ? parseFloat(raw.totalPaidUsd as string) : 0;
    return sum + Math.max(0, charge - paid);
  }, 0);

  // Priority list: holds first, then by oldest (createdAt ascending)
  const priorityOrders = useMemo(() => {
    const actionable = allOrders.filter((o) =>
      needsAction(o.statusV2, o.paymentCollectionStatus, o.flaggedForAdminReview),
    );
    return [...actionable].sort((a, b) => {
      const aHold = a.statusV2 === 'ON_HOLD' ? 0 : 1;
      const bHold = b.statusV2 === 'ON_HOLD' ? 0 : 1;
      if (aHold !== bHold) return aHold - bHold;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });
  }, [allOrders]);

  const sendPaymentRequest = useSendPaymentRequest();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const handleResend = (orderId: string) => {
    setResendingId(orderId);
    sendPaymentRequest.mutate(orderId, { onSettled: () => setResendingId(null) });
  };

  // Awaiting payment: priced but customer hasn't submitted any receipt yet
  const awaitingOrders = useMemo(() => getAwaitingPaymentOrders(allOrders), [allOrders]);

  // Recently sorted: dispatched and beyond, newest first
  const recentlySorted = useMemo(() => {
    return allOrders
      .filter((o) => !SORTED_EXCLUDE.has(o.statusV2.toUpperCase()))
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10);
  }, [allOrders]);

  function getActionLabel(o: OrderListItem): string {
    if (o.statusV2 === 'ON_HOLD') return 'Resolve';
    if (o.statusV2 === 'WAREHOUSE_RECEIVED' || o.statusV2 === 'CLAIM_APPROVED_PENDING_BULK_PROCESSING') return 'Verify';
    if (o.statusV2 === 'WAREHOUSE_VERIFIED_PRICED') {
      const unpaid = o.paymentCollectionStatus?.toUpperCase() !== 'PAID_IN_FULL';
      return unpaid ? 'Collect' : 'Assign batch';
    }
    return 'Action';
  }

  function getQueueKindForOrder(o: OrderListItem): QueueKind {
    if (o.statusV2 === 'ON_HOLD') return 'holds';
    if (o.statusV2 === 'WAREHOUSE_RECEIVED' || o.statusV2 === 'CLAIM_APPROVED_PENDING_BULK_PROCESSING') return 'verify';
    if (o.statusV2 === 'WAREHOUSE_VERIFIED_PRICED') {
      const unpaid = o.paymentCollectionStatus?.toUpperCase() !== 'PAID_IN_FULL';
      return unpaid ? 'payment' : 'batch';
    }
    return 'verify';
  }

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Greeting + intake */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greetingWord()}{userName ? `, ${userName}` : ''}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">{today}</p>
        </div>
        <button
          type="button"
          onClick={onShowIntake}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          <PackagePlus className="h-4 w-4" />
          Record intake
        </button>
      </div>

      {/* Task cards */}
      <div className={cn('grid grid-cols-2 gap-3', isSuperAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
        <TaskCard
          icon={<ClipboardCheck className="h-5 w-5 text-brand-600" />}
          label="To verify"
          count={counts.verify}
          color="bg-brand-100"
          onClick={() => onStartQueue('verify')}
        />
        <TaskCard
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          label="On hold"
          count={counts.holds}
          color="bg-red-100"
          onClick={() => onStartQueue('holds')}
        />
        <TaskCard
          icon={<Box className="h-5 w-5 text-blue-600" />}
          label="Assign to batch"
          count={counts.batch}
          color="bg-blue-100"
          onClick={() => onStartQueue('batch')}
        />
        <TaskCard
          icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
          label="Collect payment"
          count={counts.payment}
          color="bg-emerald-100"
          onClick={() => document.getElementById('section-payment')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
        {isSuperAdmin && (
          <TaskCard
            icon={<ShieldAlert className="h-5 w-5 text-red-600" />}
            label="Needs your review"
            count={counts.escalated}
            color="bg-red-100"
            onClick={() => onStartQueue('escalated')}
          />
        )}
      </div>

      {/* Outstanding payments banner */}
      {paymentOrders.length > 0 && (
        <div
          className="flex cursor-pointer items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4"
          onClick={() => document.getElementById('section-payment')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && document.getElementById('section-payment')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          <div>
            <p className="text-sm font-semibold text-amber-800">Outstanding payments</p>
            <p className="text-xs text-amber-700">
              {paymentOrders.length} order{paymentOrders.length !== 1 ? 's' : ''}
              {outstandingUsd > 0
                ? ` · $${outstandingUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} overdue`
                : ''}
            </p>
          </div>
          <span className="text-sm font-semibold text-amber-700">Collect →</span>
        </div>
      )}

      {/* Priority list */}
      {priorityOrders.length > 0 && (
        <div id="section-priority" className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Up next · prioritised
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {priorityOrders.slice(0, 20).map((order) => (
              <PriorityRow
                key={order.id}
                order={order}
                actionLabel={getActionLabel(order)}
                onAction={() => {
                  const kind = getQueueKindForOrder(order);
                  onStartQueue(kind);
                }}
              />
            ))}
          </div>
          {priorityOrders.length > 20 && (
            <div className="px-4 py-3 text-center text-xs text-gray-400">
              +{priorityOrders.length - 20} more — use the task cards above to work through all queues
            </div>
          )}
        </div>
      )}

      {priorityOrders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <p className="text-sm font-medium text-gray-500">All orders are up to date</p>
          <p className="mt-1 text-xs text-gray-400">No pending actions right now</p>
        </div>
      )}

      {/* Recently sorted table */}
      {recentlySorted.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Recently sorted
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-400">Customer</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-400">Destination</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-400">Status</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 text-right">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentlySorted.map((order) => {
                  const isSea = order.transportMode === 'sea';
                  const isD2D = (order.raw as Record<string, unknown>).shipmentType === 'd2d';
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                            isD2D ? 'bg-purple-100' : isSea ? 'bg-blue-100' : 'bg-brand-100',
                          )}>
                            {isD2D ? (
                              <Truck className="h-3.5 w-3.5 text-purple-600" />
                            ) : isSea ? (
                              <Ship className="h-3.5 w-3.5 text-blue-600" />
                            ) : (
                              <Plane className="h-3.5 w-3.5 text-brand-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900 max-w-[160px]">
                              {order.senderName || formatTrackingDisplay(order.trackingNumber)}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono">
                              {formatTrackingDisplay(order.trackingNumber)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[120px]">
                        <span className="truncate block">{order.destination || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          statusBadgeClass(order.statusV2),
                        )}>
                          {order.statusLabel || STATUS_LABELS[order.statusV2] || order.statusV2.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 tabular-nums">
                        {waitLabel(order.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Awaiting payment panel */}
      {awaitingOrders.length > 0 && (
        <div id="section-payment" className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Awaiting payment · {awaitingOrders.length} order{awaitingOrders.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-400">No receipt submitted yet</p>
          </div>
          <div className="divide-y divide-gray-50">
            {awaitingOrders.map((order) => {
              const raw = order.raw as Record<string, unknown>;
              const charge = raw.finalChargeUsd != null ? parseFloat(raw.finalChargeUsd as string) : null;
              const sentAt = order.paymentDetailsSentAt;
              const isSea = order.transportMode === 'sea';
              const isD2D = raw.shipmentType === 'd2d';
              const isPending = resendingId === order.id;

              return (
                <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    isD2D ? 'bg-purple-100' : isSea ? 'bg-blue-100' : 'bg-brand-100',
                  )}>
                    {isD2D ? (
                      <Truck className="h-3.5 w-3.5 text-purple-600" />
                    ) : isSea ? (
                      <Ship className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <Plane className="h-3.5 w-3.5 text-brand-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {order.senderName || formatTrackingDisplay(order.trackingNumber)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {charge != null ? `$${charge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} due` : 'Charge not set'}
                      {sentAt ? ` · sent ${waitLabel(sentAt)} ago` : ' · details not sent'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleResend(order.id)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                    {sentAt ? 'Resend' : 'Send details'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Queue step loader ────────────────────────────────────────────────────────

interface QueueStepProps {
  queueType: QueueKind;
  orders: OrderListItem[];
  index: number;
  onNext: () => void;
  onSkip?: () => void;
  onExit: () => void;
}

function QueueStep({ queueType, orders, index, onNext, onSkip, onExit }: QueueStepProps): ReactElement {
  const currentOrder = orders[index];
  const orderDetailQuery = useOrderDetail(currentOrder?.id);
  const view = useMemo(() => {
    if (!orderDetailQuery.data) return null;
    const v = toView(orderDetailQuery.data);
    if (!v.senderName && currentOrder?.senderName) {
      return { ...v, senderName: currentOrder.senderName };
    }
    return v;
  }, [orderDetailQuery.data, currentOrder]);

  if (!currentOrder) {
    return (
      <div className="py-20 text-center text-sm text-gray-400">No order to process</div>
    );
  }

  if (orderDetailQuery.isLoading || !view) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-300" />
        <p className="mt-2 text-sm text-gray-400">Loading order…</p>
      </div>
    );
  }

  if (orderDetailQuery.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {orderDetailQuery.error instanceof Error
          ? orderDetailQuery.error.message
          : 'Failed to load order — try again or skip'}
      </div>
    );
  }

  const stepProps = {
    view,
    currentIndex: index,
    totalCount: orders.length,
    onNext,
    onSkip,
    onExit,
  };

  switch (queueType) {
    case 'verify':
      return <VerifyQueueStep key={currentOrder.id} {...stepProps} />;
    case 'holds':
    case 'escalated':
      return <HoldQueueStep key={currentOrder.id} {...stepProps} />;
    case 'batch':
      return <BatchQueueStep key={currentOrder.id} {...stepProps} />;
    case 'payment':
      return <PaymentQueueStep key={currentOrder.id} {...stepProps} />;
  }
}

// ── Main component ─────────────────────────────────────────────────────────

export function OperatorOrdersView(): ReactElement {
  const { data: appData, isLoading: appLoading, error: appError } = useDashboardData();
  const { user } = useAuth();
  const [viewState, setViewState] = useState<ViewState>({ kind: 'dashboard' });
  const [showIntake, setShowIntake] = useState(false);
  const recordIntake = useRecordShipmentIntake();

  const { orders: allOrders, isLoading: ordersLoading } = useOrders(1, 100);

  const isSuperAdmin = useCan('app.superadmin');

  const counts = useMemo<Record<QueueKind, number>>(
    () => ({
      verify: getQueueOrders(allOrders, 'verify').length,
      holds: getQueueOrders(allOrders, 'holds').length,
      batch: getQueueOrders(allOrders, 'batch').length,
      payment: getQueueOrders(allOrders, 'payment').length,
      escalated: getQueueOrders(allOrders, 'escalated').length,
    }),
    [allOrders],
  );

  const handleStartQueue = (kind: QueueKind) => {
    const orders = getQueueOrders(allOrders, kind);
    if (orders.length === 0) return;
    setViewState({ kind: 'queue', queueType: kind, orders, index: 0 });
  };

  const handleNext = () => {
    if (viewState.kind !== 'queue') return;
    const { orders, index, queueType } = viewState;
    const completedId = orders[index]?.id;
    const nextIndex = index + 1;
    if (nextIndex < orders.length) {
      // More orders in this snapshot — advance
      setViewState({ ...viewState, index: nextIndex });
    } else {
      // Snapshot exhausted — check live data for newly arrived orders, excluding the
      // just-completed one (query invalidation is async; it may still be in the cache)
      const fresh = getQueueOrders(allOrders, queueType).filter((o) => o.id !== completedId);
      if (fresh.length > 0) {
        setViewState({ kind: 'queue', queueType, orders: fresh, index: 0 });
      } else {
        setViewState({ kind: 'all-caught-up', queueType });
      }
    }
  };

  const handleSkip = () => {
    if (viewState.kind !== 'queue') return;
    const { orders, index } = viewState;
    if (orders.length <= 1) return;
    const rotated = [
      ...orders.slice(0, index),
      ...orders.slice(index + 1),
      orders[index],
    ];
    setViewState({ ...viewState, orders: rotated });
  };

  const handleExit = () => setViewState({ kind: 'dashboard' });

  const userName = user?.firstName ?? '';

  return (
    <AppShell
      data={appData}
      isLoading={appLoading || ordersLoading}
      error={appError}
      loadingLabel="Loading orders…"
    >
      {viewState.kind === 'dashboard' && (
        <DashboardView
          allOrders={allOrders}
          counts={counts}
          isSuperAdmin={isSuperAdmin}
          onStartQueue={handleStartQueue}
          onShowIntake={() => setShowIntake(true)}
          userName={userName}
        />
      )}

      {viewState.kind === 'queue' && (
        <QueueStep
          queueType={viewState.queueType}
          orders={viewState.orders}
          index={viewState.index}
          onNext={handleNext}
          onSkip={handleSkip}
          onExit={handleExit}
        />
      )}

      {viewState.kind === 'all-caught-up' && (
        <AllCaughtUp
          queueType={viewState.queueType}
          otherQueues={(Object.keys(counts) as QueueKind[])
            .filter((k) => k !== viewState.queueType && counts[k] > 0)
            .map((k) => ({
              kind: k,
              count: counts[k],
              onStart: () => handleStartQueue(k),
            }))}
          onExit={handleExit}
        />
      )}

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
    </AppShell>
  );
}

