import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthLayout } from '@/components/layout';
import { RegisterForm, type RegisterFormData } from '@/components/forms/RegisterForm';
import { useAuth } from '@/hooks';
import { ROUTES } from '@/constants';

export function RegisterPage(): ReactElement {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, isAuthenticated, error, clearError } = useAuth();

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

  const handleSubmit = async (data: RegisterFormData): Promise<void> => {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      navigate(ROUTES.DASHBOARD);
    } catch {
      // Error is handled by context
    }
  };

  return (
    <AuthLayout>
      <RegisterForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
      />
    </AuthLayout>
  );
}
