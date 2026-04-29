import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth as useClerkAuth, useSignIn, useUser } from '@clerk/clerk-react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { AuthLayout } from '@/components/layout';
import { Button, Card, Input, PageLoader, ProvisioningGateModal } from '@/components/ui';
import {
  PROVISIONING_GATE_BLOCK_MESSAGE,
  PROVISIONING_GATE_TARGET_UTC,
  PUBLIC_WEBSITE_URL,
  ROUTES,
  isProvisioningGateActive,
} from '@/constants';
import { useProvisioningGate } from '@/hooks';
import { getMyProfileCompleteness, syncClerkAccount } from '@/services';

type Step = 'sign-in' | 'verify-2fa' | 'forgot-email' | 'forgot-code' | 'forgot-reset' | 'forgot-success';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'errors' in error) {
    const clerkError = error as { errors?: Array<{ message?: string }> };
    const message = clerkError.errors?.[0]?.message;
    if (message) return message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

function getErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'errors' in error) {
    const clerkError = error as { errors?: Array<{ code?: string }> };
    return clerkError.errors?.[0]?.code ?? null;
  }

  return null;
}

export function ExternalSignInPage(): ReactElement {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { getToken, signOut } = useClerkAuth();
  const { isProvisioningActive, countdownLabel, remainingMs } = useProvisioningGate();

  const [step, setStep] = useState<Step>('sign-in');

  // Sign-in fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 2FA field
  const [twoFaCode, setTwoFaCode] = useState('');

  // Forgot password fields
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postAuthRedirect, setPostAuthRedirect] = useState<string>(ROUTES.COMPLETE_PROFILE);
  const [dismissedProvisioningTarget, setDismissedProvisioningTarget] = useState<number | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);

  const hasPreparedSessionRef = useRef(false);
  const isProvisioningModalOpen =
    isProvisioningActive && dismissedProvisioningTarget !== PROVISIONING_GATE_TARGET_UTC;
  const provisioningModalMessage =
    `${PROVISIONING_GATE_BLOCK_MESSAGE}. Estimated unlock in ${countdownLabel}.`;

  const resolvePostAuthRedirect = useCallback(async (): Promise<string> => {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication token is missing.');
    }

    await syncClerkAccount(token);
    const completeness = await getMyProfileCompleteness(token);
    return completeness.isComplete ? ROUTES.DASHBOARD : ROUTES.COMPLETE_PROFILE;
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isUserLoaded || hasPreparedSessionRef.current) {
      return;
    }

    let isCancelled = false;

    const prepareSession = async (): Promise<void> => {
      if (isSignedIn) {
        try {
          await signOut();
        } catch (error) {
          if (!isCancelled) {
            setFormError(getErrorMessage(error));
          }
        }
      }

      if (!isCancelled) {
        hasPreparedSessionRef.current = true;
        setIsSessionReady(true);
      }
    };

    void prepareSession();

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, isSignedIn, isUserLoaded, signOut]);

  const clearErrors = () => {
    setErrors({});
    setFormError(null);
  };

  const resetExistingSession = useCallback(async (): Promise<void> => {
    setIsSessionReady(false);

    try {
      await signOut();
      setErrors({});
      setFormError('We found an existing saved session and cleared it. Please sign in again.');
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      hasPreparedSessionRef.current = true;
      setIsSessionReady(true);
    }
  }, [signOut]);

  const closeProvisioningModal = (): void => {
    setDismissedProvisioningTarget(PROVISIONING_GATE_TARGET_UTC);
  };

  const reopenProvisioningModal = (): void => {
    setDismissedProvisioningTarget(null);
  };

  const isBlockedByProvisioningGate = (): boolean => {
    if (!isProvisioningGateActive()) {
      return false;
    }
    reopenProvisioningModal();
    return true;
  };

  const renderSectionHeader = (title: string, subtitle?: string): ReactElement => (
    <div className="mb-6">
      <div className="mb-4 flex justify-center">
        <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-600">
          {subtitle}
        </p>
      )}
    </div>
  );

  // ── Sign in ────────────────────────────────────────────────────────────────

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors.email = t('externalSignIn.validation.emailRequired');
    if (!password) nextErrors.password = t('externalSignIn.validation.passwordRequired');
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!isLoaded || !isUserLoaded || !isSessionReady || !signIn) {
      setFormError(t('externalSignIn.validation.emailRequired'));
      return;
    }

    if (isBlockedByProvisioningGate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });
      const resultStatus = (result as { status?: string | null }).status;

      if (resultStatus === 'complete') {
        if (isBlockedByProvisioningGate()) {
          return;
        }
        await setActive({ session: result.createdSessionId });
        const redirectPath = await resolvePostAuthRedirect();

        localStorage.removeItem('globalxpress_token');
        localStorage.removeItem('globalxpress_refresh');
        navigate(redirectPath, { replace: true });
      } else if (resultStatus === 'needs_second_factor' || resultStatus === 'needs_client_trust') {
        await signIn.prepareSecondFactor({ strategy: 'email_code' });
        clearErrors();
        setTwoFaCode('');
        setStep('verify-2fa');
      } else {
        setFormError(getErrorMessage(null));
      }
    } catch (error) {
      if (getErrorCode(error) === 'session_exists') {
        await resetExistingSession();
        return;
      }
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 2FA verification ────────────────────────────────────────────────────────

  const handleVerify2fa = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!twoFaCode.trim()) {
      setErrors({ twoFaCode: t('externalSignIn.validation.codeRequired') });
      return;
    }

    if (!isLoaded || !signIn) return;

    if (isBlockedByProvisioningGate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code: twoFaCode.trim(),
      });

      if (result.status === 'complete') {
        if (isBlockedByProvisioningGate()) {
          return;
        }
        await setActive({ session: result.createdSessionId });
        const redirectPath = await resolvePostAuthRedirect();

        localStorage.removeItem('globalxpress_token');
        localStorage.removeItem('globalxpress_refresh');
        navigate(redirectPath, { replace: true });
      } else {
        setFormError(getErrorMessage(null));
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Forgot password: step 1 — email ───────────────────────────────────────

  const handleForgotEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!resetEmail.trim()) {
      setErrors({ resetEmail: t('externalSignIn.validation.emailRequired') });
      return;
    }

    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: resetEmail.trim(),
      });
      setStep('forgot-code');
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Forgot password: step 2 — verify code ─────────────────────────────────

  const handleForgotCodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!resetCode.trim()) {
      setErrors({ resetCode: t('externalSignIn.validation.codeRequired') });
      return;
    }

    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode.trim(),
      });

      if (result.status === 'needs_new_password') {
        clearErrors();
        setStep('forgot-reset');
      } else {
        setFormError(getErrorMessage(null));
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Forgot password: step 3 — new password ────────────────────────────────

  const handleForgotResetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors: Record<string, string> = {};
    if (!newPassword) {
      nextErrors.newPassword = t('externalSignIn.validation.passwordRequired');
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = t('externalSignIn.validation.passwordMinLength');
    }
    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = t('externalSignIn.validation.passwordsDoNotMatch');
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!isLoaded || !signIn) return;

    if (isBlockedByProvisioningGate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn.resetPassword({ password: newPassword });

      if (result.status === 'complete') {
        if (isBlockedByProvisioningGate()) {
          return;
        }
        await setActive({ session: result.createdSessionId });
        const redirectPath = await resolvePostAuthRedirect();
        setPostAuthRedirect(redirectPath);
        setStep('forgot-success');
      } else {
        setFormError(getErrorMessage(null));
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isLoaded || !isUserLoaded || !isSessionReady) {
    return <PageLoader label="Preparing sign in..." />;
  }

  return (
    <AuthLayout>
      <Card className="auth-panel-card p-8 sm:p-10">
        <a
          href={PUBLIC_WEBSITE_URL}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('loginForm.backToHome')}
        </a>
        {/* STEP: Sign in */}
        {step === 'sign-in' && (
          <div>
            {renderSectionHeader(
              t('externalSignIn.title'),
              t('externalSignIn.subtitle')
            )}

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <Input
                label={t('externalSignIn.emailLabel')}
                type="email"
                placeholder={t('externalSignIn.emailPlaceholder')}
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
                error={errors.email}
                className="text-sm placeholder:text-sm"
              />
              <Input
                label={t('externalSignIn.passwordLabel')}
                type="password"
                placeholder={t('externalSignIn.passwordPlaceholder')}
                showPasswordToggle
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearErrors(); }}
                error={errors.password}
                className="text-sm placeholder:text-sm"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { clearErrors(); setResetEmail(email); setStep('forgot-email'); }}
                  className="text-sm font-medium text-brand-500 hover:text-brand-600"
                >
                  {t('externalSignIn.forgotPassword')}
                </button>
              </div>

              <Button
                type="submit"
                className="auth-cta-btn w-full text-sm"
                size="lg"
                isLoading={isSubmitting}
                disabled={!isLoaded || !isSessionReady}
              >
                {t('externalSignIn.signInButton')}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              {t('externalSignIn.noAccount')}{' '}
              <Link to={ROUTES.SIGN_UP} className="font-medium text-brand-500 hover:text-brand-600">
                {t('externalSignIn.signUp')}
              </Link>
            </p>
          </div>
        )}

        {/* STEP: 2FA verification */}
        {step === 'verify-2fa' && (
          <div>
            {renderSectionHeader(
              t('externalSignIn.verifyTitle'),
              t('externalSignIn.verifySubtitle', { email })
            )}

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <form onSubmit={handleVerify2fa} className="space-y-4">
              <Input
                label={t('externalSignIn.verifyCodeLabel')}
                placeholder={t('externalSignIn.verifyCodePlaceholder')}
                value={twoFaCode}
                onChange={(e) => { setTwoFaCode(e.target.value); clearErrors(); }}
                error={errors.twoFaCode}
                className="text-sm placeholder:text-sm"
              />
              <Button
                type="submit"
                className="auth-cta-btn w-full text-sm"
                size="lg"
                isLoading={isSubmitting}
              >
                {t('externalSignIn.verifyButton')}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => { clearErrors(); setStep('sign-in'); }}
              className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {t('externalSignIn.backToSignIn')}
            </button>
          </div>
        )}

        {/* STEP: Forgot password — email */}
        {step === 'forgot-email' && (
          <div>
            {renderSectionHeader(
              t('externalSignIn.forgotTitle'),
              t('externalSignIn.forgotSubtitle')
            )}

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <form onSubmit={handleForgotEmailSubmit} className="space-y-4">
              <Input
                label={t('externalSignIn.emailLabel')}
                type="email"
                placeholder={t('externalSignIn.emailPlaceholder')}
                value={resetEmail}
                onChange={(e) => { setResetEmail(e.target.value); clearErrors(); }}
                error={errors.resetEmail}
                className="text-sm placeholder:text-sm"
              />
              <Button
                type="submit"
                className="auth-cta-btn w-full text-sm"
                size="lg"
                isLoading={isSubmitting}
              >
                {t('externalSignIn.sendResetCode')}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => { clearErrors(); setStep('sign-in'); }}
              className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {t('externalSignIn.backToSignIn')}
            </button>
          </div>
        )}

        {/* STEP: Forgot password — verify code */}
        {step === 'forgot-code' && (
          <div>
            {renderSectionHeader(
              t('externalSignIn.enterResetCode'),
              t('externalSignIn.codeSentTo', { email: resetEmail })
            )}

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <form onSubmit={handleForgotCodeSubmit} className="space-y-4">
              <Input
                label={t('externalSignIn.enterResetCode')}
                placeholder={t('externalSignIn.verifyCode')}
                value={resetCode}
                onChange={(e) => { setResetCode(e.target.value); clearErrors(); }}
                error={errors.resetCode}
                className="text-sm placeholder:text-sm"
              />
              <Button
                type="submit"
                className="auth-cta-btn w-full text-sm"
                size="lg"
                isLoading={isSubmitting}
              >
                {t('externalSignIn.verifyCode')}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => { clearErrors(); setStep('forgot-email'); }}
              className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {t('externalSignIn.back')}
            </button>
          </div>
        )}

        {/* STEP: Forgot password — new password */}
        {step === 'forgot-reset' && (
          <div>
            {renderSectionHeader(
              t('externalSignIn.createNewPassword'),
              t('externalSignIn.passwordRequirement')
            )}

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <form onSubmit={handleForgotResetSubmit} className="space-y-4">
              <Input
                label={t('externalSignIn.newPasswordLabel')}
                type="password"
                placeholder={t('externalSignIn.newPasswordPlaceholder')}
                showPasswordToggle
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); clearErrors(); }}
                error={errors.newPassword}
                className="text-sm placeholder:text-sm"
              />
              <Input
                label={t('externalSignIn.confirmPasswordLabel')}
                type="password"
                placeholder={t('externalSignIn.confirmPasswordPlaceholder')}
                showPasswordToggle
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearErrors(); }}
                error={errors.confirmPassword}
                className="text-sm placeholder:text-sm"
              />
              <Button
                type="submit"
                className="auth-cta-btn w-full text-sm"
                size="lg"
                isLoading={isSubmitting}
              >
                {t('externalSignIn.resetPasswordButton')}
              </Button>
            </form>
          </div>
        )}

        {/* STEP: Forgot password — success */}
        {step === 'forgot-success' && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex justify-center">
              <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
            </div>
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-brand-500" />
            </div>
            <h2 className="text-xl font-semibold text-brand-500 mb-2">{t('externalSignIn.passwordResetSuccess')}</h2>
            <p className="text-sm text-gray-500 mb-6">
              {t('externalSignIn.passwordResetSuccessDesc')}
            </p>
            <Button
              type="button"
              className="auth-cta-btn w-full text-sm"
              size="lg"
              onClick={() => navigate(postAuthRedirect, { replace: true })}
            >
              {t('externalSignIn.continueToDashboard')}
            </Button>
          </div>
        )}
        <ProvisioningGateModal
          isOpen={isProvisioningModalOpen}
          title="Application update in progress"
          message={provisioningModalMessage}
          remainingMs={isProvisioningActive ? remainingMs : 0}
          primaryLabel="I understand"
          secondaryLabel="Close"
          onPrimary={closeProvisioningModal}
          onSecondary={closeProvisioningModal}
        />
      </Card>
    </AuthLayout>
  );
}
