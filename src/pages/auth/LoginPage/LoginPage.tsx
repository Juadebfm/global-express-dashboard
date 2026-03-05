import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { AuthLayout } from '@/components/layout';
import { LoginForm, type LoginFormData } from '@/components/forms';
import { useAuth } from '@/hooks';
import { ROUTES } from '@/constants';

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { login, isLoading, isAuthenticated, user, error, clearError } = useAuth();

  // Redirect already-authenticated users to the correct dashboard.
  // Only redirect when we have a resolved role — otherwise the
  // ProtectedRoute on the target page would bounce us back here (loop).
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role) {
      // Staff needing onboarding go to the onboarding page first
      if (user.mustChangePassword || user.mustCompleteProfile) {
        navigate(ROUTES.STAFF_ONBOARDING, { replace: true });
        return;
      }
      const dest =
        user.role === 'staff' || user.role === 'admin' || user.role === 'superadmin'
          ? ROUTES.ADMIN_DASHBOARD
          : ROUTES.DASHBOARD;
      navigate(dest, { replace: true });
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleSubmit = async (data: LoginFormData): Promise<void> => {
    try {
      await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });
      // Evict any customer Clerk session on this device
      await signOut();
      // The useEffect above handles redirect once isAuthenticated + user are set
    } catch {
      // Error is handled by context
    }
  };

  return (
    <AuthLayout>
      <LoginForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
      />
    </AuthLayout>
  );
}
