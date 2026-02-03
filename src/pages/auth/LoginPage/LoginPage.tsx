import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthLayout } from '@/components/layout';
import { LoginForm, type LoginFormData } from '@/components/forms';
import { useAuth } from '@/hooks';
import { ROUTES } from '@/constants';

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated, error, clearError } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
      navigate(ROUTES.DASHBOARD);
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
