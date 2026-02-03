import type { ReactElement } from 'react';
import { useState } from 'react';
import { AuthLayout } from '@/components/layout';
import {
  ForgotPasswordForm,
  type ForgotPasswordFormData,
} from '@/components/forms/ForgotPasswordForm';
import { mockForgotPassword } from '@/data';

export function ForgotPasswordPage(): ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (data: ForgotPasswordFormData): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await mockForgotPassword(data.email);
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <ForgotPasswordForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
        success={success}
      />
    </AuthLayout>
  );
}
