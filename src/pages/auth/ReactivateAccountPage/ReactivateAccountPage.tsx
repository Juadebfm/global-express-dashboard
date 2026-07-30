import type { ReactElement } from 'react';
import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { AuthLayout } from '@/components/layout';
import { Button, Input, Card, OtpInput } from '@/components/ui';
import { ROUTES } from '@/constants';
import { requestAccountReactivationCode, verifyAccountReactivationCode } from '@/services';
import { useFeedbackStore } from '@/store';

type Step = 'email' | 'code';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function ReactivateAccountPage(): ReactElement {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  // Suppliers authenticate separately from customers — remember which sign-in
  // page to link/redirect back to. Defaults to the customer flow since that's
  // the primary entry point; SupplierLoginPage passes ?portal=supplier.
  const isSupplierPortal = searchParams.get('portal') === 'supplier';
  const signInRoute = isSupplierPortal ? ROUTES.SUPPLIER_LOGIN : ROUTES.SIGN_IN;

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedMessage, setRequestedMessage] = useState<string | null>(null);

  const handleRequestCode = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!email.trim()) {
      setError(t('reactivateAccount.emailRequired'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await requestAccountReactivationCode(email.trim());
      setRequestedMessage(result.message);
      setStep('code');
    } catch (err) {
      setError(getErrorMessage(err, t('reactivateAccount.requestFailed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (code.length !== 6) {
      setError(t('reactivateAccount.codeInvalidLength'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await verifyAccountReactivationCode(email.trim(), code);
      pushMessage({ tone: 'success', message: result.message });
      navigate(signInRoute, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, t('reactivateAccount.verifyFailed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="auth-panel-card p-8 sm:p-10">
        <div className="mb-6">
          <div className="mb-4 flex justify-center">
            <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{t('reactivateAccount.title')}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {step === 'email' ? t('reactivateAccount.subtitle') : t('reactivateAccount.codeSubtitle', { email })}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {step === 'code' && requestedMessage && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-700">{requestedMessage}</p>
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={(event) => void handleRequestCode(event)} className="space-y-5">
            <Input
              label={t('reactivateAccount.emailLabel')}
              type="email"
              placeholder={t('reactivateAccount.emailPlaceholder')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
            <Button type="submit" className="auth-cta-btn w-full text-sm" size="lg" isLoading={isSubmitting}>
              {t('reactivateAccount.sendCodeButton')}
            </Button>
          </form>
        ) : (
          <form onSubmit={(event) => void handleVerifyCode(event)} className="space-y-5">
            <OtpInput length={6} value={code} onChange={setCode} disabled={isSubmitting} autoFocus />
            <Button type="submit" className="auth-cta-btn w-full text-sm" size="lg" isLoading={isSubmitting}>
              {t('reactivateAccount.reactivateButton')}
            </Button>
            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setError(null); }}
              className="flex w-full items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('reactivateAccount.back')}
            </button>
          </form>
        )}

        <Link
          to={signInRoute}
          className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('reactivateAccount.backToSignIn')}
        </Link>
      </Card>
    </AuthLayout>
  );
}
