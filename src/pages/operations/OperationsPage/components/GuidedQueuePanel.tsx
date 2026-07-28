import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useOrderDetail } from '@/hooks';
import type { OrderListItem } from '@/types';
import { toView } from '@/pages/shared';
import { getQueueOrders } from '../utils/orderQueueFilters';
import type { QueueKind } from './QueueShell';
import { AllCaughtUp } from './AllCaughtUp';
import { QueueShell } from './QueueShell';
import { VerifyQueueStep } from './VerifyQueueStep';
import { HoldQueueStep } from './HoldQueueStep';
import { BatchQueueStep } from './BatchQueueStep';
import { PaymentQueueStep } from './PaymentQueueStep';
import { PreorderQueueStep } from './PreorderQueueStep';
import { AwaitingArrivalQueueStep } from './AwaitingArrivalQueueStep';

// ── Queue step loader (which step component renders for a given kind) ──────

interface QueueStepProps {
  queueType: QueueKind;
  orders: OrderListItem[];
  index: number;
  onNext: () => void;
  onSkip?: () => void;
  onExit: () => void;
  onAwaitArrival?: () => void;
  onStartVerification?: () => void;
}

function QueueStep({
  queueType,
  orders,
  index,
  onNext,
  onSkip,
  onExit,
  onAwaitArrival,
  onStartVerification,
}: QueueStepProps): ReactElement {
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
      <QueueShell
        queueType={queueType}
        currentIndex={index}
        totalCount={orders.length}
        onExit={onExit}
        primaryLabel="Back →"
        onPrimary={onExit}
      >
        <div className="py-20 text-center text-sm text-gray-400">No order to process</div>
      </QueueShell>
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
    case 'preorder':
      return (
        <PreorderQueueStep
          key={currentOrder.id}
          {...stepProps}
          onAwaitArrival={onAwaitArrival ?? onNext}
          onStartVerification={onStartVerification ?? onNext}
        />
      );
    case 'arrival':
      return (
        <AwaitingArrivalQueueStep
          key={currentOrder.id}
          {...stepProps}
          onStartVerification={onStartVerification ?? onNext}
        />
      );
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

// ── Guided queue state machine ──────────────────────────────────────────────

type QueuePhase =
  | { kind: 'queue'; queueType: QueueKind; orders: OrderListItem[]; index: number }
  | { kind: 'all-caught-up'; queueType: QueueKind };

export interface GuidedQueuePanelProps {
  /** Remounts (via `key={queueKind}` in the parent) whenever the kind changes. */
  queueKind: QueueKind;
  /** Initial order to focus within the freshly-derived snapshot, if present in it. */
  selectedOrderId: string | null;
  allOrders: OrderListItem[];
  /** Updates ?select=&queue= to keep the URL in sync with the current order —
   *  so a refresh lands back on roughly the same place. Pass `null` to clear
   *  both params (exit back to the browse pane). */
  onNavigate: (next: { select: string; queue: QueueKind } | null) => void;
}

export function GuidedQueuePanel({
  queueKind,
  selectedOrderId,
  allOrders,
  onNavigate,
}: GuidedQueuePanelProps): ReactElement {
  const [phase, setPhase] = useState<QueuePhase>(() => {
    const orders = getQueueOrders(allOrders, queueKind);
    // The selected order may have already been processed (e.g. a stale
    // ?select=&queue= link, or a refresh right after the last order in a
    // queue was finished) — land on "all caught up" instead of a dead-end
    // empty queue with nothing to render.
    if (orders.length === 0) return { kind: 'all-caught-up', queueType: queueKind };
    const foundIndex = orders.findIndex((o) => o.id === selectedOrderId);
    return { kind: 'queue', queueType: queueKind, orders, index: foundIndex >= 0 ? foundIndex : 0 };
  });

  const handleNext = (): void => {
    if (phase.kind !== 'queue') return;
    const { orders, index, queueType } = phase;
    const completedId = orders[index]?.id;
    const nextIndex = index + 1;
    if (nextIndex < orders.length) {
      setPhase({ ...phase, index: nextIndex });
      onNavigate({ select: orders[nextIndex].id, queue: queueType });
      return;
    }
    // Snapshot exhausted — check live data for newly arrived orders,
    // excluding the just-completed one (query invalidation is async; it may
    // still be in the cache).
    const fresh = getQueueOrders(allOrders, queueType).filter((o) => o.id !== completedId);
    if (fresh.length > 0) {
      setPhase({ kind: 'queue', queueType, orders: fresh, index: 0 });
      onNavigate({ select: fresh[0].id, queue: queueType });
    } else {
      setPhase({ kind: 'all-caught-up', queueType });
    }
  };

  const handleSkip = (): void => {
    if (phase.kind !== 'queue') return;
    const { orders, index } = phase;
    if (orders.length <= 1) return;
    const rotated = [...orders.slice(0, index), ...orders.slice(index + 1), orders[index]];
    setPhase({ ...phase, orders: rotated });
    const nowCurrent = rotated[index] ?? rotated[0];
    onNavigate({ select: nowCurrent.id, queue: phase.queueType });
  };

  const handleMoveToQueue = (nextKind: QueueKind): void => {
    if (phase.kind !== 'queue') return;
    const order = phase.orders[phase.index];
    if (!order) return;
    setPhase({ kind: 'queue', queueType: nextKind, orders: [order], index: 0 });
    onNavigate({ select: order.id, queue: nextKind });
  };

  const handleExit = (): void => onNavigate(null);

  if (phase.kind === 'all-caught-up') {
    const otherQueues = (['preorder', 'arrival', 'verify', 'holds', 'batch', 'payment', 'escalated'] as QueueKind[])
      .filter((k) => k !== phase.queueType)
      .map((k) => ({ kind: k, count: getQueueOrders(allOrders, k).length }))
      .filter((q) => q.count > 0)
      .map((q) => ({
        ...q,
        onStart: () => {
          const orders = getQueueOrders(allOrders, q.kind);
          if (orders.length === 0) return;
          setPhase({ kind: 'queue', queueType: q.kind, orders, index: 0 });
          onNavigate({ select: orders[0].id, queue: q.kind });
        },
      }));

    return <AllCaughtUp queueType={phase.queueType} otherQueues={otherQueues} onExit={handleExit} />;
  }

  return (
    <QueueStep
      queueType={phase.queueType}
      orders={phase.orders}
      index={phase.index}
      onNext={handleNext}
      onSkip={handleSkip}
      onExit={handleExit}
      onAwaitArrival={() => handleMoveToQueue('arrival')}
      onStartVerification={() => handleMoveToQueue('verify')}
    />
  );
}
