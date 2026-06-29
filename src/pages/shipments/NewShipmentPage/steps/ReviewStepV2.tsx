import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, Send, Ship, Truck } from 'lucide-react';
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

export function ReviewStepV2({
  formState,
  estimate,
  estimateLoading,
}: ReviewStepV2Props): ReactElement {
  const { t } = useTranslation('shipments');

  const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
  const isD2d = formState.shipmentType === 'd2d';
  const typeIsAir = formState.shipmentType === 'air';

  const TypeIcon = typeIsAir ? Send : isD2d ? Truck : Ship;

  const formattedCost = estimate
    ? `$${estimate.estimatedCostUsd.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : null;

  // Weight / value line — D2D has no unit-based pricing; show weight only if entered
  const weightLine = (() => {
    const declared = `$${formState.packageDeclaredValue || '0'} ${t('newShipment.review.declared')}`;
    if (isD2d) {
      const w = formState.packageWeightKg.trim();
      return w && parseFloat(w) > 0 ? `${w} kg · ${declared}` : declared;
    }
    return typeIsAir
      ? `${formState.packageWeightKg || '0'} kg · ${declared}`
      : `${formState.packageCbm || '0'} cbm · ${declared}`;
  })();

  // "To" field — D2D uses recipient delivery address (or Lagos office as fallback)
  const toValue = isD2d
    ? (formState.recipientAddress?.trim() || `${DESTINATION_OFFICE.company} (pickup point)`)
    : `${DESTINATION_OFFICE.company}, ${DESTINATION_OFFICE.address.split(',').slice(-2).join(', ').trim()}`;

  const transitLabel = typeIsAir
    ? t('newShipment.review.airTransit')
    : t('newShipment.review.oceanTransit');

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
            {isD2d ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Pricing
                </p>
                <p className="mt-1 text-4xl font-extrabold text-gray-400">Custom</p>
                <p className="mt-1 text-sm text-gray-500">
                  Door-to-door · confirmed after warehouse review
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-500 shadow-sm">
            <TypeIcon className="h-6 w-6" />
          </div>
        </div>

        {/* Detail rows */}
        <dl className="divide-y divide-gray-100">
          <DetailRow label={t('newShipment.review.contents')} value={formState.packageDescription || '—'} />
          <DetailRow label={t('newShipment.review.weightValue')} value={weightLine} />
          <DetailRow
            label={t('newShipment.review.from')}
            value={`${ORIGIN_WAREHOUSE.company}, ${ORIGIN_WAREHOUSE.address.split(',').slice(-2).join(', ').trim()}`}
          />
          <DetailRow label={t('newShipment.review.to')} value={toValue} />
          <DetailRow
            label={t('newShipment.review.recipient')}
            value={`${formState.recipientName || '—'} · ${formState.recipientPhone || '—'}`}
          />
        </dl>

        {/* Footer note */}
        <div className="flex items-start gap-2 border-t border-gray-100 bg-gray-50 px-6 py-3 text-xs text-gray-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {isD2d
              ? 'Our team will confirm pricing and delivery timeline after receiving your goods at the warehouse.'
              : t('newShipment.review.warehouseNote', { transitLabel })}
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
