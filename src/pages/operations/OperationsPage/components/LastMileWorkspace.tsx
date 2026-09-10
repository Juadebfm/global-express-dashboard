import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, RefreshCw, ShieldAlert, Truck } from 'lucide-react';
import { Button, Card, ConfirmModal, Input } from '@/components/ui';
import { ApiError } from '@/lib/apiClient';
import { useBatchMovement, useBatchRoster, useLastMileActions, useOrderTimeline, usePermissions } from '@/hooks';
import { useFeedbackStore } from '@/store';
import type { BatchRosterOrder } from '@/types';
import { STATUS_LABELS } from '@/pages/shared/orderStatus';
import { getLastMileNextAction, isLastMileTerminal, type LastMileNextAction } from '@/utils/lastMile';
import { cn } from '@/utils';

function shipmentStatus(order: BatchRosterOrder): string {
  return order.status ?? '';
}

function statusLabel(order: BatchRosterOrder): string {
  return order.statusLabel || STATUS_LABELS[shipmentStatus(order)] || 'Status not recorded';
}

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session has ended. Sign in again to continue.';
    if (error.status === 403) return 'You need Manage local delivery access to update this shipment.';
    if (error.status === 409) return 'This shipment is still controlled by batch movement. Refresh and try again once the batch reaches the handoff stage.';
    if (error.status === 400) return error.message || 'This is not a valid next step for the shipment.';
  }
  return error instanceof Error ? error.message : 'Could not update this shipment. Please try again.';
}


function PaymentState({ order }: { order: BatchRosterOrder }): ReactElement {
  const paid = order.paymentCollectionStatus === 'PAID_IN_FULL';
  return (
    <span className={cn(
      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
      paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
    )}>
      {paid ? 'Paid in full' : 'Payment required'}
    </span>
  );
}

interface PickupTarget {
  id: string;
  trackingNumber: string;
}

export interface LastMileWorkspaceProps {
  batchId: string;
  onExit: () => void;
}

interface LastMileShipmentRowProps {
  order: BatchRosterOrder;
  customerName: string;
  canManage: boolean;
  permissionsReady: boolean;
  isWorking: boolean;
  onReady: (order: BatchRosterOrder) => void;
  onPickup: (order: BatchRosterOrder) => void;
  onStatus: (order: BatchRosterOrder, statusV2: string) => void;
  onResendPin: (order: BatchRosterOrder) => void;
}

function LastMileShipmentRow({
  order,
  customerName,
  canManage,
  permissionsReady,
  isWorking,
  onReady,
  onPickup,
  onStatus,
  onResendPin,
}: LastMileShipmentRowProps): ReactElement {
  const needsD2dRoutingFact = order.shipmentType === 'd2d' && shipmentStatus(order) === 'IN_TRANSIT_TO_LAGOS_OFFICE';
  const timelineQuery = useOrderTimeline(order.id, needsD2dRoutingFact);
  const requiresExtraTruckMovement = timelineQuery.data?.goodsBreakdown.some((item) => item.requiresExtraTruckMovement) ?? false;
  const next: LastMileNextAction = getLastMileNextAction(order, requiresExtraTruckMovement);
  const paymentRequired = next?.kind === 'ready' && order.paymentCollectionStatus !== 'PAID_IN_FULL';

  return (
    <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-sm font-semibold text-brand-600">{order.trackingNumber}</p>
        <p className="mt-0.5 text-sm text-gray-700">{customerName} · {order.shipmentTypeLabel}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{statusLabel(order)}</span>
          <PaymentState order={order} />
        </div>
      </div>
      <div className="flex flex-col items-start gap-2 lg:items-end">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Next action</p>
        {needsD2dRoutingFact && timelineQuery.isLoading ? (
          <span className="text-sm text-gray-400">Checking delivery route…</span>
        ) : needsD2dRoutingFact && timelineQuery.error ? (
          <button
            type="button"
            onClick={() => void timelineQuery.refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry route check
          </button>
        ) : !next ? (
          <span className="text-sm font-medium text-gray-500">{isLastMileTerminal(order) ? 'Completed' : 'No action available'}</span>
        ) : paymentRequired ? (
          <span className="text-sm font-medium text-amber-700">Full payment is required before pickup.</span>
        ) : !permissionsReady ? (
          <span className="text-sm text-gray-400">Checking access…</span>
        ) : !canManage ? (
          <span className="text-sm text-amber-700">Manage local delivery access is required.</span>
        ) : next.kind === 'ready' ? (
          <Button size="sm" onClick={() => onReady(order)} disabled={isWorking}>{next.label}</Button>
        ) : next.kind === 'pickup' ? (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button size="sm" onClick={() => onPickup(order)} disabled={isWorking}>{next.label}</Button>
            <Button variant="secondary" size="sm" onClick={() => onResendPin(order)} disabled={isWorking}>
              <KeyRound className="mr-1.5 h-4 w-4" />
              Resend PIN
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => onStatus(order, next.statusV2)} disabled={isWorking}>{next.label}</Button>
        )}
      </div>
    </div>
  );
}

