import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound, Clock } from 'lucide-react';
import { AuthLayout } from '@/components/layout';
import { Button, OtpInput } from '@/components/ui';
import { useAuth, useMfaChallenge } from '@/hooks';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';

const CHALLENGE_TTL_SECONDS = 5 * 60; // 5 minutes — matches MFA_CHALLENGE_EXPIRES_IN_SECONDS

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ChallengeState {
  mfaToken: string;
  userId: string;
}

type Mode = 'totp' | 'recovery';

export function MfaChallengePage(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeMfaChallenge } = useAuth();
  const { verify, recover, isVerifying, isRecovering, verifyError, recoverError } =
    useMfaChallenge();

  const state = location.state as ChallengeState | null;
  const mfaToken = state?.mfaToken;

  const [mode, setMode] = useState<Mode>('totp');
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const verifyFormRef = useRef<HTMLFormElement>(null);

  const [challengeSecondsLeft, setChallengeSecondsLeft] = useState(CHALLENGE_TTL_SECONDS);

  // No mfaToken means the user landed here directly. Bounce back to /login.
  useEffect(() => {
    if (!mfaToken) {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [mfaToken, navigate]);

  // Tick the session countdown every second.
  useEffect(() => {
    if (!mfaToken) return;
    const id = window.setInterval(() => {
      setChallengeSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [mfaToken]);

  // Redirect to login when the challenge JWT expires.
  useEffect(() => {
    if (challengeSecondsLeft === 0) {
      navigate(ROUTES.LOGIN, { replace: true, state: { expiredMfa: true } });
    }
  }, [challengeSecondsLeft, navigate]);

  if (!mfaToken) return <AuthLayout><div /></AuthLayout>;

  const handleVerify = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setFormError(null);
    if (code.length !== 6) {
      setFormError('Enter the 6-digit code from your authenticator app');
      return;
    }
    try {
      const result = await verify({ mfaToken, code });
      completeMfaChallenge({ user: result.user, token: result.token });
      // ProtectedRoute will route based on role
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    } catch {
      // surfaced via verifyError below
    }
  };

  const handleRecover = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setFormError(null);
    const trimmed = recoveryCode.trim();
    if (trimmed.length < 8) {
      setFormError('Enter a valid recovery code');
      return;
    }
    try {
      const result = await recover({ mfaToken, recoveryCode: trimmed });
      completeMfaChallenge({ user: result.user, token: result.tokens.accessToken });
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    } catch {
      // surfaced via recoverError below
    }
  };

  const serverError =
    formError ??
    (verifyError instanceof Error ? verifyError.message : null) ??
    (recoverError instanceof Error ? recoverError.message : null);

  return (
    <AuthLayout>
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            {mode === 'totp' ? <ShieldCheck className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {mode === 'totp' ? 'Verify it’s you' : 'Use a recovery code'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {mode === 'totp'
              ? 'Enter the 6-digit code from your authenticator app to continue.'
              : 'Enter one of the recovery codes you saved when enabling MFA. Each code can only be used once.'}
          </p>
        </div>

        {mode === 'totp' ? (
          <form ref={verifyFormRef} onSubmit={handleVerify} className="space-y-5">
            {/* Session expiry countdown */}
            <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <Clock className={cn(
                'h-4 w-4',
                challengeSecondsLeft <= 30 ? 'text-red-500' : challengeSecondsLeft <= 60 ? 'text-amber-500' : 'text-gray-400',
              )} />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Session expires</p>
                <p className={cn(
                  'text-sm font-semibold tabular-nums',
                  challengeSecondsLeft <= 30 ? 'text-red-600' : challengeSecondsLeft <= 60 ? 'text-amber-600' : 'text-gray-700',
                )}>
                  {formatCountdown(challengeSecondsLeft)}
                </p>
              </div>
            </div>

            <OtpInput
              length={6}
              value={code}
              onChange={setCode}
              onComplete={() => verifyFormRef.current?.requestSubmit()}
              error={serverError ?? undefined}
              autoFocus
              disabled={isVerifying}
            />
            <Button
              type="submit"
              variant="primary"
              isLoading={isVerifying}
              disabled={code.length !== 6}
              className="w-full"
            >
              Verify
            </Button>
            <button
              type="button"
              onClick={() => { setMode('recovery'); setFormError(null); }}
              className="block w-full text-center text-sm text-brand-600 hover:underline"
            >
              Lost your authenticator? Use a recovery code
            </button>
          </form>
        ) : (
          <form onSubmit={handleRecover} className="space-y-5">
            <div>
              <label htmlFor="recovery-code" className="mb-1 block text-sm font-medium text-gray-700">
                Recovery code
              </label>
              <input
                id="recovery-code"
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="XXXXX-XXXXX"
                autoComplete="one-time-code"
                disabled={isRecovering}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-mono text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {serverError && <p className="mt-2 text-sm text-red-600">{serverError}</p>}
            </div>
            <Button
              type="submit"
              variant="primary"
              isLoading={isRecovering}
              disabled={recoveryCode.trim().length < 8}
              className="w-full"
            >
              Use recovery code
            </Button>
            <button
              type="button"
              onClick={() => { setMode('totp'); setFormError(null); }}
              className="block w-full text-center text-sm text-brand-600 hover:underline"
            >
              Back to authenticator code
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
