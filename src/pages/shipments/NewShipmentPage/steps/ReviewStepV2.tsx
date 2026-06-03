import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, Send, Ship } from 'lucide-react';
import { cn } from '@/utils';
import i18n from '@/i18n/i18n';
import type { PublicShippingEstimate } from '@/types';
import type { ShipmentFormState } from '../types';
import { ORIGIN_WAREHOUSE, DESTINATION_OFFICE } from '../types';

interface ReviewStepV2Props {
  formState: ShipmentFormState;
  estimate: PublicShippingEstimate | null;
  estimateLoading: boolean;
}

const DATE_FMT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

/**
 * Step 3 — "Here's your shipment". Read-only summary card showing the
 * estimated cost (when available) and a detail grid of every field the user
 * filled in. The Create-shipment button lives in the sticky footer, not
 * here.
 */
export function ReviewStepV2({
  formState,
  estimate,
  estimateLoading,
}: ReviewStepV2Props): ReactElement {
  const { t } = useTranslation('shipments');

  const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
  const formattedCost = estimate
    ? `$${estimate.estimatedCostUsd.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : null;

  const typeIsAir = formState.shipmentType === 'air';
  const TypeIcon = typeIsAir ? Send : Ship;
  const transitLabel = typeIsAir
    ? t('newShipment.review.airTransit')
    : t('newShipment.review.oceanTransit');
  const weightLine = typeIsAir
    ? `${formState.packageWeightKg || '0'} kg · $${formState.packageDeclaredValue || '0'} ${t('newShipment.review.declared')}`
    : `${formState.packageCbm || '0'} cbm · $${formState.packageDeclaredValue || '0'} ${t('newShipment.review.declared')}`;
  const pickupDateLabel = formState.pickupDate
    ? formState.pickupDate.toLocaleDateString(locale, DATE_FMT)
    : '—';

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
          {t('newShipment.review.preheading')}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
          {t('newShipment.review.heading')}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {t('newShipment.review.subheading')}
        </p>
      </header>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
        {/* Cost banner */}
        <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-brand-50 to-orange-50 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              {t('newShipment.review.estimatedCost')}
            </p>
            <p className={cn('mt-1 text-4xl font-extrabold text-gray-900', !formattedCost && 'text-gray-400')}>
              {estimateLoading ? '—' : formattedCost ?? t('newShipment.review.costPending')}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {typeIsAir
                ? t('newShipment.review.airSummaryLine')
                : t('newShipment.review.oceanSummaryLine')}
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-500 shadow-sm">
            <TypeIcon className="h-6 w-6" />
          </div>
        </div>

        {/* Detail rows */}
        <dl className="divide-y divide-gray-100">
          <DetailRow label={t('newShipment.review.contents')} value={formState.packageDescription || '—'} />
          <DetailRow label={t('newShipment.review.weightValue')} value={weightLine} />
          <DetailRow label={t('newShipment.review.pickup')} value={pickupDateLabel} />
          <DetailRow label={t('newShipment.review.from')} value={`${ORIGIN_WAREHOUSE.company}, ${ORIGIN_WAREHOUSE.address.split(',').slice(-2).join(', ').trim()}`} />
          <DetailRow label={t('newShipment.review.to')} value={`${DESTINATION_OFFICE.company}, ${DESTINATION_OFFICE.address.split(',').slice(-2).join(', ').trim()}`} />
          <DetailRow
            label={t('newShipment.review.recipient')}
            value={`${formState.recipientName || '—'} · ${formState.recipientPhone || '—'}`}
          />
        </dl>

        {/* Footer note */}
        <div className="flex items-start gap-2 border-t border-gray-100 bg-gray-50 px-6 py-3 text-xs text-gray-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {t('newShipment.review.warehouseNote', { transitLabel })}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-4 px-6 py-4">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-gray-900">{value}</dd>
    </div>
  );
}