export function LastMileWorkspace({ batchId, onExit }: LastMileWorkspaceProps): ReactElement {
  const rosterQuery = useBatchRoster(batchId);
  const movementQuery = useBatchMovement(batchId);
  const permissions = usePermissions();
  const canManage = permissions.can('local_delivery.manage');
  const actions = useLastMileActions();
  const pushMessage = useFeedbackStore((state) => state.pushMessage);
  const [readyTarget, setReadyTarget] = useState<PickupTarget | null>(null);
  const [pickupTarget, setPickupTarget] = useState<PickupTarget | null>(null);
  const [pin, setPin] = useState('');
  const [collectorName, setCollectorName] = useState('');
  const [collectorRelationship, setCollectorRelationship] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const customers = rosterQuery.data?.customers ?? [];
  const shipments = customers.flatMap((customer) =>
    customer.orders.map((order) => ({ order, customerName: customer.customerName })),
  );
  const isReadyForLastMile = movementQuery.data?.currentStatus === 'IN_TRANSIT_TO_LAGOS_OFFICE';
  const isLoading = rosterQuery.isLoading || movementQuery.isLoading;
  const hasError = rosterQuery.error || movementQuery.error;

  const handleError = async (error: unknown): Promise<void> => {
    setActionError(actionErrorMessage(error));
    if (error instanceof ApiError && error.status === 403) await permissions.refresh();
  };

  const handleStatusAction = async (order: BatchRosterOrder, statusV2: string): Promise<void> => {
    setActionError(null);
    try {
      await actions.updateStatus.mutateAsync({ batchId, orderId: order.id, statusV2 });
      pushMessage({ tone: 'success', message: 'Shipment status updated.' });
    } catch (error) {
      await handleError(error);
    }
  };

  const confirmReady = async (): Promise<void> => {
    if (!readyTarget) return;
    setActionError(null);
    try {
      await actions.updateStatus.mutateAsync({
        batchId,
        orderId: readyTarget.id,
        statusV2: 'READY_FOR_PICKUP',
      });
      pushMessage({ tone: 'success', message: 'Shipment is ready for pickup. The customer PIN has been sent.' });
      setReadyTarget(null);
    } catch (error) {
      await handleError(error);
    }
  };

  const confirmPickup = async (): Promise<void> => {
    if (!pickupTarget || !/^\d{6}$/.test(pin)) return;
    setActionError(null);
    try {
      await actions.complete.mutateAsync({
        batchId,
        orderId: pickupTarget.id,
        payload: {
          pin,
          ...(collectorName.trim() ? { collectorName: collectorName.trim() } : {}),
          ...(collectorRelationship.trim() ? { collectorRelationship: collectorRelationship.trim() } : {}),
        },
      });
      pushMessage({ tone: 'success', message: 'Pickup completed.' });
      setPickupTarget(null);
      setPin('');
      setCollectorName('');
      setCollectorRelationship('');
    } catch (error) {
      await handleError(error);
    }
  };

  const resendPin = async (order: BatchRosterOrder): Promise<void> => {
    setActionError(null);
    try {
      const result = await actions.resendPin.mutateAsync({ batchId, orderId: order.id });
      pushMessage({ tone: 'success', message: result.message || 'A replacement pickup PIN has been sent.' });
    } catch (error) {
      await handleError(error);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-300" />
        <p className="mt-2 text-sm text-gray-400">Loading shipment actions…</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-red-700">Could not load this batch’s shipment actions.</p>
        <Button className="mt-4" variant="secondary" size="sm" onClick={() => void Promise.all([rosterQuery.refetch(), movementQuery.refetch()])}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Retry
        </Button>
      </Card>
    );
  }

  if (!isReadyForLastMile) {
    return (
      <Card className="p-6 text-center">
        <Truck className="mx-auto h-7 w-7 text-gray-300" />
        <h1 className="mt-3 text-lg font-semibold text-gray-900">Shipment actions are not available yet</h1>
        <p className="mt-1 text-sm text-gray-500">
          This batch must reach On the way to our office before shipments can be managed individually.
        </p>
        <Button className="mt-4" variant="secondary" size="sm" onClick={onExit}>Back to batches</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onExit}
            className="mt-0.5 rounded-xl p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            aria-label="Back to batches"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm font-semibold text-gray-900">Last-mile fulfilment</p>
            <p className="mt-0.5 text-sm text-gray-500">
              {rosterQuery.data?.batch.masterTrackingNumber ?? 'Selected batch'} · {shipments.length} shipment{shipments.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        {!permissions.isReady ? (
          <span className="text-sm text-gray-400">Checking access…</span>
        ) : !canManage ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-amber-700">
            <ShieldAlert className="h-4 w-4" />
            Manage local delivery access is required to update shipments.
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Shipment actions enabled
          </span>
        )}
      </div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{actionError}</p>
        </div>
      )}

      {shipments.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm font-medium text-gray-700">No shipments were found in this batch.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-gray-100 px-5 py-4">
            <h1 className="font-semibold text-gray-900">Shipment actions</h1>
            <p className="mt-0.5 text-sm text-gray-500">Each shipment now progresses independently of the batch.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {shipments.map(({ order, customerName }) => (
              <LastMileShipmentRow
                key={order.id}
                order={order}
                customerName={customerName}
                canManage={canManage}
                permissionsReady={permissions.isReady}
                isWorking={actions.updateStatus.isPending || actions.complete.isPending || actions.resendPin.isPending}
                onReady={(target) => setReadyTarget({ id: target.id, trackingNumber: target.trackingNumber })}
                onPickup={(target) => setPickupTarget({ id: target.id, trackingNumber: target.trackingNumber })}
                onStatus={(target, statusV2) => void handleStatusAction(target, statusV2)}
                onResendPin={(target) => void resendPin(target)}
              />
            ))}
          </div>
        </Card>
      )}

      <ConfirmModal
        isOpen={readyTarget !== null}
        tone="success"
        title="Mark shipment ready for pickup?"
        message={readyTarget ? `Confirm that ${readyTarget.trackingNumber} has arrived at the Lagos office and is ready for customer collection. This sends the customer pickup PIN.` : ''}
        confirmLabel="Mark ready for pickup"
        cancelLabel="Cancel"
        isLoading={actions.updateStatus.isPending}
        onConfirm={() => void confirmReady()}
        onCancel={() => setReadyTarget(null)}
      />

      {pickupTarget && (
        <PickupModal
          target={pickupTarget}
          pin={pin}
          collectorName={collectorName}
          collectorRelationship={collectorRelationship}
          isPending={actions.complete.isPending}
          onPinChange={setPin}
          onCollectorNameChange={setCollectorName}
          onCollectorRelationshipChange={setCollectorRelationship}
          onClose={() => setPickupTarget(null)}
          onSubmit={() => void confirmPickup()}
        />
      )}
    </div>
  );
}

