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
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-brand-500 font-display">
          GlobalXpress
        </h1>
        <p className="text-sm text-gray-500 mt-1">International Freight Agent</p>
      </div>

      {/* Heading */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Login to your account
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back! Please enter your details.
        </p>
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
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          Login
        </Button>
      </form>

      {/* Register link */}
      <p className="mt-6 text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link
          to={ROUTES.REGISTER}
          className="font-medium text-brand-500 hover:text-brand-600"
        >
          Create account
        </Link>
      </p>
    </Card>
  );
}
