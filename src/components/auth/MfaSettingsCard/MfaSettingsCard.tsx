import { useRef, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldOff, AlertCircle, Loader2, RefreshCcw } from 'lucide-react';
import { Button, OtpInput } from '@/components/ui';
import { RecoveryCodesPanel } from '../RecoveryCodesPanel';
import {
  useMfaStatus,
  useDisableMfa,
  useRegenerateRecoveryCodes,
} from '@/hooks';
import { ROUTES } from '@/constants';
import type { MfaRecoveryCodesResult } from '@/types';

type ActiveAction = 'idle' | 'disable' | 'regenerate' | 'regenerateCodes';

export function MfaSettingsCard(): ReactElement {
  const navigate = useNavigate();
  const { data: status, isLoading, error } = useMfaStatus();
  const disable = useDisableMfa();
  const regenerate = useRegenerateRecoveryCodes();

  const [action, setAction] = useState<ActiveAction>('idle');
  const [currentPassword, setCurrentPassword] = useState('');
  const [code, setCode] = useState('');
  const [regenResult, setRegenResult] = useState<MfaRecoveryCodesResult | null>(null);
  const disableFormRef = useRef<HTMLFormElement>(null);
  const regenerateFormRef = useRef<HTMLFormElement>(null);

  const reset = (): void => {
    setAction('idle');
    setCurrentPassword('');
    setCode('');
    setRegenResult(null);
  };

  const handleDisable = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (code.length !== 6 || !currentPassword) return;
    try {
      await disable.mutate({ currentPassword, code });
      reset();
    } catch {
      // shown via disable.error
    }
  };

  const handleRegenerate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (code.length !== 6) return;
    try {
      const result = await regenerate.mutate(code);
      setRegenResult(result);
      setAction('regenerateCodes');
      setCode('');
    } catch {
      // shown via regenerate.error
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Couldn't load MFA status.
        </div>
      </div>
    );
  }

  const lowCodes = status.enabled && status.remainingRecoveryCodes <= 2;
  const mustEnroll = status.isRequiredForRole && !status.enabled;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            status.enabled ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
          }`}
        >
          {status.enabled ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">Two-factor authentication</h3>
          <p className="mt-1 text-sm text-gray-600">
            {status.enabled
              ? `Enabled${status.enabledAt ? ` on ${new Date(status.enabledAt).toLocaleDateString()}` : ''}. ${status.remainingRecoveryCodes} recovery code${status.remainingRecoveryCodes === 1 ? '' : 's'} remaining.`
              : mustEnroll
                ? 'Required for your role — set this up now.'
                : 'Add an extra layer of security to your account.'}
          </p>
        </div>
      </div>

      {lowCodes && action === 'idle' && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Only {status.remainingRecoveryCodes} recovery code
            {status.remainingRecoveryCodes === 1 ? '' : 's'} left — regenerate now to avoid lockout.
          </span>
        </div>
      )}

      {action === 'idle' && (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {!status.enabled && (
            <Button
              variant="primary"
              onClick={() => navigate(ROUTES.MFA_ENROLL)}
              className="flex-1"
            >
              Enable MFA
            </Button>
          )}
          {status.enabled && (
            <>
              <Button
                variant="secondary"
                onClick={() => setAction('regenerate')}
                leftIcon={<RefreshCcw className="h-4 w-4" />}
                className="flex-1"
              >
                Regenerate recovery codes
              </Button>
              <Button
                variant="secondary"
                onClick={() => setAction('disable')}
                className="flex-1 text-red-600"
              >
                Disable MFA
              </Button>
            </>
          )}
        </div>
      )}

      {action === 'disable' && (
        <form ref={disableFormRef} onSubmit={handleDisable} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              disabled={disable.isPending}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              6-digit code from authenticator
            </label>
            <OtpInput
              length={6}
              value={code}
              onChange={setCode}
              onComplete={() => disableFormRef.current?.requestSubmit()}
              error={disable.error?.message}
              disabled={disable.isPending}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={reset} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={disable.isPending}
              disabled={code.length !== 6 || !currentPassword}
              className="flex-1"
            >
              Disable MFA
            </Button>
          </div>
        </form>
      )}

      {action === 'regenerate' && (
        <form ref={regenerateFormRef} onSubmit={handleRegenerate} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              6-digit code from authenticator
            </label>
            <OtpInput
              length={6}
              value={code}
              onChange={setCode}
              onComplete={() => regenerateFormRef.current?.requestSubmit()}
              error={regenerate.error?.message}
              disabled={regenerate.isPending}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={reset} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={regenerate.isPending}
              disabled={code.length !== 6}
              className="flex-1"
            >
              Generate new codes
            </Button>
          </div>
        </form>
      )}

      {action === 'regenerateCodes' && regenResult && (
        <div className="mt-5">
          <RecoveryCodesPanel
            codes={regenResult.recoveryCodes}
            warning={regenResult.warning}
            acknowledgeLabel="Done"
            onAcknowledged={reset}
          />
        </div>
      )}
    </div>
  );
}
