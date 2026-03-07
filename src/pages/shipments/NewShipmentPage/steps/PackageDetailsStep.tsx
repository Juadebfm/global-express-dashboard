import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui';
import { cn } from '@/utils';
import type { ShipmentFormState, ShipmentFormActions } from '../types';

interface PackageDetailsStepProps {
  formState: ShipmentFormState;
  formActions: ShipmentFormActions;
  fieldErrors: Record<string, string>;
}

function FieldError({ error }: { error?: string }): ReactElement | null {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-500">{error}</p>;
}

const inputClass = (hasError: boolean) =>
  cn(
    'mt-2 w-full rounded-xl border px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none',
    hasError ? 'border-red-400' : 'border-gray-200',
  );

export function PackageDetailsStep({
  formState,
  formActions,
  fieldErrors,
}: PackageDetailsStepProps): ReactElement {
  const { t } = useTranslation('shipments');

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('newShipment.packageDetails.title')}
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              {t('newShipment.packageDetails.subtitle')}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="mt-6">
          <span className="text-xs font-semibold uppercase text-gray-500">
            {t('newShipment.packageDetails.descriptionLabel')}
          </span>
          <input
            type="text"
            value={formState.packageDescription}
            onChange={(e) => formActions.setPackageDescription(e.target.value)}
            placeholder={t('newShipment.packageDetails.descriptionPlaceholder')}
            className={inputClass(!!fieldErrors.packageDescription)}
          />
          <FieldError error={fieldErrors.packageDescription} />
        </div>

        {/* Weight/Volume + Declared Value */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {formState.shipmentType === 'air' ? (
            <div>
              <span className="text-xs font-semibold uppercase text-gray-500">
                {t('newShipment.packageDetails.weightLabel')}
              </span>
              <input
                type="number"
                value={formState.packageWeightKg}
                onChange={(e) => formActions.setPackageWeightKg(e.target.value)}
                placeholder={t('newShipment.packageDetails.weightPlaceholder')}
                className={inputClass(!!fieldErrors.packageWeightKg)}
              />
              <FieldError error={fieldErrors.packageWeightKg} />
            </div>
          ) : (
            <div>
              <span className="text-xs font-semibold uppercase text-gray-500">
                {t('newShipment.packageDetails.volumeLabel')}
              </span>
              <input
                type="number"
                value={formState.packageCbm}
                onChange={(e) => formActions.setPackageCbm(e.target.value)}
                placeholder={t('newShipment.packageDetails.volumePlaceholder')}
                className={inputClass(!!fieldErrors.packageCbm)}
              />
              <FieldError error={fieldErrors.packageCbm} />
            </div>
          )}
          <div>
            <span className="text-xs font-semibold uppercase text-gray-500">
              {t('newShipment.packageDetails.declaredValueLabel')}
            </span>
            <input
              type="number"
              value={formState.packageDeclaredValue}
              onChange={(e) => formActions.setPackageDeclaredValue(e.target.value)}
              placeholder={t('newShipment.packageDetails.declaredValuePlaceholder')}
              className={inputClass(!!fieldErrors.packageDeclaredValue)}
            />
            <FieldError error={fieldErrors.packageDeclaredValue} />
          </div>
        </div>

        {/* Recipient Information */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <p className="text-sm font-semibold text-gray-700">
            {t('newShipment.recipientInfo.sectionTitle')}
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div>
              <span className="text-xs font-semibold uppercase text-gray-500">
                {t('newShipment.recipientInfo.nameLabel')}
              </span>
              <input
                type="text"
                value={formState.recipientName}
                onChange={(e) => formActions.setRecipientName(e.target.value)}
                placeholder={t('newShipment.recipientInfo.namePlaceholder')}
                className={inputClass(!!fieldErrors.recipientName)}
              />
              <FieldError error={fieldErrors.recipientName} />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase text-gray-500">
                {t('newShipment.recipientInfo.emailLabel')}
              </span>
              <input
                type="email"
                value={formState.recipientEmail}
                onChange={(e) => formActions.setRecipientEmail(e.target.value)}
                placeholder={t('newShipment.recipientInfo.emailPlaceholder')}
                className={inputClass(!!fieldErrors.recipientEmail)}
              />
              <FieldError error={fieldErrors.recipientEmail} />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase text-gray-500">
                {t('newShipment.recipientInfo.phoneLabel')}
              </span>
              <input
                type="tel"
                value={formState.recipientPhone}
                onChange={(e) => formActions.setRecipientPhone(e.target.value)}
                placeholder={t('newShipment.recipientInfo.phonePlaceholder')}
                className={inputClass(!!fieldErrors.recipientPhone)}
              />
              <FieldError error={fieldErrors.recipientPhone} />
            </div>
          </div>

          <div className="mt-5">
            <Checkbox
              label={t('newShipment.recipientInfo.usePickupRepLabel')}
              checked={formState.usePickupRep}
              onChange={(e) => formActions.setUsePickupRep(e.target.checked)}
            />
          </div>

          {formState.usePickupRep && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500">
                  {t('newShipment.recipientInfo.repNameLabel')}
                </span>
                <input
                  type="text"
                  value={formState.pickupRepName}
                  onChange={(e) => formActions.setPickupRepName(e.target.value)}
                  placeholder={t('newShipment.recipientInfo.repNamePlaceholder')}
                  className={inputClass(!!fieldErrors.pickupRepName)}
                />
                <FieldError error={fieldErrors.pickupRepName} />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500">
                  {t('newShipment.recipientInfo.repPhoneLabel')}
                </span>
                <input
                  type="tel"
                  value={formState.pickupRepPhone}
                  onChange={(e) => formActions.setPickupRepPhone(e.target.value)}
                  placeholder={t('newShipment.recipientInfo.repPhonePlaceholder')}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="rounded-2xl bg-brand-100 px-6 py-5">
        <div className="grid gap-4 text-center text-sm font-semibold text-gray-700 sm:grid-cols-2">
          <div>
            <p className="text-2xl font-semibold">
              {formState.shipmentType === 'air'
                ? formState.packageWeightKg.trim() ? `${formState.packageWeightKg.trim()} kg` : '0.0 kg'
                : formState.packageCbm.trim() ? `${formState.packageCbm.trim()} CBM` : '0.0 CBM'}
            </p>
            <p className="text-xs uppercase text-gray-500">
              {formState.shipmentType === 'air'
                ? t('newShipment.review.totalWeightLabel')
                : t('newShipment.review.totalVolumeLabel')}
            </p>
          </div>
          <div>
            <p className="text-2xl font-semibold">
              ${formState.packageDeclaredValue.trim() || '0.00'}
            </p>
            <p className="text-xs uppercase text-gray-500">
              {t('newShipment.review.declaredValueLabel')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
