import type { ReactElement } from 'react';
import { useState } from 'react';
import { Plane, Plus, Ship } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useBatches, useAddOrderToBatch, useCreateBatch } from '@/hooks';
import { cn } from '@/utils';
import type { OrderView } from '../types';
import { QueueShell } from './QueueShell';
import { OrderSummaryCard } from './OrderSummaryCard';

interface BatchQueueStepProps {
  view: OrderView;
  currentIndex: number;
  totalCount: number;
  onNext: () => void;
  onSkip?: () => void;
  onExit: () => void;
}

export function BatchQueueStep({
  view,
  currentIndex,
  totalCount,
  onNext,
  onSkip,
  onExit,
}: BatchQueueStepProps): ReactElement {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const transportMode = (view.transportMode || view.shipmentType) === 'sea' ? 'sea' : 'air';

  const queryClient = useQueryClient();

  const { data: batchesData, isLoading: batchesLoading } = useBatches({
    status: 'open',
    transportMode,
  });
  const addOrderToBatch = useAddOrderToBatch();
  const createBatch = useCreateBatch();

  const batches = batchesData?.batches ?? [];

  const isAlreadyInBatch = (err: unknown) =>
    err instanceof Error && err.message.toLowerCase().includes('already in a batch');

  const handleAssign = async () => {
    if (!selectedBatchId) return;
    try {
      await addOrderToBatch.mutateAsync({ batchId: selectedBatchId, orderId: view.id });
    } catch (err) {
      if (isAlreadyInBatch(err)) {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        onNext();
      }
      return;
    }
    onNext();
  };

  const handleCreateAndAssign = async () => {
    try {
      const newBatch = await createBatch.mutateAsync({ transportMode });
      await addOrderToBatch.mutateAsync({ batchId: newBatch.id, orderId: view.id });
    } catch (err) {
      if (isAlreadyInBatch(err)) {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        onNext();
      }
      return;
    }
    onNext();
  };

  const isPending = addOrderToBatch.isPending || createBatch.isPending;
  const error = addOrderToBatch.error || createBatch.error;

  const canAssign = (selectedBatchId !== null && !creatingNew) || creatingNew;

  return (
    <QueueShell
      queueType="batch"
      currentIndex={currentIndex}
      totalCount={totalCount}
      onExit={onExit}
      onSkip={onSkip}
      hint={canAssign ? undefined : 'Select an open batch or create a new one'}
      primaryLabel={creatingNew ? 'Create batch & assign →' : 'Assign to batch →'}
      primaryDisabled={!canAssign}
      isPending={isPending}
      onPrimary={() => {
        if (creatingNew) void handleCreateAndAssign();
        else void handleAssign();
      }}
    >
      <div className="space-y-4">
        <OrderSummaryCard view={view} />

        {/* Batch selector */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Open batches</p>
            <p className="mt-0.5 text-sm text-gray-600">
              Select a {transportMode === 'sea' ? 'sea' : 'air'} batch to assign this order to
            </p>
          </div>

          {batchesLoading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Loading batches…</div>
          ) : batches.length === 0 && !creatingNew ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">
              No open batches available — create a new one below
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => {
                    setSelectedBatchId(batch.id);
                    setCreatingNew(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 px-5 py-3.5 text-left transition',
                    selectedBatchId === batch.id && !creatingNew
                      ? 'bg-brand-50'
                      : 'hover:bg-gray-50',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                      batch.transportMode === 'sea' ? 'bg-blue-100' : 'bg-brand-100',
                    )}
                  >
                    {batch.transportMode === 'sea' ? (
                      <Ship className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Plane className="h-4 w-4 text-brand-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-gray-900">
                      {batch.masterTrackingNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      {batch.orderCount} order{batch.orderCount !== 1 ? 's' : ''}
                      {' · '}
                      {batch.statusLabel}
                    </p>
                  </div>
                  {selectedBatchId === batch.id && !creatingNew && (
                    <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Create new option */}
          <div className={cn('border-t border-gray-100', batches.length === 0 ? '' : '')}>
            <button
              type="button"
              onClick={() => {
                setCreatingNew(true);
                setSelectedBatchId(null);
              }}
              className={cn(
                'flex w-full items-center gap-3 px-5 py-3.5 text-left transition',
                creatingNew ? 'bg-brand-50' : 'hover:bg-gray-50',
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                <Plus className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Create new batch</p>
                <p className="text-xs text-gray-500">
                  Start a new open {transportMode} batch and assign this order
                </p>
              </div>
              {creatingNew && (
                <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error instanceof Error ? error.message : 'Failed to assign batch — please try again'}
          </div>
        )}
      </div>
    </QueueShell>
  );
}
