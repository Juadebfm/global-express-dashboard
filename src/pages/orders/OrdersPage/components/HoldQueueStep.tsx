import type { ReactElement } from 'react';
import { useState } from 'react';
import { AlertTriangle, Clock, Phone, ShieldAlert } from 'lucide-react';
import { useUpdateOrderStatus, useEscalateOrder, useClearEscalation, useCan } from '@/hooks';
import { cn } from '@/utils';
import type { OrderView } from '../types';
import { QueueShell } from './QueueShell';
import { OrderSummaryCard } from './OrderSummaryCard';

interface HoldQueueStepProps {
  view: OrderView;
  currentIndex: number;
  totalCount: number;
  onNext: () => void;
  onSkip?: () => void;
  onExit: () => void;
}

export function HoldQueueStep({
  view,
  currentIndex,
  totalCount,
  onNext,
  onSkip,
  onExit,
}: HoldQueueStepProps): ReactElement {
  const isSuperAdmin = useCan('app.superadmin');
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateNote, setEscalateNote] = useState('');
  const [escalateConfirm, setEscalateConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const updateStatus = useUpdateOrderStatus();
  const escalate = useEscalateOrder();
  const clearFlag = useClearEscalation();

  const isEscalated = !!view.escalatedAt;
  const releaseTarget = view.finalChargeUsd != null
    ? 'WAREHOUSE_VERIFIED_PRICED'
    : 'WAREHOUSE_RECEIVED';

  const handleRelease = async () => {
    await updateStatus.mutateAsync({ orderId: view.id, statusV2: releaseTarget });
    onNext();
  };

  const handleEscalate = async () => {
    if (!escalateNote.trim()) return;
    await escalate.mutateAsync({ orderId: view.id, note: escalateNote.trim() });
    onNext();
  };

  const handleClearFlag = async () => {
    await clearFlag.mutateAsync(view.id);
    onNext();
  };

  const handleCancel = async () => {
    await updateStatus.mutateAsync({ orderId: view.id, statusV2: 'CANCELLED' });
    onNext();
  };

  const isPending = updateStatus.isPending || escalate.isPending || clearFlag.isPending;
  const error = updateStatus.error || escalate.error || clearFlag.error;

  // ── Contact card ──────────────────────────────────────────────────────────

  const contactCard = (
    <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
      <div className="px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Customer contact</p>
        <p className="mt-1 text-base font-semibold text-gray-900">{view.senderName || '—'}</p>
      </div>
      {view.recipientPhone && (
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Phone className="h-4 w-4 text-gray-400" />
            {view.recipientPhone}
          </div>
          <a
            href={`tel:${view.recipientPhone}`}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-100"
          >
            Call
          </a>
        </div>
      )}
      {view.recipientAddress && (
        <div className="px-5 py-3">
          <p className="text-xs font-medium text-gray-400">Delivery address</p>
          <p className="mt-0.5 text-sm text-gray-800">{view.recipientAddress}</p>
        </div>
      )}
    </div>
  );

  // ── Hold context ──────────────────────────────────────────────────────────

  const holdContext = (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <div>
        <p className="text-sm font-semibold text-amber-800">Order is on hold</p>
        <p className="mt-0.5 text-sm text-amber-700">
          Review the shipment details with the customer and confirm the delivery address is correct
          before releasing.{' '}
          {view.finalChargeUsd != null
            ? 'The order will return to Verified & Priced once released.'
            : 'The order will return to At Warehouse for re-verification once released.'}
        </p>
      </div>
    </div>
  );

  // ── PATH A: Superadmin view ───────────────────────────────────────────────

  if (isSuperAdmin) {
    return (
      <QueueShell
        queueType={isEscalated ? 'escalated' : 'holds'}
        currentIndex={currentIndex}
        totalCount={totalCount}
        onExit={onExit}
        onSkip={onSkip}
        hint="Review the escalation, then release, return to staff, or cancel"
        primaryLabel="Release from hold →"
        isPending={isPending}
        onPrimary={() => void handleRelease()}
        secondaryLabel={isEscalated ? 'Clear flag' : undefined}
        secondaryDisabled={isPending}
        onSecondary={isEscalated ? () => void handleClearFlag() : undefined}
      >
        <div className="space-y-4">
          <OrderSummaryCard view={view} />

          {isEscalated && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-red-800">Escalated by staff</p>
                  {view.escalatedAt && (
                    <p className="mt-0.5 text-xs text-red-500">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {new Date(view.escalatedAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  )}
                  {view.escalationNote && (
                    <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                      "{view.escalationNote}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {contactCard}
          {holdContext}

          {/* Destructive cancel — inline, not in bottom bar */}
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Destructive actions</p>
            {!cancelConfirm ? (
              <button
                type="button"
                onClick={() => setCancelConfirm(true)}
                disabled={isPending}
                className="mt-3 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                Cancel order
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-red-700 font-medium">
                  This will permanently cancel the order and notify the customer. Are you sure?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCancel()}
                    disabled={isPending}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    Yes, cancel order
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelConfirm(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Go back
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error instanceof Error ? error.message : 'Action failed — please try again'}
            </div>
          )}
        </div>
      </QueueShell>
    );
  }

  // ── PATH B: Staff + order already escalated (locked) ─────────────────────

  if (isEscalated) {
    return (
      <QueueShell
        queueType="holds"
        currentIndex={currentIndex}
        totalCount={totalCount}
        onExit={onExit}
        onSkip={onSkip}
        hint="This hold is awaiting supervisor review — no further action needed"
        primaryLabel="Awaiting supervisor"
        primaryDisabled
        isPending={false}
        onPrimary={() => {}}
      >
        <div className="space-y-4">
          <OrderSummaryCard view={view} />
          {contactCard}
          {holdContext}

          <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-700">Escalated for supervisor review</p>
              {view.escalatedAt && (
                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(view.escalatedAt).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
              {view.escalationNote && (
                <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-gray-600 ring-1 ring-gray-200">
                  "{view.escalationNote}"
                </p>
              )}
            </div>
          </div>
        </div>
      </QueueShell>
    );
  }

  // ── PATH C: Staff + order not escalated ───────────────────────────────────

  return (
    <QueueShell
      queueType="holds"
      currentIndex={currentIndex}
      totalCount={totalCount}
      onExit={onExit}
      onSkip={onSkip}
      hint="Contact the customer, then release the hold or flag for supervisor"
      primaryLabel="Release from hold →"
      isPending={isPending}
      onPrimary={() => void handleRelease()}
      secondaryLabel={escalateConfirm ? 'Confirm escalation' : 'Flag for review'}
      secondaryDisabled={isPending || (escalateConfirm && !escalateNote.trim())}
      onSecondary={
        escalateConfirm
          ? () => void handleEscalate()
          : () => setEscalateOpen((v) => !v)
      }
    >
      <div className="space-y-4">
        <OrderSummaryCard view={view} />
        {contactCard}
        {holdContext}

        {/* Escalation panel */}
        {escalateOpen && (
          <div className={cn(
            'rounded-2xl border px-5 py-4 space-y-3',
            escalateConfirm ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white',
          )}>
            <div className="flex items-start gap-2">
              <ShieldAlert className={cn('mt-0.5 h-4 w-4 shrink-0', escalateConfirm ? 'text-red-500' : 'text-gray-400')} />
              <div>
                <p className={cn('text-sm font-semibold', escalateConfirm ? 'text-red-800' : 'text-gray-800')}>
                  {escalateConfirm
                    ? 'Confirm — this will flag the order for the supervisor'
                    : 'Flag for supervisor review'}
                </p>
                <p className={cn('mt-0.5 text-xs', escalateConfirm ? 'text-red-600' : 'text-gray-500')}>
                  {escalateConfirm
                    ? 'The order will be locked until the supervisor acts on it.'
                    : 'Use this when you cannot resolve the hold on your own. Add a note explaining the situation.'}
                </p>
              </div>
            </div>
            <textarea
              value={escalateNote}
              onChange={(e) => {
                setEscalateNote(e.target.value);
                if (escalateConfirm) setEscalateConfirm(false);
              }}
              placeholder="Describe the issue — e.g. 'Customer unreachable for 3 days, address may be wrong'"
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 resize-none transition"
            />
            {!escalateConfirm && (
              <button
                type="button"
                disabled={!escalateNote.trim()}
                onClick={() => setEscalateConfirm(true)}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Review & confirm →
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error instanceof Error ? error.message : 'Action failed — please try again'}
          </div>
        )}
      </div>
    </QueueShell>
  );
}
