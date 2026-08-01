import type { ReactElement, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth, usePermissions } from '@/hooks';
import { ROUTES } from '@/constants';
import { PageLoader } from '@/components/ui';
import { useFeedbackStore } from '@/store/feedback/feedback.store';
import type { CapabilityKey, User } from '@/types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: User['role'][];
  blockedRoles?: User['role'][];
  /**
   * Backend capability keys required by this route. The matrix is the only
   * authority for these checks: an admin role alone never satisfies one.
   */
  requiredCapabilities?: CapabilityKey[];
  capabilityMode?: 'all' | 'any';
  /**
   * A route may be shared with a Clerk customer surface (Payments). Those
   * roles use their own backend contract and must not call /permissions/me.
   */
  skipCapabilityRoles?: User['role'][];
  redirectTo?: string;
}

function CapabilityDeniedRedirect({ to }: { to: string }): ReactElement {
  const pushMessage = useFeedbackStore((state) => state.pushMessage);
  const hasNotified = useRef(false);

  useEffect(() => {
    if (hasNotified.current) return;
    hasNotified.current = true;
    pushMessage({ tone: 'error', message: 'Access no longer available.' });
  }, [pushMessage]);

  return <Navigate to={to} replace />;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  blockedRoles,
  requiredCapabilities,
  capabilityMode = 'all',
  skipCapabilityRoles,
  redirectTo,
}: ProtectedRouteProps): ReactElement {
  const { isAuthenticated, isLoading, user } = useAuth();
  const permissions = usePermissions();
  const { isSignedIn: isClerkSignedIn, isLoaded: isClerkLoaded } = useClerkAuth();
  const location = useLocation();

  // Staff/admin/superadmin never authenticate via Clerk (internal JWT only),
  // so a route restricted to those roles has no reason to wait on Clerk's
  // SDK — which, running on a development instance, can take 10+ seconds to
  // finish its dev-browser handshake. Only skip the wait when the route is
  // provably staff-only (allowedRoles set, and excludes 'user'/'supplier',
  // the two Clerk-authenticated roles); any ambiguous/unrestricted route
  // keeps the original behavior.
  const isStaffOnlyRoute =
    !!allowedRoles?.length && allowedRoles.every((role) => role !== 'user' && role !== 'supplier');

  if (isLoading || (!isClerkLoaded && !isStaffOnlyRoute)) {
    return <PageLoader label="Loading..." />;
  }

  // Internal JWT takes priority — if the user explicitly logged in with
  // credentials, honour that role even when a Clerk session cookie lingers.
  const effectiveRole: User['role'] | null =
    isAuthenticated && user?.role
      ? user.role
      : isClerkSignedIn
        ? 'user'
        : null;

  const isEffectivelyAuthenticated = isAuthenticated || isClerkSignedIn;

  if (!isEffectivelyAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // No role resolved — send to login to avoid redirect loops between dashboards
  if (!effectiveRole) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Internal staff with a forced password change must complete it first.
  // mustCompleteProfile is no longer a hard gate — the dashboard shows a soft
  // banner for accounts where an admin has manually set that flag.
  if (
    isAuthenticated &&
    user?.mustChangePassword &&
    location.pathname !== ROUTES.STAFF_ONBOARDING
  ) {
    return <Navigate to={ROUTES.STAFF_ONBOARDING} replace />;
  }

  // Roles flagged with mustEnrollMfa cannot reach any protected page until
  // they finish enrollment — block here even on refresh / deep-link so the
  // gate isn't bypassable past the initial login redirect.
  if (
    isAuthenticated &&
    user?.mustEnrollMfa &&
    location.pathname !== ROUTES.MFA_ENROLL
  ) {
    return <Navigate to={ROUTES.MFA_ENROLL} replace />;
  }

  if (blockedRoles && blockedRoles.includes(effectiveRole)) {
    return <Navigate to={redirectTo ?? ROUTES.FORBIDDEN} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
    return <Navigate to={redirectTo ?? ROUTES.FORBIDDEN} replace />;
  }

  const shouldCheckCapabilities =
    !!requiredCapabilities?.length && !skipCapabilityRoles?.includes(effectiveRole);

  if (shouldCheckCapabilities) {
    // Do not show a protected route until the server-provided matrix has
    // resolved. If it fails, deny rather than guessing from the role.
    if (!permissions.isReady && !permissions.isError) {
      return <PageLoader label="Loading access..." />;
    }

    const hasRequiredCapabilities = requiredCapabilities &&
      (capabilityMode === 'any'
        ? requiredCapabilities.some((capability) => permissions.can(capability))
        : requiredCapabilities.every((capability) => permissions.can(capability)));

    if (!hasRequiredCapabilities) {
      return <CapabilityDeniedRedirect to={redirectTo ?? ROUTES.ADMIN_DASHBOARD} />;
    }
  }

  return <>{children}</>;
}
