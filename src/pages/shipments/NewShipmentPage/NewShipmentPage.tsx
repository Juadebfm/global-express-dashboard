import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const form = useNewShipmentForm();

  return (
    <AppShell
      data={data}
      isLoading={isLoading || form.isCheckingCompleteness}
      error={form.completenessError ?? error}
      loadingLabel={t('newShipment.loadingLabel')}
    >
      {/* Bottom padding leaves room for the (taller) sticky footer */}
      <div className="mx-auto max-w-3xl space-y-8 pb-44">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        {form.createError && <AlertBanner tone="error" message={form.createError} />}

        {form.activeStep === 0 && (
          <BasicsStep
            formState={form.formState}
            formActions={form.formActions}
            fieldErrors={form.fieldErrors}
            isCustomer={form.isCustomer}
          />
        )}
        {form.activeStep === 1 && (
          <RecipientStep
            formState={form.formState}
            formActions={form.formActions}
            fieldErrors={form.fieldErrors}
            shipmentType={form.formState.shipmentType}
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
