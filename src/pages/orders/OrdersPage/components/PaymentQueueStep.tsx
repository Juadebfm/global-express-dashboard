import type { ReactElement } from 'react';
import { useState } from 'react';
import { Banknote, Building2, CheckCircle2 } from 'lucide-react';
import { useRecordOfflinePayment } from '@/hooks';
import { cn } from '@/utils';
import type { OrderView } from '../types';
import { QueueShell } from './QueueShell';
import { OrderSummaryCard } from './OrderSummaryCard';

type PaymentMethod = 'transfer' | 'cash';

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; Icon: typeof Building2 }> = [
  { value: 'transfer', label: 'Bank transfer', Icon: Building2 },
  { value: 'cash', label: 'Cash', Icon: Banknote },
];

interface PaymentQueueStepProps {
  view: OrderView;
  currentIndex: number;
  totalCount: number;
  onNext: () => void;
  onSkip?: () => void;
  onExit: () => void;
}

export function PaymentQueueStep({
  view,
  currentIndex,
  totalCount,
  onNext,
  onSkip,
  onExit,
}: PaymentQueueStepProps): ReactElement {
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [warning, setWarning] = useState<string | null>(null);

  const recordPayment = useRecordOfflinePayment();

  const amountDue = view.amountDue ?? view.finalChargeUsd ?? 0;
  const parsedAmount = parseFloat(amount);
  const canSubmit = amount.trim() !== '' && !isNaN(parsedAmount) && parsedAmount > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const result = await recordPayment.mutateAsync({
      orderId: view.id,
      payload: {
        userId: view.senderId,
        amount: parsedAmount,
        currency: 'USD',
        paymentType: method,
        proofReference: reference.trim() || undefined,
        note: note.trim() || undefined,
      },
    });
    if (result.warning) setWarning(result.warning);
    else onNext();
  };

  const hint = !canSubmit
    ? 'Enter the amount received to record payment'
    : undefined;

  return (
    <QueueShell
      queueType="payment"
      currentIndex={currentIndex}
      totalCount={totalCount}
      onExit={onExit}
      onSkip={onSkip}
      hint={hint}
      primaryLabel="Record payment →"
      primaryDisabled={!canSubmit}
      isPending={recordPayment.isPending}
      onPrimary={() => void handleSubmit()}
    >
      <div className="space-y-4">
        <OrderSummaryCard view={view} />

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {/* Amount due */}
          {amountDue > 0 && (
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Amount due</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                ${Number(amountDue).toFixed(2)}
              </p>
              {view.totalPaidUsd != null && view.totalPaidUsd > 0 && (
                <p className="mt-0.5 text-sm text-gray-500">
                  ${Number(view.totalPaidUsd).toFixed(2)} already collected
                </p>
              )}
            </div>
          )}

          <div className="space-y-5 px-5 py-5">
            {/* Payment method */}
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-700">Payment method</p>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMethod(value)}
                    className={cn(
                      'flex flex-1 items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition',
                      method === value
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                    {method === value && <CheckCircle2 className="ml-auto h-4 w-4 text-brand-500" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Amount received (USD)
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus-within:border-brand-400 focus-within:bg-white">
                <span className="text-sm font-medium text-gray-400">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={amountDue > 0 ? amountDue.toFixed(2) : '0.00'}
                  min="0"
                  step="0.01"
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Reference */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Reference <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction ID, bank ref, etc."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-400 focus:bg-white"
              />
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
                placeholder="Any additional details…"
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-400 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {warning && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <p className="font-semibold">Payment recorded with warning</p>
            <p className="mt-0.5">{warning}</p>
            <button
              type="button"
              onClick={onNext}
              className="mt-2 text-xs font-semibold text-amber-800 underline"
            >
              Continue to next order →
            </button>
          </div>
        )}

        {recordPayment.isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {recordPayment.error instanceof Error
              ? recordPayment.error.message
              : 'Failed to record payment — please try again'}
          </div>
        )}
      </div>
    </QueueShell>
  );
}
