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

  // Clerk users are treated as 'user' role for access control
  const effectiveRole: User['role'] | null = isClerkSignedIn
    ? 'user'
    : (user?.role ?? null);

  const isEffectivelyAuthenticated = isAuthenticated || isClerkSignedIn;

  if (!isEffectivelyAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (blockedRoles && effectiveRole && blockedRoles.includes(effectiveRole)) {
    return <Navigate to={redirectTo ?? ROUTES.FORBIDDEN} replace />;
  }

  if (allowedRoles && (!effectiveRole || !allowedRoles.includes(effectiveRole))) {
    return <Navigate to={redirectTo ?? ROUTES.FORBIDDEN} replace />;
  }

  return <>{children}</>;
}
