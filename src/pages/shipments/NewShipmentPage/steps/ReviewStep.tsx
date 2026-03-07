import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Package } from 'lucide-react';
import type { ShippingEstimate } from '@/services';
import i18n from '@/i18n/i18n';
import { ORIGIN_WAREHOUSE, DESTINATION_OFFICE } from '../types';
import type { ShipmentFormState } from '../types';

interface ReviewStepProps {
  formState: ShipmentFormState;
  estimate: ShippingEstimate | null;
  estimateLoading: boolean;
  fetchEstimate: () => Promise<void>;
}

export function ReviewStep({
  formState,
  estimate,
  estimateLoading,
  fetchEstimate,
}: ReviewStepProps): ReactElement {
  const { t } = useTranslation('shipments');

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">
        {t('newShipment.review.title')}
      </h2>
      <p className="mt-1 text-sm text-gray-400">
        {t('newShipment.review.subtitle')}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          {/* Shipment Summary */}
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {t('newShipment.review.shipmentSummary')}
            </p>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>{t('newShipment.review.typeLabel')}</span>
                <span className="font-semibold text-gray-800 capitalize">
                  {formState.shipmentType === 'air'
                    ? t('newShipment.review.airFreight')
                    : t('newShipment.review.oceanFreight')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>
                  {formState.shipmentType === 'air'
                    ? t('newShipment.review.totalWeightLabel')
                    : t('newShipment.review.totalVolumeLabel')}
                </span>
                <span className="font-semibold text-gray-800">
                  {formState.shipmentType === 'air'
                    ? formState.packageWeightKg.trim() ? `${formState.packageWeightKg.trim()} kg` : '0.0 kg'
                    : formState.packageCbm.trim() ? `${formState.packageCbm.trim()} CBM` : '0.0 CBM'}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                <span>{t('newShipment.review.declaredValueLabel')}</span>
                <span className="font-semibold text-gray-800">
                  ${formState.packageDeclaredValue.trim() || '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Route */}
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {t('newShipment.review.route')}
            </p>
            <div className="mt-3 text-sm text-gray-600">
              <p className="font-semibold text-gray-800">{t('newShipment.review.from')}</p>
              <p className="text-xs text-gray-400">{ORIGIN_WAREHOUSE.company}</p>
              <p>{ORIGIN_WAREHOUSE.address}</p>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p className="font-semibold text-gray-800">{t('newShipment.review.to')}</p>
              <p className="text-xs text-gray-400">{DESTINATION_OFFICE.company}</p>
              <p>{DESTINATION_OFFICE.address}</p>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {t('newShipment.review.recipient')}
            </p>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <p>{formState.recipientName || '—'}</p>
              <p>{formState.recipientEmail || '—'}</p>
              <p>{formState.recipientPhone || '—'}</p>
            </div>
          </div>

          {/* Pickup Rep */}
          {formState.usePickupRep && formState.pickupRepName.trim() && (
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {t('newShipment.review.pickupRepresentative')}
              </p>
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p>{formState.pickupRepName}</p>
                <p>{formState.pickupRepPhone || '—'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Cost Estimate */}
        <div className="rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Package className="h-4 w-4 text-brand-500" />
            {t('newShipment.review.costEstimate')}
          </div>

          {estimateLoading ? (
            <div className="mt-6 flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('newShipment.review.calculatingEstimate')}
            </div>
          ) : estimate ? (
            <>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>{t('newShipment.review.estimatedShippingCost')}</span>
                  <span className="font-semibold text-gray-800">
                    ${estimate.estimatedCostUsd.toLocaleString(
                      i18n.language === 'ko' ? 'ko-KR' : 'en-US',
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Departure Schedule</span>
                  <span className="font-semibold text-gray-800">
                    Departures: {estimate.departureFrequency}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                  <span>Est. Transit Time</span>
                  <span className="font-semibold text-gray-800">
                    ~{estimate.estimatedTransitDays} days
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void fetchEstimate()}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500 px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50"
              >
                <Check className="h-4 w-4" />
                {t('newShipment.review.recalculate')}
              </button>

              <p className="mt-4 text-xs text-gray-400">{estimate.disclaimer}</p>
            </>
          ) : (
            <p className="mt-6 py-6 text-center text-sm text-gray-400">
              {formState.shipmentType === 'air'
                ? t('newShipment.review.enterWeightForEstimate')
                : t('newShipment.review.enterVolumeForEstimate')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
