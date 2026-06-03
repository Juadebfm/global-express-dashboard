import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell } from '@/pages/shared';
import { AlertBanner } from '@/components/ui';
import { useDashboardData } from '@/hooks';
import { useNewShipmentForm } from './useNewShipmentForm';
import { BasicsStep, RecipientStep, ReviewStepV2 } from './steps';
import { ConfirmationModal } from './ConfirmationModal';
import { StickyFooter } from './StickyFooter';

/**
 * New Shipment flow — V2 redesign (3 steps): Basics → Recipient → Review.
 * The form engine (validation, estimate, order creation) is unchanged;
 * only the UI shell changed. See `useNewShipmentForm.ts` for the form
 * logic and `steps/` for each screen.
 */
export function NewShipmentPage(): ReactElement {
  const { t } = useTranslation('shipments');
  const { data, isLoading, error } = useDashboardData();

  const form = useNewShipmentForm();

  return (
    <AppShell
      data={data}
      isLoading={isLoading || form.isCheckingCompleteness}
      error={form.completenessError ?? error}
      loadingLabel={t('newShipment.loadingLabel')}
    >
      {/* Bottom padding leaves room for the sticky footer */}
      <div className="mx-auto max-w-3xl space-y-8 pb-32">
        {form.createError && <AlertBanner tone="error" message={form.createError} />}

        {form.activeStep === 0 && (
          <BasicsStep
            formState={form.formState}
            formActions={form.formActions}
            fieldErrors={form.fieldErrors}
            isCustomer={form.isCustomer}
            clients={form.clients}
          />
        )}
        {form.activeStep === 1 && (
          <RecipientStep
            formState={form.formState}
            formActions={form.formActions}
            fieldErrors={form.fieldErrors}
          />
        )}
        {form.activeStep === 2 && (
          <ReviewStepV2
            formState={form.formState}
            estimate={form.estimate}
            estimateLoading={form.estimateLoading}
          />
        )}
      </div>

      <StickyFooter
        activeStep={form.activeStep}
        totalSteps={form.steps.length}
        shipmentType={form.formState.shipmentType}
        estimate={form.estimate}
        estimateLoading={form.estimateLoading}
        isCreatingOrder={form.isCreatingOrder}
        isCustomer={form.isCustomer}
        onBack={form.goPrevious}
        onPrimary={() => void form.handlePrimaryAction()}
      />

      {form.showConfirmation && (
        <ConfirmationModal
          isCustomer={form.isCustomer}
          trackingNumber={form.createdTrackingNumber}
          shipmentType={form.formState.shipmentType}
          estimate={form.estimate}
          onClose={() => form.setShowConfirmation(false)}
        />
      )}
    </AppShell>
  );
}
