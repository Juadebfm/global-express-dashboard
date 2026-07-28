import type { ReactElement } from 'react';
import type { OrderListItem } from '@/types';
import type { DetailTab } from '@/pages/shared';
import type { QueueKind } from './QueueShell';
import { GuidedQueuePanel } from './GuidedQueuePanel';
import { OrderDetailPanel } from './OrderDetailPanel';

export interface OrderWorkspaceProps {
  selectedOrderId: string | null;
  /** Presence (vs absence) of a queue kind is what distinguishes guided-queue
   *  mode from plain inspect mode — see OperationsPage's URL param handling. */
  queueKind: QueueKind | null;
  detailTab: DetailTab;
  allOrders: OrderListItem[];
  onNavigate: (next: { select: string; queue?: QueueKind }) => void;
  onDetailTabChange: (tab: DetailTab) => void;
  onExit: () => void;
}

/** Right-pane router: nothing selected → empty state; ?queue set → guided
 *  queue workflow; ?select set only → tabbed inspect view. */
export function OrderWorkspace({
  selectedOrderId,
  queueKind,
  detailTab,
  allOrders,
  onNavigate,
  onDetailTabChange,
  onExit,
}: OrderWorkspaceProps): ReactElement {
  if (!selectedOrderId) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-20 text-center">
        <p className="text-sm font-medium text-gray-500">Select an order to get started</p>
        <p className="mt-1 text-xs text-gray-400">
          Pick a task card or a row from the list to see details or start working through a queue.
        </p>
      </div>
    );
  }

  if (queueKind) {
    return (
      <GuidedQueuePanel
        key={queueKind}
        queueKind={queueKind}
        selectedOrderId={selectedOrderId}
        allOrders={allOrders}
        onNavigate={(next) => {
          if (next) onNavigate({ select: next.select, queue: next.queue });
          else onExit();
        }}
      />
    );
  }

  return (
    <OrderDetailPanel
      orderId={selectedOrderId}
      activeTab={detailTab}
      onTabChange={onDetailTabChange}
      onExit={onExit}
    />
  );
}
