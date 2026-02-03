import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Button, Input, Card } from '@/components/ui';
import { ROUTES } from '@/constants';
import { registerSchema, type RegisterFormData } from './RegisterForm.schema';

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function RegisterForm({
  onSubmit,
  isLoading = false,
  error,
}: RegisterFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
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
        <h2 className="text-xl font-semibold text-gray-900">Create an account</h2>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            placeholder="John"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label="Last Name"
            placeholder="Doe"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <Input
          label="Email"
          type="email"
          placeholder="john@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Create a password"
          showPasswordToggle
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          showPasswordToggle
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Create Account
        </Button>
      </form>

      {/* Login link */}
      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          to={ROUTES.LOGIN}
          className="font-medium text-brand-500 hover:text-brand-600"
        >
          Login
        </Link>
      </p>
    </Card>
  );
}
