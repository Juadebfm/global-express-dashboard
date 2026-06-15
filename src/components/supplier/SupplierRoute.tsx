import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSupplierAuthStore } from '@/store/supplierAuth';
import { ROUTES } from '@/constants';

interface SupplierRouteProps {
  children: ReactNode;
}

export function SupplierRoute({ children }: SupplierRouteProps): ReactElement {
  const token = useSupplierAuthStore((s) => s.token);
  const clearAuth = useSupplierAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      if (useSupplierAuthStore.getState().token) {
        clearAuth();
        navigate(ROUTES.SUPPLIER_LOGIN, { replace: true });
      }
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [clearAuth, navigate]);

  if (!token) {
    return <Navigate to={ROUTES.SUPPLIER_LOGIN} replace />;
  }

  return <>{children}</>;
}
