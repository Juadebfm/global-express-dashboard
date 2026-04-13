import type { ReactElement } from 'react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button, Input, Card, OtpInput } from '@/components/ui';
import { ROUTES } from '@/constants';
import {
  emailStepSchema,
  otpStepSchema,
  newPasswordStepSchema,
  type EmailStepData,
  type OtpStepData,
  type NewPasswordStepData,
} from './ForgotPasswordForm.schema';

type Step = 'email' | 'otp' | 'password' | 'success';

interface ForgotPasswordFormProps {
  onSendCode: (email: string) => Promise<void>;
  onVerifyCode: (email: string, otp: string) => Promise<void>;
  onResetPassword: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function ForgotPasswordForm({
  onSendCode,
  onVerifyCode,
  onResetPassword,
  isLoading = false,
  error,
}: ForgotPasswordFormProps): ReactElement {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');

  // Email step form
  const emailForm = useForm<EmailStepData>({
    resolver: zodResolver(emailStepSchema),
    defaultValues: { email: '' },
  });

  // OTP step form
  const otpForm = useForm<OtpStepData>({
    resolver: zodResolver(otpStepSchema),
    defaultValues: { otp: '' },
  });

  // Password step form
  const passwordForm = useForm<NewPasswordStepData>({
    resolver: zodResolver(newPasswordStepSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleEmailSubmit = async (data: EmailStepData): Promise<void> => {
    await onSendCode(data.email);
    setEmail(data.email);
    setStep('otp');
  };

  const handleOtpSubmit = async (data: OtpStepData): Promise<void> => {
    await onVerifyCode(email, data.otp);
    setStep('password');
  };

  const handlePasswordSubmit = async (data: NewPasswordStepData): Promise<void> => {
    await onResetPassword(email, data.password);
    setStep('success');
  };

  const handleSuccessContinue = (): void => {
    navigate(ROUTES.LOGIN);
  };

  // Email Step
  if (step === 'email') {
    return (
      <Card className="auth-panel-card p-8 sm:p-10">
        <div className="flex justify-center mb-6">
          <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{t('forgotPasswordForm.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('forgotPasswordForm.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-5">
          <Input
            label={t('forgotPasswordForm.emailLabel')}
            type="email"
            placeholder={t('forgotPasswordForm.emailPlaceholder')}
            error={emailForm.formState.errors.email?.message}
            {...emailForm.register('email')}
          />

          <Button
            type="submit"
            className="auth-cta-btn w-full text-sm"
            size="lg"
            isLoading={isLoading}
          >
            {t('forgotPasswordForm.continueButton')}
          </Button>
        </form>

        <Link
          to={ROUTES.LOGIN}
          className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('forgotPasswordForm.backToLogin')}
        </Link>
      </Card>
    );
  }

  // OTP Step
  if (step === 'otp') {
    return (
      <Card className="auth-panel-card p-8 sm:p-10">
        <div className="flex justify-center mb-6">
          <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900">{t('forgotPasswordForm.otpTitle')}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('forgotPasswordForm.otpSubtitle', { email })}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-5">
          <Controller
            name="otp"
            control={otpForm.control}
            render={({ field }) => (
              <OtpInput
                length={4}
                value={field.value}
                onChange={field.onChange}
                error={otpForm.formState.errors.otp?.message}
              />
            )}
          />

          <Button
            type="submit"
            className="auth-cta-btn w-full text-sm"
            size="lg"
            isLoading={isLoading}
          >
            {t('forgotPasswordForm.continueButton')}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setStep('email')}
          className="mt-6 w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('forgotPasswordForm.back')}
        </button>
      </Card>
    );
  }

  // Password Step
  if (step === 'password') {
    return (
      <Card className="auth-panel-card p-8 sm:p-10">
        <div className="flex justify-center mb-6">
          <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{t('forgotPasswordForm.newPasswordTitle')}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('forgotPasswordForm.newPasswordSubtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-5">
          <Input
            label={t('forgotPasswordForm.newPasswordLabel')}
            type="password"
            placeholder={t('forgotPasswordForm.newPasswordPlaceholder')}
            showPasswordToggle
            error={passwordForm.formState.errors.password?.message}
            {...passwordForm.register('password')}
          />

          <Input
            label={t('forgotPasswordForm.confirmPasswordLabel')}
            type="password"
            placeholder={t('forgotPasswordForm.confirmPasswordPlaceholder')}
            showPasswordToggle
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />

          <Button
            type="submit"
            className="auth-cta-btn w-full text-sm"
            size="lg"
            isLoading={isLoading}
          >
            {t('forgotPasswordForm.continueButton')}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setStep('otp')}
          className="mt-6 w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('forgotPasswordForm.back')}
        </button>
      </Card>
    );
  }

  // Success Step
  return (
    <Card className="auth-panel-card p-8 sm:p-10">
      <div className="flex justify-center mb-6">
        <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-brand-500" />
        </div>
        <h2 className="text-xl font-semibold text-brand-500 mb-2">{t('forgotPasswordForm.successTitle')}</h2>
        <p className="text-sm text-gray-500">
          {t('forgotPasswordForm.successDesc')}
        </p>
      </div>

      <Button
        type="button"
        className="auth-cta-btn mt-6 w-full text-sm"
        size="lg"
        onClick={handleSuccessContinue}
      >
        {t('forgotPasswordForm.continueButton')}
      </Button>
    </Card>
  );
}
