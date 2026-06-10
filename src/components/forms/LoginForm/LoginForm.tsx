import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldOff, ExternalLink } from 'lucide-react';
import { Button, Input, Checkbox, Card } from '@/components/ui';
import { ROUTES } from '@/constants';
import { loginSchema, type LoginFormData } from './LoginForm.schema';
import type { LoginFormProps } from './LoginForm.types';

const CUSTOMER_LOGIN_URL = `${window.location.origin}${ROUTES.SIGN_IN}`;

export function LoginForm({
  onSubmit,
  isLoading = false,
  error,
  isLockedOut = false,
  lockoutCountdownLabel,
  rateLimitCountdownLabel,
}: LoginFormProps): ReactElement {
  const isRateLimited = Boolean(rateLimitCountdownLabel);
  const isSubmitBlocked = isLockedOut || isRateLimited;
  const isIpBlocked = Boolean(error && error.toLowerCase().includes('allowlist'));
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
    <Card className="auth-panel-card p-8 sm:p-10 relative">
      {/* IP allowlist block — permanent overlay, no dismiss */}
      {isIpBlocked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/90 backdrop-blur-sm p-6">
          <div className="flex flex-col items-center text-center gap-4 max-w-xs">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <ShieldOff className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Access restricted</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                This portal is for Global Express staff only, and your device isn't on our approved access list.
              </p>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                If you're a customer, sign in to your account at:
              </p>
            </div>
            <a
              href={CUSTOMER_LOGIN_URL}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              {CUSTOMER_LOGIN_URL}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
            <p className="text-xs text-gray-400">
              If you are staff and believe this is a mistake, contact your administrator.
            </p>
          </div>
        </div>
      )}

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

      {/* Error message — suppressed for IP block (handled by overlay above) */}
      {error && !isIpBlocked && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 423 account-lockout countdown — disables submit until elapsed. */}
      {isLockedOut && lockoutCountdownLabel && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm font-medium text-amber-800">
            Account temporarily locked.{' '}
            <span className="font-mono">Try again in {lockoutCountdownLabel}.</span>
          </p>
        </div>
      )}

      {/* 429 rate-limit cooldown — distinct from 423; the user isn't
          locked out, they just hit the per-IP rate limiter. */}
      {!isLockedOut && isRateLimited && rateLimitCountdownLabel && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm font-medium text-amber-800">
            Too many attempts.{' '}
            <span className="font-mono">Retry in {rateLimitCountdownLabel}.</span>
          </p>
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
          disabled={isSubmitBlocked}
        >
          {t('loginForm.loginButton')}
        </Button>
      </form>

      <div className="mt-6" />
    </Card>
  );
}
