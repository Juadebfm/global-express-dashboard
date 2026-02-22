import type { ReactElement } from 'react';
import { useState } from 'react';
import { AuthLayout } from '@/components/layout';
import { ForgotPasswordForm } from '@/components/forms/ForgotPasswordForm';
import { sendOtp, verifyOtp, resetPassword } from '@/services/forgotPasswordService';

export function ForgotPasswordPage(): ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await sendOtp(email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (email: string, otp: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await verifyOtp(email, otp);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await resetPassword(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <ForgotPasswordForm
        onSendCode={handleSendCode}
        onVerifyCode={handleVerifyCode}
        onResetPassword={handleResetPassword}
        isLoading={isLoading}
        error={error}
      />
    </AuthLayout>
  );
}
