import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { CreditCard, Landmark, CalendarDays, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils';
import type { RecordOfflinePayload } from '@/types';
import type { OrderView } from '../types';
import { parsePositive } from '../types';

interface OfflinePaymentFormProps {
  view: OrderView;
  isPending: boolean;
  onSubmit: (orderId: string, payload: RecordOfflinePayload) => Promise<{ warning: string | null }>;
  onCancel?: () => void;
}

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 transition';

function IconInput({
  icon,
  suffix,
  children,
}: {
  icon: ReactElement;
  suffix?: string;
  children: ReactElement;
}): ReactElement {
  return (
    <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-brand-500 transition">
      <span className="shrink-0 pl-3 text-gray-400">{icon}</span>
      <div className="flex-1 min-w-0">{children}</div>
      {suffix && (
        <span className="shrink-0 border-l border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-400">
          {suffix}
        </span>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
      {children}
    </p>
  );
}

const iconInputInner =
  'w-full bg-transparent px-2.5 py-2.5 text-sm text-gray-800 outline-none';

export function OfflinePaymentForm({
  view,
  isPending,
  onSubmit,
  onCancel,
}: OfflinePaymentFormProps): ReactElement {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [amount, setAmount] = useState(
    view.amountDue != null && view.amountDue > 0 ? String(view.amountDue) : '',
  );
  const [currency, setCurrency] = useState<'USD' | 'NGN'>('NGN');
  const [paymentType, setPaymentType] = useState<'transfer' | 'cash'>('transfer');
  const [dateReceived, setDateReceived] = useState(todayIso);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amountDueLabel =
    view.amountDue != null && view.amountDue > 0
      ? formatCurrency(view.amountDue, 'USD')
      : null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setNotice(null);
    setWarning(null);
    setError(null);

    const parsedAmount = parsePositive(amount);
    if (!parsedAmount) {
      setError('Enter the payment amount.');
      return;
    }

    try {
      const result = await onSubmit(view.id, {
        userId: view.senderId,
        amount: parsedAmount,
        currency,
        paymentType,
        proofReference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      if (result.warning) {
        setWarning(result.warning);
      } else {
        setNotice('Payment recorded successfully.');
      }
      setReference('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment. Try again.');
    }
  };

  return (
    <div className="space-y-4">
      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Record offline payment</h3>
              <p className="mt-0.5 text-sm text-gray-500">
                Log a payment the customer made directly — cash, bank, or POS.
              </p>
            </div>
            {amountDueLabel && (
              <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200">
                Unpaid · {amountDueLabel} due
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* Amount received */}
            <div>
              <FieldLabel>Amount received</FieldLabel>
              <IconInput icon={<CreditCard className="h-4 w-4" />}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={iconInputInner}
                />
              </IconInput>
            </div>

            {/* Currency */}
            <div>
              <FieldLabel>Currency</FieldLabel>
              <IconInput icon={<CreditCard className="h-4 w-4" />}>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'USD' | 'NGN')}
                  className={iconInputInner}
                >
                  <option value="NGN">NGN — Naira</option>
                  <option value="USD">USD — Dollar</option>
                </select>
              </IconInput>
            </div>

            {/* Payment method */}
            <div>
              <FieldLabel>Payment method</FieldLabel>
              <IconInput icon={<Landmark className="h-4 w-4" />}>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as 'transfer' | 'cash')}
                  className={iconInputInner}
                >
                  <option value="transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="pos">POS</option>
                </select>
              </IconInput>
            </div>

            {/* Date received */}
            <div>
              <FieldLabel>Date received</FieldLabel>
              <IconInput icon={<CalendarDays className="h-4 w-4" />}>
                <input
                  type="date"
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                  className={iconInputInner}
                />
              </IconInput>
            </div>

            {/* Reference */}
            <div>
              <FieldLabel>Reference / Teller no.</FieldLabel>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. GTB-8841020"
                className={inputCls}
              />
            </div>

            {/* Note — full width */}
            <div className="sm:col-span-2">
              <FieldLabel>Note (optional)</FieldLabel>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="e.g. Paid at Lagos office front desk"
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 px-5 pb-5">
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            leftIcon={!isPending ? <CheckCircle2 className="h-4 w-4" /> : undefined}
          >
            Record payment
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>

        {warning && (
          <div className="mx-5 mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">{warning}</p>
          </div>
        )}
        {notice && (
          <p className="mx-5 mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {notice}
          </p>
        )}
        {error && (
          <p className="mx-5 mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </form>

    </div>
  );
}
