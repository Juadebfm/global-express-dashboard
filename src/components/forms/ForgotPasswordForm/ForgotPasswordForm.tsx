import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { ROUTES } from '@/constants';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from './ForgotPasswordForm.schema';

interface ForgotPasswordFormProps {
  onSubmit: (data: ForgotPasswordFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  success?: boolean;
}

export function ForgotPasswordForm({
  onSubmit,
  isLoading = false,
  error,
  success = false,
}: ForgotPasswordFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  return (
    <Card className="p-8">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-brand-500 font-display">
          GlobalXpress
        </h1>
        <p className="text-sm text-gray-500 mt-1">International Freight Agent</p>
      </div>

      {/* Heading */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Forgot your password?
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          No worries! Enter your email and we'll send you reset instructions.
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-600">
            Check your email for password reset instructions.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && !success && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Form */}
      {!success && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            Send Reset Link
          </Button>
        </form>
      )}

      {/* Back to login link */}
      <Link
        to={ROUTES.LOGIN}
        className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>
    </Card>
  );
}
