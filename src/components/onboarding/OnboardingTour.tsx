import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface OnboardingTourProps {
  run: boolean;
  onComplete: () => void;
}

interface TourStep {
  target: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_GAP = 12;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_HEIGHT_EST = 160; // approximate max tooltip height
const VIEWPORT_MARGIN = 12; // minimum gap from viewport edge
const DESKTOP_BREAKPOINT = 1024; // lg breakpoint — sidebar is persistent above this

function getTargetRect(selector: string): Position | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
  };
}

/**
 * Compute tooltip position, then clamp to viewport so it never overflows.
 * All values are viewport-relative (for `position: fixed`).
 */
function getTooltipPosition(
  rect: Position,
  placement: TourStep['placement'],
): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top: number;
  let left: number;

  switch (placement) {
    case 'right':
      top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT_EST / 2;
      left = rect.left + rect.width + TOOLTIP_GAP;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT_EST / 2;
      left = rect.left - TOOLTIP_WIDTH - TOOLTIP_GAP;
      break;
    case 'bottom':
      top = rect.top + rect.height + TOOLTIP_GAP;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case 'top':
      top = rect.top - TOOLTIP_GAP - TOOLTIP_HEIGHT_EST;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      break;
  }

  // Clamp horizontal: keep tooltip fully within viewport
  const maxLeft = vw - TOOLTIP_WIDTH - VIEWPORT_MARGIN;
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, maxLeft));

  // Clamp vertical: keep tooltip fully within viewport
  const maxTop = vh - TOOLTIP_HEIGHT_EST - VIEWPORT_MARGIN;
  top = Math.max(VIEWPORT_MARGIN, Math.min(top, maxTop));

  return { top, left };
}

export function OnboardingTour({ run, onComplete }: OnboardingTourProps): ReactElement | null {
  const { t } = useTranslation('onboarding');
  const [stepIndex, setStepIndex] = useState(0);
  const [positionVersion, setPositionVersion] = useState(0);
  const [isDesktop, setIsDesktop] = useState(
    () => window.innerWidth >= DESKTOP_BREAKPOINT,
  );

  // Track viewport width — disable tour on mobile
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent): void => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const steps: TourStep[] = useMemo(
    () => [
      {
        target: '[data-tour="nav-shipments"]',
        content: t('tour.steps.shipments'),
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

  const activeSteps = useMemo(() => {
    if (!run || !isDesktop) return [];
    return steps.filter((step) => document.querySelector(step.target) !== null);
  }, [run, isDesktop, steps]);

  const totalSteps = activeSteps.length;
  const safeStepIndex = Math.min(stepIndex, Math.max(totalSteps - 1, 0));
  const currentStep = activeSteps[safeStepIndex] ?? null;

  // Viewport-relative rect (no scroll offset — we use position:fixed)
  const targetRect = useMemo(() => {
    if (!currentStep) return null;
    return getTargetRect(currentStep.target);
    // positionVersion triggers re-measurement on scroll/resize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, positionVersion]);

  useEffect(() => {
    if (!run || !currentStep) return;
    const target = document.querySelector(currentStep.target);
    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [run, currentStep]);

  useEffect(() => {
    if (!run) return undefined;

    const handleUpdate = (): void => {
      setPositionVersion((version) => version + 1);
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [run]);

  const handleNext = useCallback((): void => {
    if (safeStepIndex < totalSteps - 1) {
      setStepIndex((index) => index + 1);
      return;
    }

    setStepIndex(0);
    onComplete();
  }, [safeStepIndex, totalSteps, onComplete]);

  const handleBack = useCallback((): void => {
    if (safeStepIndex > 0) {
      setStepIndex((index) => Math.max(index - 1, 0));
    }
  }, [safeStepIndex]);

  const handleSkip = useCallback((): void => {
    setStepIndex(0);
    onComplete();
  }, [onComplete]);

  // Don't render on mobile or when no valid target
  if (!run || !isDesktop || !currentStep || !targetRect) return null;

  const tooltipStyle = getTooltipPosition(targetRect, currentStep.placement);

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[80]" aria-hidden="true">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="tour-spotlight">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - PADDING}
                y={targetRect.top - PADDING}
                width={targetRect.width + PADDING * 2}
                height={targetRect.height + PADDING * 2}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.5)"
            mask="url(#tour-spotlight)"
          />
        </svg>
      </div>

      {/* Tooltip — clamped to viewport */}
      <div
        role="dialog"
        aria-label={t('tour.ariaLabel')}
        className="fixed z-81 w-80 rounded-2xl bg-white p-5 shadow-2xl"
        style={tooltipStyle}
      >
        <button
          type="button"
          onClick={handleSkip}
          className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label={t('tour.close')}
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <p className="pr-6 text-sm leading-relaxed text-gray-700">{currentStep.content}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {safeStepIndex + 1} / {totalSteps}
          </span>

          <div className="flex items-center gap-2">
            {safeStepIndex === 0 ? (
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:text-gray-600"
              >
                {t('tour.skip')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:text-gray-700"
              >
                {t('tour.back')}
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
            >
              {safeStepIndex < totalSteps - 1 ? t('tour.next') : t('tour.finish')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
