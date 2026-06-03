import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, Mail, Phone, User } from 'lucide-react';
import { Checkbox } from '@/components/ui';
import { cn } from '@/utils';
import type { ShipmentFormState, ShipmentFormActions } from '../types';

interface RecipientStepProps {
  formState: ShipmentFormState;
  formActions: ShipmentFormActions;
  fieldErrors: Record<string, string>;
}

/**
 * Step 2 — "Who's collecting it?". Route is fixed (Korea → Lagos) so no
 * address inputs are needed. Collects:
 *  - Recipient name / email / phone
 *  - Optional pickup-rep checkbox + name/phone
 *
 * The mock-style iconified inputs replace the generic <Input> for visual
 * consistency with the layout in the design.
 */
export function RecipientStep({
  formState,
  formActions,
  fieldErrors,
}: RecipientStepProps): ReactElement {
  const { t } = useTranslation('shipments');

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
          {t('newShipment.recipient.preheading')}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
          {t('newShipment.recipient.heading')}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {t('newShipment.recipient.subheading')}
        </p>
      </header>

      {/* Fixed route banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <p>
          <span className="font-semibold">{t('newShipment.recipient.routeFixedPrefix')}</span>{' '}
          <span className="font-bold">{t('newShipment.recipient.originCity')}</span>{' '}
          <ArrowRight className="inline h-4 w-4 align-text-bottom" />{' '}
          <span className="font-bold">{t('newShipment.recipient.destinationCity')}</span>
          {'. '}
          {t('newShipment.recipient.routeFixedSuffix')}
        </p>
      </div>

      <IconInput
        icon={<User className="h-5 w-5" />}
        label={t('newShipment.recipient.recipientName')}
        value={formState.recipientName}
        onChange={formActions.setRecipientName}
        error={fieldErrors.recipientName}
        autoComplete="name"
      />
      <IconInput
        icon={<Mail className="h-5 w-5" />}
        label={t('newShipment.recipient.emailAddress')}
        type="email"
        value={formState.recipientEmail}
        onChange={formActions.setRecipientEmail}
        error={fieldErrors.recipientEmail}
        autoComplete="email"
      />
      <IconInput
        icon={<Phone className="h-5 w-5" />}
        label={t('newShipment.recipient.phoneNumber')}
        type="tel"
        value={formState.recipientPhone}
        onChange={formActions.setRecipientPhone}
        error={fieldErrors.recipientPhone}
        autoComplete="tel"
      />

      {/* Pickup-rep — optional */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <Checkbox
          label={t('newShipment.recipient.someoneElseLabel')}
          checked={formState.usePickupRep}
          onChange={(e) => formActions.setUsePickupRep(e.target.checked)}
        />
        {formState.usePickupRep && (
          <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
            <IconInput
              icon={<User className="h-5 w-5" />}
              label={t('newShipment.recipient.pickupRepName')}
              value={formState.pickupRepName}
              onChange={formActions.setPickupRepName}
              error={fieldErrors.pickupRepName}
              autoComplete="name"
            />
            <IconInput
              icon={<Phone className="h-5 w-5" />}
              label={t('newShipment.recipient.pickupRepPhone')}
              type="tel"
              value={formState.pickupRepPhone}
              onChange={formActions.setPickupRepPhone}
              autoComplete="tel"
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface IconInputProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}

function IconInput({
  icon,
  label,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
}: IconInputProps): ReactElement {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </label>
      <div className="flex items-center gap-3 border-b-2 border-gray-200 pb-2 transition focus-within:border-brand-500">
        <span className={cn('shrink-0', error ? 'text-red-500' : 'text-gray-400')}>{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-base font-semibold text-gray-900 placeholder-gray-300 focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
