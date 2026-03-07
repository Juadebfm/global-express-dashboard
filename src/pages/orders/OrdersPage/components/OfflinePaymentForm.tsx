import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import type { RecordOfflinePayload } from '@/types';
import type { OrderView } from '../types';
import { parsePositive } from '../types';

interface OfflinePaymentFormProps {
  view: OrderView;
  isPending: boolean;
  onSubmit: (orderId: string, payload: RecordOfflinePayload) => Promise<void>;
}

function FormField({ label, children }: { label: string; children: ReactElement }): ReactElement {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

export function OfflinePaymentForm({ view, isPending, onSubmit }: OfflinePaymentFormProps): ReactElement {
  const { t } = useTranslation('orders');

  const [userId, setUserId] = useState(view.senderId || '');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<RecordOfflinePayload['paymentType']>('transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setNotice(null);
    setError(null);

    if (!userId.trim()) {
      setError(t('payment.errors.userRequired'));
      return;
    }
    const parsedAmount = parsePositive(amount);
    if (!parsedAmount) {
      setError(t('payment.errors.amountRequired'));
      return;
    }
    try {
      await onSubmit(view.id, {
        userId: userId.trim(),
        amount: parsedAmount,
        paymentType,
        proofReference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      setNotice(t('payment.success'));
      setAmount('');
      setReference('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('payment.errors.failed'));
    }
  };

  return (
    <form className="rounded-2xl border border-gray-200 bg-white p-5" onSubmit={(e) => void handleSubmit(e)}>
      <h3 className="text-base font-semibold text-gray-900">{t('payment.title')}</h3>
      <p className="mt-1 text-sm text-gray-500">{t('payment.subtitle')}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FormField label={t('payment.userId')}>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </FormField>
        <FormField label={t('payment.amount')}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </FormField>
        <FormField label={t('payment.type')}>
          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as RecordOfflinePayload['paymentType'])}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            <option value="transfer">{t('payment.transfer')}</option>
            <option value="cash">{t('payment.cash')}</option>
          </select>
        </FormField>
        <FormField label={t('payment.proofReference')}>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label={t('payment.note')}>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" isLoading={isPending}>
            {t('payment.submit')}
          </Button>
        </div>
      </div>

      {notice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </form>
  );
}
