import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Smartphone, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AuthLayout } from '@/components/layout';
import { Button, OtpInput } from '@/components/ui';
import { RecoveryCodesPanel } from '@/components/auth';
import {
  useAuth,
  useCan,
  useEnrollMfa,
  useVerifyMfaEnrollment,
  useMfaStatus,
} from '@/hooks';
import { ROUTES } from '@/constants';
import type { MfaEnrollmentSecret, MfaEnrollmentResult } from '@/types';

type Stage = 'intro' | 'scan' | 'verify' | 'codes';

export function MfaEnrollmentPage(): ReactElement {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const isOperator = useCan('app.operator');
  const { data: status, isLoading: statusLoading } = useMfaStatus();
  const { mutate: startEnrollment, isPending: enrolling, error: enrollError } = useEnrollMfa();
  const {
    mutate: verifyEnrollment,
    isPending: verifying,
    error: verifyError,
  } = useVerifyMfaEnrollment();

  const [stage, setStage] = useState<Stage>('intro');
  const [secret, setSecret] = useState<MfaEnrollmentSecret | null>(null);
  const [result, setResult] = useState<MfaEnrollmentResult | null>(null);
  const [code, setCode] = useState('');

  // Already enrolled — bounce to dashboard (skip if we just finished enrollment and are showing codes)
  useEffect(() => {
    if (!statusLoading && status?.enabled && stage !== 'codes') {
      navigate(isOperator ? ROUTES.ADMIN_DASHBOARD : ROUTES.DASHBOARD, { replace: true });
    }
  }, [status, statusLoading, navigate, stage, isOperator]);

  const handleBegin = async (): Promise<void> => {
    try {
      const s = await startEnrollment();
      setSecret(s);
      setStage('scan');
    } catch {
      // surfaced via enrollError below
    }
  };

  const handleVerify = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (code.length !== 6) return;
    try {
      const r = await verifyEnrollment(code);
      setResult(r);
      setStage('codes');
    } catch {
      // surfaced via verifyError below
    }
  };

  const handleDone = async (): Promise<void> => {
    await refreshUser();
    navigate(
      isOperator ? ROUTES.ADMIN_DASHBOARD : ROUTES.DASHBOARD,
      { replace: true },
    );
  };

  const error = (enrollError ?? verifyError) as Error | null;

  return (
    <AuthLayout>
      <div className="mx-auto max-w-lg">
        {stage === 'intro' && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Set up two-factor authentication
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {status?.isRequiredForRole
                  ? 'Your role requires two-factor authentication. Set it up now to keep using your account.'
                  : 'Add an extra layer of security to your account.'}
              </p>
            </div>
            <Button
              variant="primary"
              isLoading={enrolling}
              onClick={handleBegin}
              className="w-full"
            >
              Begin setup
            </Button>
            {error && <p className="text-sm text-red-600">{error.message}</p>}
          </div>
        )}

        {stage === 'scan' && secret && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Smartphone className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Add this account to your authenticator
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Scan the QR code with Google Authenticator, 1Password, Authy, or any TOTP app.
              </p>
            </div>

            {/* QR code */}
            <div className="flex justify-center">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <QRCodeSVG
                  value={secret.otpauthUri}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#111827"
                  level="M"
                />
              </div>
            </div>

            {/* Manual fallback */}
            <details className="group">
              <summary className="cursor-pointer text-center text-sm text-brand-600 hover:underline list-none">
                Can't scan? Enter the code manually
              </summary>
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Setup secret
                </p>
                <p className="break-all font-mono text-sm text-gray-900">{secret.secret}</p>
              </div>
            </details>

            <a
              href={secret.otpauthUri}
              className="block text-center text-sm text-brand-600 hover:underline"
            >
              Or open in authenticator app
            </a>

            <Button variant="primary" onClick={() => setStage('verify')} className="w-full">
              I've added the account
            </Button>
          </div>
        )}

        {stage === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Enter the 6-digit code
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Confirm your authenticator is set up correctly.
              </p>
            </div>
            <OtpInput
              length={6}
              value={code}
              onChange={setCode}
              error={error?.message}
              autoFocus
              disabled={verifying}
            />
            <Button
              type="submit"
              variant="primary"
              isLoading={verifying}
              disabled={code.length !== 6}
              className="w-full"
            >
              Verify and enable
            </Button>
          </form>
        )}

        {stage === 'codes' && result && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Save your recovery codes
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                If you lose access to your authenticator, these codes will let you sign in.
              </p>
            </div>
            <RecoveryCodesPanel
              codes={result.recoveryCodes}
              warning={result.warning}
              acknowledgeLabel="Continue to dashboard"
              onAcknowledged={handleDone}
            />
          </div>
        )}

        {statusLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
