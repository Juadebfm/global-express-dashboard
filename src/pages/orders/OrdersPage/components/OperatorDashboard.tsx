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
} from '@/hooks';
import type { OrderListItem } from '@/types';
import { cn } from '@/utils';
import { formatTrackingDisplay } from '@/lib/trackingUtils';
import { AppShell } from '@/pages/shared';
import { ShipmentIntakeModal } from '@/pages/shipments/components';
import { toView, needsAction } from '../types';
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
        <span className="mt-auto text-xs font-semibold text-brand-500">Start queue →</span>
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
          {order.statusLabel || order.statusV2}
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
    const charge = typeof raw.finalChargeUsd === 'number' ? raw.finalChargeUsd : 0;
    const paid = typeof raw.totalPaidUsd === 'number' ? raw.totalPaidUsd : 0;
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
          onClick={() => onStartQueue('payment')}
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
          onClick={() => onStartQueue('payment')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onStartQueue('payment')}
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
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
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
      return <VerifyQueueStep {...stepProps} />;
    case 'holds':
    case 'escalated':
      return <HoldQueueStep {...stepProps} />;
    case 'batch':
      return <BatchQueueStep {...stepProps} />;
    case 'payment':
      return <PaymentQueueStep {...stepProps} />;
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

