import type { ReactElement, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  if (isLoading) {
    return <PageLoader label="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (blockedRoles && user && blockedRoles.includes(user.role)) {
    return <Navigate to={redirectTo ?? ROUTES.DASHBOARD} replace />;
  }

  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate to={redirectTo ?? ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
}
