import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Button, Input, Checkbox, Card } from '@/components/ui';
import { ROUTES } from '@/constants';
import { loginSchema, type LoginFormData } from './LoginForm.schema';
import type { LoginFormProps } from './LoginForm.types';

export function LoginForm({
  onSubmit,
  isLoading = false,
  error,
}: LoginFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  return (
    <Card className="p-8">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <img
          src="/images/mainlogo.svg"
          alt="GlobalXpress"
          className="h-12"
        />
      </div>

      {/* Heading */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Login to your account
        </h2>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email"
          type="email"
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          showPasswordToggle
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between">
          <Checkbox
            label="Remember password"
            {...register('rememberMe')}
          />
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full text-sm"
          size="lg"
          isLoading={isLoading}
        >
          Login
        </Button>
      </form>

      <div className="mt-6" />
    </Card>
  );
}
