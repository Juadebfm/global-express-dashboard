import type { ReactElement } from 'react';
import { useUpdateOrderStatus } from '@/hooks';
import type { OrderView } from '@/pages/shared/orderStatus';
import { OverviewPanel } from './OverviewPanel';
import { OrderSummaryCard } from './OrderSummaryCard';
import { QueueShell } from './QueueShell';

interface AwaitingArrivalQueueStepProps {
  view: OrderView;
  currentIndex: number;
  totalCount: number;
  onSkip?: () => void;
  onExit: () => void;
  onStartVerification: () => void;
}

export function AwaitingArrivalQueueStep({
  view,
  currentIndex,
  totalCount,
  onSkip,
  onExit,
  onStartVerification,
}: AwaitingArrivalQueueStepProps): ReactElement {
  const updateStatus = useUpdateOrderStatus();
  const canReceive = view.statusV2 === 'AWAITING_WAREHOUSE_RECEIPT';

  const handleGoodsReceived = async () => {
    if (!canReceive) return;
    await updateStatus.mutateAsync({ orderId: view.id, statusV2: 'WAREHOUSE_RECEIVED' });
    onStartVerification();
  };

  return (
    <QueueShell
      queueType="arrival"
      currentIndex={currentIndex}
      totalCount={totalCount}
      onExit={onExit}
      onSkip={onSkip}
      hint={canReceive
        ? 'When the goods arrive, move directly into package verification.'
        : 'This order is no longer awaiting warehouse receipt.'}
      primaryLabel="Goods received — verify now →"
      primaryDisabled={!canReceive}
      isPending={updateStatus.isPending}
      onPrimary={() => void handleGoodsReceived()}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4">
          <p className="text-sm font-semibold text-brand-800">Awaiting warehouse arrival</p>
          <p className="mt-1 text-sm text-brand-700">
            Keep this booking here until the goods physically arrive. Marking them received opens the measurements, photos and pricing work for this exact order.
          </p>
        </div>

        <OrderSummaryCard view={view} />

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Booking details</h2>
            <p className="mt-1 text-sm text-gray-500">Use these details to match the arriving goods.</p>
          </div>
          <OverviewPanel view={view} />
        </section>

        {updateStatus.error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {updateStatus.error instanceof Error
              ? updateStatus.error.message
              : 'Could not mark these goods as received. Please try again.'}
          </div>
        )}
      </div>
    </QueueShell>
  );
}