interface PickupModalProps {
  target: PickupTarget;
  pin: string;
  collectorName: string;
  collectorRelationship: string;
  isPending: boolean;
  onPinChange: (value: string) => void;
  onCollectorNameChange: (value: string) => void;
  onCollectorRelationshipChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

function PickupModal({
  target,
  pin,
  collectorName,
  collectorRelationship,
  isPending,
  onPinChange,
  onCollectorNameChange,
  onCollectorRelationshipChange,
  onClose,
  onSubmit,
}: PickupModalProps): ReactElement {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !isPending) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isPending, onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(event) => {
        if (event.target === overlayRef.current && !isPending) onClose();
      }}
    >
          <form
            className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="complete-pickup-title"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50">
                <KeyRound className="h-5 w-5 text-brand-700" />
              </span>
              <div>
                <h2 id="complete-pickup-title" className="text-lg font-semibold text-gray-900">Complete pickup</h2>
                <p className="mt-1 text-sm text-gray-500">Enter the six-digit PIN for {target.trackingNumber}.</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <Input
                label="Customer PIN"
                value={pin}
                onChange={(event) => onPinChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                error={pin && !/^\d{6}$/.test(pin) ? 'Enter the six-digit PIN.' : undefined}
              />
              <Input label="Collector name (optional)" value={collectorName} onChange={(event) => onCollectorNameChange(event.target.value)} />
              <Input label="Relationship to recipient (optional)" value={collectorRelationship} onChange={(event) => onCollectorRelationshipChange(event.target.value)} />
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!/^\d{6}$/.test(pin) || isPending}>
                {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Complete pickup
              </Button>
            </div>
          </form>
    </div>
  );
}
