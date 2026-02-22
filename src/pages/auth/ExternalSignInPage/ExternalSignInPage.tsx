import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import { CheckCircle } from 'lucide-react';
import { AuthLayout } from '@/components/layout';
import { Button, Card, Input } from '@/components/ui';
import { ROUTES } from '@/constants';

type Step = 'sign-in' | 'forgot-email' | 'forgot-code' | 'forgot-reset' | 'forgot-success';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'errors' in error) {
    const clerkError = error as { errors?: Array<{ message?: string }> };
    const message = clerkError.errors?.[0]?.message;
    if (message) return message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export function ExternalSignInPage(): ReactElement {
  const navigate = useNavigate();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [step, setStep] = useState<Step>('sign-in');

  // Sign-in fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Forgot password fields
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearErrors = () => {
    setErrors({});
    setFormError(null);
  };

  // ── Sign in ────────────────────────────────────────────────────────────────

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors.email = 'Email is required.';
    if (!password) nextErrors.password = 'Password is required.';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!isLoaded || !signIn) {
      setFormError('Sign in is not ready yet. Please try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate(ROUTES.COMPLETE_PROFILE, { replace: true });
      } else {
        setFormError('Sign in could not be completed. Please try again.');
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
      setErrors({ resetEmail: 'Email is required.' });
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
      setErrors({ resetCode: 'Enter the reset code sent to your email.' });
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
        setFormError('Verification incomplete. Please try again.');
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
      nextErrors.newPassword = 'Password is required.';
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = 'Password must be at least 8 characters.';
    }
    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    try {
      const result = await signIn.resetPassword({ password: newPassword });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        setStep('forgot-success');
      } else {
        setFormError('Password reset could not be completed. Please try again.');
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthLayout>
      <Card className="p-8">
        <div className="flex justify-center mb-6">
          <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
        </div>

        {/* STEP: Sign in */}
        {step === 'sign-in' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
              <p className="mt-1 text-sm text-gray-600">
                Sign in to your customer account.
              </p>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
                error={errors.email}
                className="text-sm placeholder:text-sm"
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
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
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full text-sm"
                size="lg"
                isLoading={isSubmitting}
                disabled={!isLoaded}
              >
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to={ROUTES.SIGN_UP} className="font-medium text-brand-500 hover:text-brand-600">
                Sign up
              </Link>
            </p>
            <p className="mt-3 text-center text-sm text-gray-500">
              Internal staff?{' '}
              <Link to={ROUTES.LOGIN} className="font-medium text-gray-600 hover:text-gray-800">
                Operator login
              </Link>
            </p>
          </div>
        )}

        {/* STEP: Forgot password — email */}
        {step === 'forgot-email' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Forgot password?</h2>
              <p className="mt-1 text-sm text-gray-600">
                Enter your email and we'll send you a reset code.
              </p>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <form onSubmit={handleForgotEmailSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => { setResetEmail(e.target.value); clearErrors(); }}
                error={errors.resetEmail}
                className="text-sm placeholder:text-sm"
              />
              <Button
                type="submit"
                className="w-full text-sm"
                size="lg"
                isLoading={isSubmitting}
              >
                Send reset code
              </Button>
            </form>

            <button
              type="button"
              onClick={() => { clearErrors(); setStep('sign-in'); }}
              className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back to sign in
            </button>
          </div>
        )}

        {/* STEP: Forgot password — verify code */}
        {step === 'forgot-code' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Enter reset code</h2>
              <p className="mt-1 text-sm text-gray-600">
                We sent a code to <span className="font-medium text-gray-800">{resetEmail}</span>.
              </p>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <form onSubmit={handleForgotCodeSubmit} className="space-y-4">
              <Input
                label="Reset code"
                placeholder="Enter code"
                value={resetCode}
                onChange={(e) => { setResetCode(e.target.value); clearErrors(); }}
                error={errors.resetCode}
                className="text-sm placeholder:text-sm"
              />
              <Button
                type="submit"
                className="w-full text-sm"
                size="lg"
                isLoading={isSubmitting}
              >
                Verify code
              </Button>
            </form>

            <button
              type="button"
              onClick={() => { clearErrors(); setStep('forgot-email'); }}
              className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          </div>
        )}

        {/* STEP: Forgot password — new password */}
        {step === 'forgot-reset' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Create new password</h2>
              <p className="mt-1 text-sm text-gray-600">
                Your new password must be at least 8 characters.
              </p>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <form onSubmit={handleForgotResetSubmit} className="space-y-4">
              <Input
                label="New password"
                type="password"
                placeholder="Create a password"
                showPasswordToggle
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); clearErrors(); }}
                error={errors.newPassword}
                className="text-sm placeholder:text-sm"
              />
              <Input
                label="Confirm new password"
                type="password"
                placeholder="Confirm your password"
                showPasswordToggle
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearErrors(); }}
                error={errors.confirmPassword}
                className="text-sm placeholder:text-sm"
              />
              <Button
                type="submit"
                className="w-full text-sm"
                size="lg"
                isLoading={isSubmitting}
              >
                Reset password
              </Button>
            </form>
          </div>
        )}

        {/* STEP: Forgot password — success */}
        {step === 'forgot-success' && (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-brand-500" />
            </div>
            <h2 className="text-xl font-semibold text-brand-500 mb-2">Password reset!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your password has been updated. You're now signed in.
            </p>
            <Button
              type="button"
              className="w-full text-sm"
              size="lg"
              onClick={() => navigate(ROUTES.COMPLETE_PROFILE, { replace: true })}
            >
              Continue to dashboard
            </Button>
          </div>
        )}
      </Card>
    </AuthLayout>
  );
}
