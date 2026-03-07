import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import type { OrderView } from '../types';
import { nextStatus, statusLabel, EXCEPTION_STATUSES } from '../types';

interface StatusProgressionProps {
  view: OrderView;
  isPending: boolean;
  statusNotice: string | null;
  statusError: string | null;
  onAdvance: (statusV2: string) => void;
}

export function StatusProgression({
  view,
  isPending,
  statusNotice,
  statusError,
  onAdvance,
}: StatusProgressionProps): ReactElement {
  const { t } = useTranslation(['orders', 'shipments']);
  const next = nextStatus(view.statusV2, view.transportMode || view.shipmentType);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="text-base font-semibold text-gray-900">{t('orders:status.title')}</h3>
      <p className="mt-1 text-sm text-gray-500">{t('orders:status.subtitle')}</p>

      {view.statusV2 === 'WAREHOUSE_RECEIVED' && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t('orders:status.verifyFirst')}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {next ? (
          <Button size="sm" variant="primary" isLoading={isPending} onClick={() => onAdvance(next)}>
            {t('orders:status.moveTo', {
              status: t(`shipments:statusV2.${next}`, { defaultValue: statusLabel(next) }),
            })}
          </Button>
        ) : (
          <span className="text-sm text-gray-500">{t('orders:status.noNext')}</span>
        )}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {t('orders:status.exceptions')}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {EXCEPTION_STATUSES.map((status) => (
          <Button
            key={status}
            size="sm"
            variant="secondary"
            isLoading={isPending}
            onClick={() => onAdvance(status)}
          >
            {t(`shipments:statusV2.${status}`, { defaultValue: statusLabel(status) })}
          </Button>
        ))}
      </div>

      {statusNotice && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{statusNotice}</p>
      )}
      {statusError && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{statusError}</p>
      )}
    </div>
  );
}
