import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, CheckCircle2, Scale, Send, Ship, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils';
import { ClientCombobox } from '@/components/ui';
import { SHIPMENT_TYPE_KEYS } from '../types';
import type { ShipmentFormState, ShipmentFormActions } from '../types';
import { DatePicker } from '../DatePicker';
import { CategoryPicker } from '../CategoryPicker';

interface BasicsStepProps {
  formState: ShipmentFormState;
  formActions: ShipmentFormActions;
  fieldErrors: Record<string, string>;
  isCustomer: boolean;
  clients: Array<{ id: string; firstName?: string; lastName?: string; email: string }>;
}

const TYPE_META: Record<string, { Icon: typeof Send; descriptionKey: string }> = {
  air: { Icon: Send, descriptionKey: 'newShipment.basics.airDescription' },
  ocean: { Icon: Ship, descriptionKey: 'newShipment.basics.oceanDescription' },
};

/**
 * Step 1 — "What are you sending?". Collects:
 *  - Freight type (Air vs Ocean) via big cards with icon + ETA + description
 *  - Sender client (operator-only)
 *  - "What's inside?" via the CategoryPicker (chips + freeform)
 *  - Weight (air) / CBM (ocean) + Declared Value
 *  - Pickup date
 */
export function BasicsStep({
  formState,
  formActions,
  fieldErrors,
  isCustomer,
  clients,
}: BasicsStepProps): ReactElement {
  const { t } = useTranslation('shipments');

  const shipmentTypes = SHIPMENT_TYPE_KEYS.map((s) => ({
    value: s.value,
    label: t(s.labelKey),
    description: t(TYPE_META[s.value]?.descriptionKey ?? ''),
    Icon: TYPE_META[s.value]?.Icon ?? Send,
  }));

  const today = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
          {t('newShipment.basics.preheading')}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
          {t('newShipment.basics.heading')}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {t('newShipment.basics.subheading')}
        </p>
      </header>

      {/* Freight type cards */}
      <div className="space-y-3">
        {shipmentTypes.map(({ value, label, description, Icon }) => {
          const isSelected = formState.shipmentType === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => formActions.setShipmentType(value)}
              className={cn(
                'flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition',
                isSelected
                  ? 'border-brand-500 bg-brand-50/40'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <div
                className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
                  isSelected ? 'bg-white text-brand-500' : 'bg-gray-100 text-gray-500',
                )}
              >
                <Icon className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-gray-900">{label}</p>
                <p className="mt-0.5 text-sm text-gray-500">{description}</p>
              </div>
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition',
                  isSelected
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-gray-300 bg-white',
                )}
                aria-hidden
              >
                {isSelected && <CheckCircle2 className="h-5 w-5" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Sender client — operator-only */}
      {!isCustomer && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <ClientCombobox
            clients={clients}
            selectedId={formState.selectedSenderId}
            onSelect={(c) => formActions.setSelectedSenderId(c.id)}
            label={t('newShipment.basics.senderLabel')}
            hint={t('newShipment.basics.senderHint')}
            placeholder={t('newShipment.basics.senderPlaceholder')}
            error={fieldErrors.selectedSenderId ?? null}
          />
        </div>
      )}

      {/* What's inside */}
      <CategoryPicker
        value={formState.packageDescription}
        onChange={formActions.setPackageDescription}
        error={fieldErrors.packageDescription}
      />

      {/* Weight + Declared Value */}
      <div className="grid gap-4 sm:grid-cols-2">
        <UnitField
          icon={<Scale className="h-4 w-4" />}
          label={
            formState.shipmentType === 'air'
              ? t('newShipment.basics.weightLabel')
              : t('newShipment.basics.volumeLabel')
          }
          unit={formState.shipmentType === 'air' ? 'kg' : 'cbm'}
          value={
            formState.shipmentType === 'air'
              ? formState.packageWeightKg
              : formState.packageCbm
          }
          onChange={(v) =>
            formState.shipmentType === 'air'
              ? formActions.setPackageWeightKg(v)
              : formActions.setPackageCbm(v)
          }
          step={formState.shipmentType === 'air' ? '0.01' : '0.001'}
          error={
            formState.shipmentType === 'air'
              ? fieldErrors.packageWeightKg
              : fieldErrors.packageCbm
          }
        />
        <UnitField
          icon={<ShieldCheck className="h-4 w-4" />}
          label={t('newShipment.basics.declaredValueLabel')}
          unit="USD"
          value={formState.packageDeclaredValue}
          onChange={formActions.setPackageDeclaredValue}
          step="1"
          error={fieldErrors.packageDeclaredValue}
        />
      </div>

      {/* Pickup date */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          <Calendar className="h-4 w-4" />
          {t('newShipment.basics.pickupDateLabel')}
        </div>
        <DatePicker
          label={t('newShipment.basics.pickupDateLabel')}
          value={formState.pickupDate}
          onChange={formActions.setPickupDate}
          minDate={today}
        />
      </div>
    </div>
  );
}

interface UnitFieldProps {
  icon: React.ReactNode;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  step: string;
  error?: string;
}

/**
 * Number input with a tiny icon label above and a unit suffix inside the
 * field (e.g. "kg", "USD"). Used inline by BasicsStep for the weight and
 * declared-value pair.
 */
function UnitField({
  icon,
  label,
  unit,
  value,
  onChange,
  step,
  error,
}: UnitFieldProps): ReactElement {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {icon}
        {label}
      </div>
      <div className="relative">
        <input
          type="number"
          step={step}
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={cn(
            'w-full rounded-xl border bg-white py-3 pl-4 pr-14 text-base font-semibold text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2',
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-gray-200 focus:border-brand-400 focus:ring-brand-100',
          )}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase text-gray-400">
          {unit}
        </span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
