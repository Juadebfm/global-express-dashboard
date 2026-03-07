import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils';
import { SHIPMENT_TYPE_KEYS } from '../types';
import type { ShipmentFormState, ShipmentFormActions } from '../types';
import { DatePicker } from '../DatePicker';
import { TimePicker } from '../TimePicker';

interface ShipmentTypeStepProps {
  formState: ShipmentFormState;
  formActions: ShipmentFormActions;
  fieldErrors: Record<string, string>;
  isCustomer: boolean;
  clients: Array<{ id: string; firstName?: string; lastName?: string; email: string }>;
}

export function ShipmentTypeStep({
  formState,
  formActions,
  fieldErrors,
  isCustomer,
  clients,
}: ShipmentTypeStepProps): ReactElement {
  const { t } = useTranslation('shipments');

  const shipmentTypes = SHIPMENT_TYPE_KEYS.map((s) => ({
    value: s.value,
    label: t(s.labelKey),
  }));

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">
        {t('newShipment.shipmentType.sectionTitle')}
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        {t('newShipment.shipmentType.sectionSubtitle')}
      </p>

      {/* Customer selector — staff only */}
      {!isCustomer && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <label className="block text-sm font-medium text-gray-700">
            {t('newShipment.customerSelect.label')}
            <span className="ml-1 text-red-500">*</span>
          </label>
          <select
            value={formState.selectedSenderId}
            onChange={(e) => formActions.setSelectedSenderId(e.target.value)}
            className={cn(
              'mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none',
              fieldErrors.selectedSenderId ? 'border-red-400' : 'border-gray-200',
            )}
          >
            <option value="">{t('newShipment.customerSelect.placeholder')}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email}
              </option>
            ))}
          </select>
          {fieldErrors.selectedSenderId && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.selectedSenderId}</p>
          )}
        </div>
      )}

      <div className="mt-6">
        <div>
          <p className="text-sm font-semibold text-gray-700">
            {t('newShipment.shipmentType.sectionTitle')}
          </p>
          <div className="mt-4 space-y-3">
            {shipmentTypes.map((item) => (
              <label
                key={item.value}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition',
                  formState.shipmentType === item.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-700 hover:border-brand-300',
                )}
              >
                <input
                  type="radio"
                  name="shipment-type"
                  value={item.value}
                  checked={formState.shipmentType === item.value}
                  onChange={() => formActions.setShipmentType(item.value)}
                  className="sr-only"
                />
                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-brand-500">
                  {formState.shipmentType === item.value && (
                    <span className="h-2 w-2 rounded-full bg-brand-500" />
                  )}
                </span>
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <DatePicker
              label={t('newShipment.schedule.pickupDate')}
              value={formState.pickupDate}
              onChange={(d) => formActions.setPickupDate(d)}
            />
            <DatePicker
              label={t('newShipment.schedule.preferredDeliveryDate')}
              value={formState.deliveryDate}
              onChange={(d) => formActions.setDeliveryDate(d)}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <TimePicker
              label={t('newShipment.schedule.pickupTime')}
              value={formState.pickupTime}
              onChange={formActions.setPickupTime}
            />
            <TimePicker
              label={t('newShipment.schedule.deliveryTime')}
              value={formState.deliveryTime}
              onChange={formActions.setDeliveryTime}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
