import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils';
import { formatDate, formatCurrency } from '@/utils';
import { getStatusStyle } from '@/lib/statusUtils';
import type { OrderView } from '../types';
import { statusLabel, getCurrentPhaseIndex, PIPELINE_PHASES } from '../types';

interface OrderDetailHeaderProps {
  view: OrderView;
}

function Info({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-800">{value}</p>
    </div>
  );
}

export function OrderDetailHeader({ view }: OrderDetailHeaderProps): ReactElement {
  const { t } = useTranslation(['orders', 'shipments']);
  const style = getStatusStyle(view.statusV2);
  const phaseIndex = getCurrentPhaseIndex(view.statusV2);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      {/* Title row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{view.trackingNumber}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {view.origin} &rarr; {view.destination}
          </p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', style.bgClass, style.textClass)}>
          {t(`shipments:statusV2.${view.statusV2}`, {
            defaultValue: view.statusLabel || statusLabel(view.statusV2),
          })}
        </span>
      </div>

      {/* Pipeline stepper */}
      <div className="mt-5 flex items-center gap-1">
        {PIPELINE_PHASES.map((phase, i) => {
          const isCompleted = phaseIndex > i;
          const isCurrent = phaseIndex === i;
          return (
            <div key={phase.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center">
                <div
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    isCompleted || isCurrent ? 'bg-brand-500' : 'bg-gray-200',
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isCurrent ? 'text-brand-600' : isCompleted ? 'text-gray-600' : 'text-gray-400',
                )}
              >
                {t(`orders:phases.${phase.key}`)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Info grid */}
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        <Info label={t('orders:detail.recipient')} value={view.recipientName || '-'} />
        <Info label={t('orders:detail.recipientPhone')} value={view.recipientPhone || '-'} />
        <Info label={t('orders:detail.recipientAddress')} value={view.recipientAddress || '-'} />
        <Info label={t('orders:detail.senderId')} value={view.senderId || '-'} />
        <Info label={t('orders:detail.transportMode')} value={view.transportMode || view.shipmentType || '-'} />
        <Info label={t('orders:detail.paymentStatus')} value={view.paymentCollectionStatus || '-'} />
        <Info label={t('orders:detail.amountDue')} value={view.amountDue !== null ? formatCurrency(view.amountDue, 'USD') : '-'} />
        <Info label={t('orders:detail.finalCharge')} value={view.finalChargeUsd !== null ? formatCurrency(view.finalChargeUsd, 'USD') : '-'} />
        <Info label={t('orders:detail.pricingSource')} value={view.pricingSource || '-'} />
        <Info
          label={t('orders:detail.created')}
          value={view.createdAt ? formatDate(view.createdAt, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
        />
      </div>
    </div>
  );
}
