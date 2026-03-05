import type { ReactElement, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '@/hooks';
import { ROUTES } from '@/constants';
import { PageLoader } from '@/components/ui';
import type { User } from '@/types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: User['role'][];
  blockedRoles?: User['role'][];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  blockedRoles,
  redirectTo,
}: ProtectedRouteProps): ReactElement {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isSignedIn: isClerkSignedIn, isLoaded: isClerkLoaded } = useClerkAuth();
  const location = useLocation();

  if (isLoading || !isClerkLoaded) {
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

  // Internal staff that still need onboarding must complete it first
  if (isAuthenticated && user && (user.mustChangePassword || user.mustCompleteProfile)) {
    return <Navigate to={ROUTES.STAFF_ONBOARDING} replace />;
  }

  if (blockedRoles && blockedRoles.includes(effectiveRole)) {
    return <Navigate to={redirectTo ?? ROUTES.FORBIDDEN} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
    return <Navigate to={redirectTo ?? ROUTES.FORBIDDEN} replace />;
  }

  return <>{children}</>;
}
