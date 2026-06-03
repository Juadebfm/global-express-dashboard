import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/utils';
import i18n from '@/i18n/i18n';
import type { PublicShippingEstimate } from '@/types';

interface StickyFooterProps {
  activeStep: number;
  totalSteps: number;
  shipmentType: string;
  estimate: PublicShippingEstimate | null;
  estimateLoading: boolean;
  isCreatingOrder: boolean;
  isCustomer: boolean;
  onBack: () => void;
  onPrimary: () => void;
}

/**
 * Sticky bottom bar that follows the user through every step. Shows:
 *  - Route pills (🇰🇷 → 🇳🇬) + freight type label + a "ready to create" or
 *    progress indicator
 *  - Estimated cost + transit days (only when the estimate has resolved)
 *  - Back button (hidden on first step) + Primary action (Continue / Create)
 *
 * The primary label adapts to step (`Continue` on first two steps,
 * `Create shipment` on review).
 */
export function StickyFooter({
  activeStep,
  totalSteps,
  shipmentType,
  estimate,
  estimateLoading,
  isCreatingOrder,
  isCustomer,
  onBack,
  onPrimary,
}: StickyFooterProps): ReactElement {
  const { t } = useTranslation('shipments');
  const isReview = activeStep === totalSteps - 1;
  const isFirst = activeStep === 0;

  const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
  const costLine = estimate
    ? `$${estimate.estimatedCostUsd.toLocaleString(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`
    : null;
  const transitLine = shipmentType === 'air' ? '~7d' : '~3mo';

  const stateLine = isReview
    ? t('newShipment.footer.readyToCreate')
    : t('newShipment.footer.stepProgress', {
        current: activeStep + 1,
        total: totalSteps,
      });

  const primaryLabel = isReview
    ? isCreatingOrder
      ? isCustomer
        ? t('newShipment.navigation.creatingShipment')
        : t('newShipment.navigation.creatingOrder')
      : isCustomer
        ? t('newShipment.navigation.createShipment')
        : t('newShipment.navigation.createOrder')
    : t('newShipment.footer.continue');

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        {/* Route + state */}
        <div className="flex flex-1 items-center gap-3 min-w-[180px]">
          <RoutePills />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">
              {t('newShipment.footer.routeLabel', {
                from: t('newShipment.recipient.originCity'),
                to: t('newShipment.recipient.destinationCity'),
                type:
                  shipmentType === 'air'
                    ? t('newShipment.basics.airShort')
                    : t('newShipment.basics.oceanShort'),
              })}
            </p>
            <p className="truncate text-xs text-gray-500">{stateLine}</p>
          </div>
        </div>

        {/* Cost */}
        <div className="hidden text-right sm:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {t('newShipment.footer.estCost')}
          </p>
          <p className={cn('text-base font-bold text-gray-900', !costLine && 'text-gray-400')}>
            {estimateLoading ? '—' : costLine ?? t('newShipment.footer.costPending')}
            <span className="ml-1 text-xs font-medium text-gray-500">· {transitLine}</span>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button variant="secondary" size="sm" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('newShipment.footer.back')}
            </Button>
          )}
          <Button
            size="sm"
            onClick={onPrimary}
            disabled={isCreatingOrder}
            className="gap-2"
          >
            {primaryLabel}
            {!isCreatingOrder && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Origin / destination flag pills (🇰🇷 → 🇳🇬). Using emoji + arrow icon
 * instead of <img> to keep the footer dependency-light; renders correctly
 * across all browsers we support.
 */
function RoutePills(): ReactElement {
  return (
    <div className="flex items-center gap-1 text-xl">
      <span aria-label="Korea" role="img">
        🇰🇷
      </span>
      <ArrowRight className="h-4 w-4 text-gray-400" />
      <span aria-label="Nigeria" role="img">
        🇳🇬
      </span>
    </div>
  );
}
