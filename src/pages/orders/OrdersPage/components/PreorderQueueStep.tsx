import type { ReactElement } from 'react';
import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useUpdateOrderStatus } from '@/hooks';
import type { OrderView } from '../types';
import { OverviewPanel } from './OverviewPanel';
import { OrderSummaryCard } from './OrderSummaryCard';
import { QueueShell } from './QueueShell';

interface PreorderQueueStepProps {
  view: OrderView;
  currentIndex: number;
  totalCount: number;
  onAwaitArrival: () => void;
  onStartVerification: () => void;
  onSkip?: () => void;
  onExit: () => void;
}

export function PreorderQueueStep({
  view,
  currentIndex,
  totalCount,
  onAwaitArrival,
  onStartVerification,
  onSkip,
  onExit,
}: PreorderQueueStepProps): ReactElement {
  const updateStatus = useUpdateOrderStatus();
  const [registeredForArrival, setRegisteredForArrival] = useState(false);
  const isPreorder = view.statusV2 === 'PREORDER_SUBMITTED' && !registeredForArrival;
  const isAwaitingArrival = view.statusV2 === 'AWAITING_WAREHOUSE_RECEIPT' || registeredForArrival;
  const canHandle = isPreorder || isAwaitingArrival;

  const handleArrivalLater = async () => {
    if (!isPreorder) return;
    await updateStatus.mutateAsync({ orderId: view.id, statusV2: 'AWAITING_WAREHOUSE_RECEIPT' });
    onAwaitArrival();
  };

  const handleGoodsReceived = async () => {
    if (!canHandle) return;
    if (isPreorder) {
      await updateStatus.mutateAsync({
        orderId: view.id,
        statusV2: 'AWAITING_WAREHOUSE_RECEIPT',
      });
      setRegisteredForArrival(true);
    }
    await updateStatus.mutateAsync({
      orderId: view.id,
      statusV2: 'WAREHOUSE_RECEIVED',
    });
    onStartVerification();
  };

  return (
    <QueueShell
      queueType="preorder"
      currentIndex={currentIndex}
      totalCount={totalCount}
      onExit={onExit}
      onSkip={onSkip}
      hint={canHandle
        ? 'Choose whether the goods have arrived before continuing.'
        : 'This order is already in warehouse handling.'}
      primaryLabel="Goods received — verify now →"
      primaryDisabled={!canHandle}
      isPending={updateStatus.isPending}
      onPrimary={() => void handleGoodsReceived()}
      secondaryLabel={isPreorder ? 'Await warehouse arrival' : undefined}
      secondaryDisabled={!isPreorder}
      onSecondary={isPreorder ? () => void handleArrivalLater() : undefined}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
          <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-blue-800">New booking review</p>
            <p className="mt-1 text-sm text-blue-700">
              If the goods are here, continue to package verification. Otherwise, register this booking as awaiting warehouse arrival.
            </p>
          </div>
        </div>

        <OrderSummaryCard view={view} />

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Booking details</h2>
            <p className="mt-1 text-sm text-gray-500">Customer, shipment, supplier and billing information.</p>
          </div>
          <OverviewPanel view={view} />
        </section>

        {updateStatus.error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {updateStatus.error instanceof Error
              ? updateStatus.error.message
              : 'Could not update this order. Please try again.'}
          </div>
        )}
      </div>
    </QueueShell>
  );
}
