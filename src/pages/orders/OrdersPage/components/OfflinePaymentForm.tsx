import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui';
import type { RecordOfflinePayload } from '@/types';
import type { OrderView } from '../types';
import { parsePositive } from '../types';

interface OfflinePaymentFormProps {
  view: OrderView;
  isPending: boolean;
  onSubmit: (orderId: string, payload: RecordOfflinePayload) => Promise<void>;
  onCancel?: () => void;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}): ReactElement {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500';

export function OfflinePaymentForm({
  view,
  isPending,
  onSubmit,
  onCancel,
}: OfflinePaymentFormProps): ReactElement {
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'transfer' | 'cash'>('transfer');
  const [dateReceived, setDateReceived] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setNotice(null);
    setError(null);

    const parsedAmount = parsePositive(amount);
    if (!parsedAmount) {
      setError('Enter the payment amount.');
      return;
    }

    const noteParts: string[] = [];
    if (dateReceived) noteParts.push(`Received: ${dateReceived}`);
    if (note.trim()) noteParts.push(note.trim());
    const combinedNote = noteParts.join(' — ') || undefined;

    try {
      await onSubmit(view.id, {
        userId: view.senderId,
        amount: parsedAmount,
        paymentType,
        proofReference: reference.trim() || undefined,
        note: combinedNote,
      });
      setNotice('Payment recorded.');
      setAmount('');
      setReference('');
      setNote('');
      setDateReceived('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment. Try again.');
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => void handleSubmit(e)}
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900">Record payment</h3>
        <p className="mt-1 text-sm text-gray-500">
          For {view.trackingNumber}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Amount (USD)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </Field>

          <Field label="Payment method">
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as 'transfer' | 'cash')}
              className={inputCls}
            >
              <option value="transfer">Bank transfer</option>
              <option value="cash">Cash</option>
            </select>
          </Field>

          <Field label="Date received">
            <input
              type="date"
              value={dateReceived}
              onChange={(e) => setDateReceived(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Reference / Teller no.">
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional"
              className={inputCls}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Note">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Optional"
                className={`${inputCls} resize-none`}
              />
            </Field>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Recording this payment marks the order as paid in full.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" isLoading={isPending}>
          Record payment
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" disabled={isPending} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
