import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Input, Checkbox, Card } from '@/components/ui';
import { ROUTES } from '@/constants';
import { loginSchema, type LoginFormData } from './LoginForm.schema';
import type { LoginFormProps } from './LoginForm.types';

export function LoginForm({
  onSubmit,
  isLoading = false,
  error,
}: LoginFormProps): ReactElement {
  const { t } = useTranslation('auth');
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
    <Card className="auth-panel-card p-8 sm:p-10">
      <div className="mb-4 flex justify-center">
        <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
      </div>

      {/* Heading */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {t('loginForm.title')}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {t('loginForm.subtitle')}
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
          label={t('loginForm.emailLabel')}
          type="email"
          placeholder={t('loginForm.emailPlaceholder')}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label={t('loginForm.passwordLabel')}
          type="password"
          placeholder={t('loginForm.passwordPlaceholder')}
          showPasswordToggle
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between">
          <Checkbox
            label={t('loginForm.rememberPassword')}
            {...register('rememberMe')}
          />
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            {t('loginForm.forgotPassword')}
          </Link>
        </div>

        <Button
          type="submit"
          className="auth-cta-btn w-full text-sm"
          size="lg"
          isLoading={isLoading}
        >
          {t('loginForm.loginButton')}
        </Button>
      </form>

      <div className="mt-6" />
    </Card>
  );
}
