import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell } from '@/pages/shared';
import { AlertBanner, Button } from '@/components/ui';
import { useDashboardData } from '@/hooks';
import { cn } from '@/utils';
import { useNewShipmentForm } from './useNewShipmentForm';
import { ShipmentTypeStep, AddressesStep, PackageDetailsStep, ReviewStep } from './steps';
import { ConfirmationModal } from './ConfirmationModal';

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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {form.isCustomer
              ? t('newShipment.titleCustomer')
              : t('newShipment.titleOperator')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {form.isCustomer
              ? t('newShipment.subtitleCustomer')
              : t('newShipment.subtitleOperator')}
          </p>
        </div>

        {form.createError && <AlertBanner tone="error" message={form.createError} />}

        {/* Progress Bar */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {t('newShipment.progress.step', {
                current: form.activeStep + 1,
                total: form.steps.length,
              })}
            </span>
            <span>
              {t('newShipment.progress.complete', { percent: form.progress })}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${form.progress}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-400 sm:grid-cols-4">
            {form.steps.map((step, index) => (
              <div key={step.id} className="space-y-1">
                <p
                  className={cn(
                    'text-xs font-semibold',
                    index <= form.activeStep ? 'text-gray-700' : 'text-gray-400',
                  )}
                >
                  {step.label}
                </p>
                <p className="hidden text-[11px] sm:block">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Step Content */}
        {form.activeStep === 0 && (
          <ShipmentTypeStep
            formState={form.formState}
            formActions={form.formActions}
            fieldErrors={form.fieldErrors}
            isCustomer={form.isCustomer}
            clients={form.clients}
          />
        )}

        {form.activeStep === 1 && <AddressesStep />}

        {form.activeStep === 2 && (
          <PackageDetailsStep
            formState={form.formState}
            formActions={form.formActions}
            fieldErrors={form.fieldErrors}
          />
        )}

        {form.activeStep === 3 && (
          <ReviewStep
            formState={form.formState}
            estimate={form.estimate}
            estimateLoading={form.estimateLoading}
            fetchEstimate={form.fetchEstimate}
          />
        )}

        {/* Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={form.goPrevious}>
            {t('newShipment.navigation.previous')}
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" className="border-gray-300">
              {t('newShipment.navigation.saveDraft')}
            </Button>
            <Button
              size="sm"
              onClick={() => void form.handlePrimaryAction()}
              disabled={form.isCreatingOrder}
            >
              {form.activeStep === form.steps.length - 1
                ? form.isCreatingOrder
                  ? form.isCustomer
                    ? t('newShipment.navigation.creatingShipment')
                    : t('newShipment.navigation.creatingOrder')
                  : form.isCustomer
                    ? t('newShipment.navigation.createShipment')
                    : t('newShipment.navigation.createOrder')
                : t('newShipment.navigation.next')}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Confirmation Modal */}
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
