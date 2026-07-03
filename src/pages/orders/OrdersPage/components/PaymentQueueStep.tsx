import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  Banknote,
  Bell,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  Phone,
} from 'lucide-react';
import {
  useOrderPayments,
  useVerifyOrderPayment,
  usePingSupervisor,
  useRecordOfflinePayment,
  useCan,
} from '@/hooks';
import { cn } from '@/utils';
import { formatCurrency } from '@/utils';
import type { ApiPayment } from '@/types';
import type { OrderView } from '../types';
import { QueueShell } from './QueueShell';
import { OrderSummaryCard } from './OrderSummaryCard';
import { ReceiptApprovalPanel } from './ReceiptApprovalPanel';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface PaymentQueueStepProps {
  view: OrderView;
  currentIndex: number;
  totalCount: number;
  onNext: () => void;
  onSkip?: () => void;
  onExit: () => void;
}

// ── Receipt card for staff (read-only, ping action) ───────────────────────────

interface StaffReceiptCardProps {
  payment: ApiPayment;
  orderId: string;
}

function StaffReceiptCard({ payment, orderId }: StaffReceiptCardProps): ReactElement {
  const ping = usePingSupervisor();
  const [pinged, setPinged] = useState(false);
  const [supervisor, setSupervisor] = useState<{ name: string; phone: string | null } | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);

  const handlePing = async () => {
    setPingError(null);
    try {
      const result = await ping.mutateAsync(orderId);
      setSupervisor(result);
      setPinged(true);
    } catch (err) {
      setPingError(err instanceof Error ? err.message : 'Could not send notification — try again or call directly.');
    }
  };

  const isImage = !!payment.proofReference && /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(payment.proofReference);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Receipt header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
        <FileText className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-900">Receipt submitted</span>
        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          Awaiting supervisor
        </span>
      </div>

      {/* Receipt image */}
      {payment.proofReference && isImage && (
        <div className="border-b border-gray-100">
          <img
            src={payment.proofReference}
            alt="Payment receipt"
            className="max-h-52 w-full object-contain bg-gray-50"
          />
        </div>
      )}

      {/* Payment meta */}
      <div className="grid grid-cols-2 gap-3 px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Amount claimed</p>
          <p className="mt-0.5 text-base font-bold text-gray-900">
            {payment.amount} {payment.currency}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Method</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900">
            {payment.paymentType === 'transfer' ? 'Bank transfer' : 'Cash'}
          </p>
        </div>
        {payment.metadata?.remitterName && (
          <div className="col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Remitter</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">{payment.metadata.remitterName}</p>
          </div>
        )}
        {payment.metadata?.paymentDate && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Transfer date</p>
            <p className="mt-0.5 text-sm text-gray-700">{payment.metadata.paymentDate}</p>
          </div>
        )}
        {payment.metadata?.transactionRef && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Bank ref</p>
            <p className="mt-0.5 font-mono text-sm text-gray-700">{payment.metadata.transactionRef}</p>
          </div>
        )}
      </div>

      {/* Ping section */}
      <div className="border-t border-gray-100 px-5 py-4">
        {!pinged ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={ping.isPending}
                onClick={() => void handlePing()}
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {ping.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                Ping supervisor
              </button>
              <p className="text-xs text-gray-400">Notify supervisor to confirm payment</p>
            </div>
            {pingError && (
              <p className="text-xs text-red-600">{pingError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold">Supervisor notified</span>
            </div>
            {supervisor && (
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500">Supervisor</p>
                  <p className="text-sm font-semibold text-gray-900">{supervisor.name}</p>
                </div>
                {supervisor.phone && (
                  <a
                    href={`tel:${supervisor.phone}`}
                    className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call directly
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Cash manual entry (walk-in only) ─────────────────────────────────────────

interface CashFormProps {
  view: OrderView;
  onSuccess: () => void;
}

function CashForm({ view, onSuccess }: CashFormProps): ReactElement {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [note, setNote] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const recordPayment = useRecordOfflinePayment();

  const amountDue = view.amountDue ?? view.finalChargeUsd ?? 0;
  const parsed = parseFloat(amount);
  const canSubmit = amount.trim() !== '' && !isNaN(parsed) && parsed > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const result = await recordPayment.mutateAsync({
      orderId: view.id,
      payload: {
        userId: view.senderId,
        amount: parsed,
        currency,
        paymentType: 'cash',
        note: note.trim() || undefined,
      },
    });
    setConfirmOpen(false);
    if (result.warning) setWarning(result.warning);
    else onSuccess();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
        <Banknote className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-900">Record cash payment</span>
      </div>
      <div className="space-y-4 px-5 py-5">
        {amountDue > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Amount due</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">
              {formatCurrency(amountDue, 'USD')}
            </p>
          </div>
        )}

        {/* Currency */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">Currency received</p>
          <div className="flex gap-2">
            {(['NGN', 'USD'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={cn(
                  'flex flex-1 items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                  currency === c
                    ? 'border-brand-400 bg-brand-50 text-brand-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                )}
              >
                {c === 'NGN' ? '₦ NGN' : '$ USD'}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Amount received</label>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus-within:border-brand-400 focus-within:bg-white">
            <span className="text-sm font-medium text-gray-400">{currency === 'NGN' ? '₦' : '$'}</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Note <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Receipt number, collected by, etc."
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-400 focus:bg-white"
          />
        </div>

        {warning && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <p className="font-semibold">Recorded with warning</p>
            <p className="mt-0.5">{warning}</p>
          </div>
        )}

        {recordPayment.isError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {recordPayment.error instanceof Error ? recordPayment.error.message : 'Failed to record payment — please try again'}
          </p>
        )}

        <button
          type="button"
          disabled={!canSubmit || recordPayment.isPending}
          onClick={() => setConfirmOpen(true)}
          className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          Record cash payment →
        </button>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        tone="warning"
        title={`Record ${currency === 'NGN' ? '₦' : '$'}${amount} ${currency} cash payment?`}
        message="This creates a permanent financial record. The amount and currency cannot be changed after recording."
        confirmLabel="Record payment"
        isLoading={recordPayment.isPending}
        onConfirm={() => void handleSubmit()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PaymentQueueStep({
  view,
  currentIndex,
  totalCount,
  onNext,
  onSkip,
  onExit,
}: PaymentQueueStepProps): ReactElement {
  const isSuperAdmin = useCan('app.superadmin');
  const [showCash, setShowCash] = useState(false);

  const paymentsQuery = useOrderPayments(view.id);
  const verifyPayment = useVerifyOrderPayment(view.id);

  const pendingReceipts = (paymentsQuery.data ?? []).filter((p) => p.status === 'pending');
  const approvedReceipts = (paymentsQuery.data ?? []).filter((p) => p.status === 'successful');

  const amountDue = view.amountDue ?? view.finalChargeUsd ?? 0;

  const hasPending = pendingReceipts.length > 0;

  if (paymentsQuery.isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-300" />
        <p className="mt-2 text-sm text-gray-400">Loading payments…</p>
      </div>
    );
  }

  // ── Superadmin: direct approve/reject ─────────────────────────────────────

  if (isSuperAdmin) {
    return (
      <QueueShell
        queueType="payment"
        currentIndex={currentIndex}
        totalCount={totalCount}
        onExit={onExit}
        onSkip={onSkip}
        hint={hasPending ? 'Review each receipt against your bank statement and approve or reject' : 'No pending receipts for this order'}
        primaryLabel="Next order →"
        primaryDisabled={hasPending}
        isPending={verifyPayment.isPending}
        onPrimary={onNext}
      >
        <div className="space-y-4">
          <OrderSummaryCard view={view} />

          {/* Running total */}
          {amountDue > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total due</p>
                <p className="mt-0.5 text-2xl font-bold text-gray-900">{formatCurrency(amountDue, 'USD')}</p>
                {approvedReceipts.length > 0 && (
                  <p className="mt-1 text-sm font-medium text-emerald-600">
                    {approvedReceipts.length} receipt{approvedReceipts.length !== 1 ? 's' : ''} approved
                  </p>
                )}
              </div>
            </div>
          )}

          {hasPending ? (
            pendingReceipts.map((payment) => (
              <ReceiptApprovalPanel
                key={payment.id}
                payment={payment}
                isPending={verifyPayment.isPending}
                onVerify={async (paymentId, decision, note) => {
                  const result = await verifyPayment.mutateAsync({ paymentId, payload: { decision, note } });
                  return { warning: result.warning ?? null };
                }}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="mt-2 text-sm font-medium text-gray-500">No pending receipts</p>
              <p className="mt-0.5 text-xs text-gray-400">Waiting for the customer to upload a receipt.</p>
            </div>
          )}
        </div>
      </QueueShell>
    );
  }

  // ── Staff: receipt review + ping ─────────────────────────────────────────

  return (
    <QueueShell
      queueType="payment"
      currentIndex={currentIndex}
      totalCount={totalCount}
      onExit={onExit}
      onSkip={onSkip}
      hint={hasPending ? 'Customer has submitted a receipt — ping the supervisor to confirm' : 'Waiting for customer receipt'}
      primaryLabel="Next order →"
      primaryDisabled={false}
      isPending={false}
      onPrimary={onNext}
    >
      <div className="space-y-4">
        <OrderSummaryCard view={view} />

        {/* Amount summary */}
        {amountDue > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Amount due</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">{formatCurrency(amountDue, 'USD')}</p>
            {approvedReceipts.length > 0 && (
              <p className="mt-1 text-sm text-emerald-600 font-medium">
                {approvedReceipts.length} receipt{approvedReceipts.length !== 1 ? 's' : ''} approved
              </p>
            )}
          </div>
        )}

        {hasPending ? (
          pendingReceipts.map((payment) => (
            <StaffReceiptCard key={payment.id} payment={payment} orderId={view.id} />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-6 text-center">
            <Building2 className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-500">Waiting for receipt</p>
            <p className="mt-0.5 text-xs text-gray-400">
              The customer hasn't uploaded a receipt yet. Payment details should have been sent via email and WhatsApp.
            </p>
          </div>
        )}

        {/* Cash walk-in */}
        {!showCash ? (
          <button
            type="button"
            onClick={() => setShowCash(true)}
            className="w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-xs font-semibold text-gray-500 transition hover:border-gray-400 hover:text-gray-700"
          >
            Customer paying cash? Record manually →
          </button>
        ) : (
          <CashForm view={view} onSuccess={onNext} />
        )}
      </div>
    </QueueShell>
  );
}
