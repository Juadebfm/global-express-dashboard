import type { ReactElement } from 'react';
import { useCallback, useMemo } from 'react';
import Joyride, { type CallBackProps, type Step, STATUS } from 'react-joyride';
import { useTranslation } from 'react-i18next';

interface OnboardingTourProps {
  run: boolean;
  onComplete: () => void;
}

const TOUR_BEACON_STYLES = {
  options: {
    arrowColor: '#fff',
    backgroundColor: '#fff',
    primaryColor: '#f97316',
    textColor: '#1f2937',
    zIndex: 80,
  },
};

export function OnboardingTour({ run, onComplete }: OnboardingTourProps): ReactElement {
  const { t } = useTranslation('onboarding');

  // Steps ordered so always-in-DOM targets (sidebar, topbar) come first.
  // The Pre-Order button is dashboard-specific and may not exist on refresh,
  // so it goes last — Joyride skips missing targets gracefully.
  const steps: Step[] = useMemo(
    () => [
      {
        target: '[data-tour="nav-shipments"]',
        content: t('tour.steps.shipments'),
        disableBeacon: true,
        placement: 'right' as const,
      },
      {
        target: '[data-tour="nav-orders"]',
        content: t('tour.steps.orders'),
        placement: 'right' as const,
      },
      {
        target: '[data-tour="nav-deliverySchedule"]',
        content: t('tour.steps.deliverySchedule'),
        placement: 'right' as const,
      },
      {
        target: '[data-tour="lang-switcher"]',
        content: t('tour.steps.language'),
        placement: 'bottom' as const,
      },
      {
        target: '[data-tour="user-profile"]',
        content: t('tour.steps.profile'),
        placement: 'bottom' as const,
      },
      {
        target: '[data-tour="preorder-btn"]',
        content: t('tour.steps.preorder'),
        placement: 'bottom' as const,
      },
    ],
    [t],
  );

  const handleCallback = useCallback(
    (data: CallBackProps): void => {
      const { status } = data;
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        onComplete();
      }
    },
    [onComplete],
  );

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose
      callback={handleCallback}
      styles={{
        ...TOUR_BEACON_STYLES,
        tooltip: {
          borderRadius: 16,
          padding: '20px 24px',
        },
        tooltipContent: {
          fontSize: 14,
          lineHeight: '1.6',
          padding: '8px 0',
        },
        buttonNext: {
          backgroundColor: '#f97316',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          padding: '8px 18px',
        },
        buttonBack: {
          color: '#6b7280',
          fontSize: 13,
          fontWeight: 500,
        },
        buttonSkip: {
          color: '#9ca3af',
          fontSize: 13,
        },
      }}
      locale={{
        back: t('tour.back'),
        close: t('tour.close'),
        last: t('tour.finish'),
        next: t('tour.next'),
        skip: t('tour.skip'),
      }}
    />
  );
}
