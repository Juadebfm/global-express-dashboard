import { useState, useCallback, useEffect, useRef } from 'react';

const TOUR_COMPLETE_KEY = 'gx_onboarding_complete';
const TOUR_STARTED_KEY = 'gx_onboarding_started';
const WELCOME_DISMISSED_KEY = 'gx_welcome_dismissed';

interface OnboardingState {
  /** Whether the welcome popup should be visible */
  showWelcome: boolean;
  /** Whether the guided tour should be running */
  runTour: boolean;
  /** Call when user dismisses the welcome popup */
  dismissWelcome: () => void;
  /** Call when the tour finishes or is skipped */
  completeTour: () => void;
  /** Whether the tour is active — used to expand sidebar */
  isTourActive: boolean;
}

/**
 * Manages onboarding state for customer users.
 *
 * @param isCustomer  - true only for Clerk-authenticated public users
 * @param hasData     - true when user has at least one shipment or order
 * @param isDashboard - true when user is on the dashboard route
 */
export function useOnboarding(
  isCustomer: boolean,
  hasData: boolean,
  isDashboard: boolean,
): OnboardingState {
  const tourComplete = localStorage.getItem(TOUR_COMPLETE_KEY) === 'true';
  const tourPreviouslyStarted = localStorage.getItem(TOUR_STARTED_KEY) === 'true';

  // sessionStorage persists within the tab — survives route changes and re-renders,
  // but resets on next login (new tab / window close).
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(WELCOME_DISMISSED_KEY) === 'true',
  );
  const [runTour, setRunTour] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edge case: tour was started in a prior session but not completed (e.g. page refresh).
  // Skip the popup and resume the tour directly — only on the dashboard page.
  const tourInterrupted = tourPreviouslyStarted && !tourComplete;

  // Show popup when: customer, on dashboard, no data, not dismissed this session,
  // and tour wasn't previously interrupted
  const showWelcome =
    isCustomer && isDashboard && !hasData && !dismissed && !tourInterrupted;

  // Auto-resume interrupted tour when customer lands on dashboard
  useEffect(() => {
    if (isCustomer && isDashboard && tourInterrupted && !runTour) {
      const id = setTimeout(() => setRunTour(true), 300);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [isCustomer, isDashboard, tourInterrupted, runTour]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dismissWelcome = useCallback((): void => {
    setDismissed(true);
    sessionStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
    // Start tour if it hasn't been completed yet
    if (!tourComplete) {
      localStorage.setItem(TOUR_STARTED_KEY, 'true');
      // Small delay so popup fully closes before tour spotlight appears
      timerRef.current = setTimeout(() => setRunTour(true), 400);
    }
  }, [tourComplete]);

  const completeTour = useCallback((): void => {
    setRunTour(false);
    localStorage.setItem(TOUR_COMPLETE_KEY, 'true');
    localStorage.removeItem(TOUR_STARTED_KEY);
  }, []);

  return {
    showWelcome,
    runTour,
    dismissWelcome,
    completeTour,
    isTourActive: runTour,
  };
}
