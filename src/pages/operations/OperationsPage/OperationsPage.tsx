import type { ReactElement } from 'react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useAuth,
  useCan,
  useDashboardData,
  useOpenSupportTicketCount,
  useOrders,
  useRecordShipmentIntake,
} from '@/hooks';
import { AppShell } from '@/pages/shared';
import type { DetailTab } from '@/pages/shared';
import { ShipmentIntakeModal } from '@/pages/shipments/components';
import { ROUTES } from '@/constants';
import { BrowsePane } from './components/BrowsePane';
import { OrderWorkspace } from './components/OrderWorkspace';
import type { QueueKind } from './components/QueueShell';

const QUEUE_KINDS: readonly QueueKind[] = ['preorder', 'arrival', 'verify', 'holds', 'batch', 'payment', 'escalated'];
const DETAIL_TABS: readonly DetailTab[] = ['overview', 'warehouse', 'records', 'payment', 'images', 'timeline'];

function asQueueKind(value: string | null): QueueKind | null {
  return value && (QUEUE_KINDS as readonly string[]).includes(value) ? (value as QueueKind) : null;
}

function asDetailTab(value: string | null): DetailTab | null {
  return value && (DETAIL_TABS as readonly string[]).includes(value) ? (value as DetailTab) : null;
}

/**
 * Consolidated staff order workspace — replaces the old three-page split
 * (/orders, /operations, /shipments). Single full-width column that toggles
 * between two mutually-exclusive views: browse (action chips + priority
 * list) when nothing is selected, or the order workspace (tabbed detail
 * view or a guided single-order queue workflow) once an order is selected.
 * Batch/dispatch browsing lives on /batches, not here. Selection lives
 * entirely in the URL (?select=&queue=&tab=) so refresh, back, and shared
 * links all resolve to the right view.
 */
export function OperationsPage(): ReactElement {
  const { user } = useAuth();
  const { data: appData, isLoading: appLoading, error: appError } = useDashboardData();
  const { orders: allOrders, isLoading: ordersLoading } = useOrders(1, 100);
  const isSuperAdmin = useCan('app.superadmin');
  const [searchParams, setSearchParams] = useSearchParams();
  const [showIntake, setShowIntake] = useState(false);
  const recordIntake = useRecordShipmentIntake();
  const navigate = useNavigate();
  const openSupportCount = useOpenSupportTicketCount();

  const selectedOrderId = searchParams.get('select');
  const queueKind = asQueueKind(searchParams.get('queue'));
  const detailTab = asDetailTab(searchParams.get('tab')) ?? 'overview';

  function updateParams(next: { select?: string | null; queue?: QueueKind | null; tab?: DetailTab | null }): void {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next.select !== undefined) {
        if (next.select === null) params.delete('select'); else params.set('select', next.select);
      }
      if (next.queue !== undefined) {
        if (next.queue === null) params.delete('queue'); else params.set('queue', next.queue);
      }
      if (next.tab !== undefined) {
        if (next.tab === null) params.delete('tab'); else params.set('tab', next.tab);
      }
      return params;
    }, { replace: true });
  }

  const handleStartQueue = (id: string, kind: QueueKind): void =>
    updateParams({ select: id, queue: kind, tab: null });
  const handleExit = (): void => updateParams({ select: null, queue: null, tab: null });
  const handleDetailTabChange = (tab: DetailTab): void => updateParams({ tab });
  const handleGuidedNavigate = (next: { select: string; queue?: QueueKind }): void =>
    updateParams({ select: next.select, queue: next.queue ?? null });

  const handleShowIntake = (): void => setShowIntake(true);
  const handleShowSupport = (): void => { void navigate(ROUTES.SUPPORT); };

  const userName = user?.firstName ?? '';
  const hasSelection = !!selectedOrderId;

  return (
    <AppShell
      data={appData}
      isLoading={appLoading || ordersLoading}
      error={appError}
      loadingLabel="Loading orders…"
    >
      <div className="mb-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleShowSupport}
          className="relative rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Support
          {openSupportCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-none text-white">
              {openSupportCount > 99 ? '99+' : openSupportCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={handleShowIntake}
          className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          Record intake
        </button>
      </div>

      {hasSelection ? (
        <OrderWorkspace
          selectedOrderId={selectedOrderId}
          queueKind={queueKind}
          detailTab={detailTab}
          allOrders={allOrders}
          onNavigate={handleGuidedNavigate}
          onDetailTabChange={handleDetailTabChange}
          onExit={handleExit}
        />
      ) : (
        <BrowsePane
          allOrders={allOrders}
          isSuperAdmin={isSuperAdmin}
          userName={userName}
          onStartQueue={handleStartQueue}
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
