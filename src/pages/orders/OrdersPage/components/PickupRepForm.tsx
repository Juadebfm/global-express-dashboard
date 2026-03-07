import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import type { OrderView } from '../types';

interface PickupRepFormProps {
  view: OrderView;
  isPending: boolean;
  onSubmit: (orderId: string, name: string, phone: string) => Promise<void>;
}

export function PickupRepForm({ view, isPending, onSubmit }: PickupRepFormProps): ReactElement {
  const { t } = useTranslation('orders');

  const [name, setName] = useState(view.pickupRepName || '');
  const [phone, setPhone] = useState(view.pickupRepPhone || '');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setNotice(null);
    setError(null);
    if (!name.trim()) {
      setError(t('pickup.errors.nameRequired'));
      return;
    }
    try {
      await onSubmit(view.id, name.trim(), phone.trim());
      setNotice(t('pickup.success'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pickup.errors.failed'));
    }
  };

  return (
    <form className="rounded-2xl border border-gray-200 bg-white p-5" onSubmit={(e) => void handleSubmit(e)}>
      <h3 className="text-base font-semibold text-gray-900">{t('pickup.title')}</h3>
      <p className="mt-1 text-sm text-gray-500">{t('pickup.subtitle')}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('pickup.name')}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('pickup.phone')}
          </span>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" isLoading={isPending}>
            {t('pickup.submit')}
          </Button>
        </div>
      </div>

      {notice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </form>
  );
}
