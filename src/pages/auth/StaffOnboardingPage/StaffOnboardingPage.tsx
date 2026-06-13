import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import { AuthLayout } from '@/components/layout';
import { Button, Card, Input } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useAuth } from '@/hooks';
import { changeMyPassword } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

export function StaffOnboardingPage(): ReactElement {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [statusRefreshing, setStatusRefreshing] = useState(false);

  // Redirect if user shouldn't be here
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    // Password change done and account active → dashboard
    if (!user.mustChangePassword && user.isActive !== false) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    }
    // isActive: false → pending approval screen (handled in render)
  }, [authLoading, isAuthenticated, user, navigate]);

  const handleChangePassword = useCallback(async () => {
    setPwError(null);
    const tv = t('staffOnboarding.changePassword.validation', { returnObjects: true }) as Record<string, string>;

    if (!currentPassword) { setPwError(tv.currentRequired); return; }
    if (!newPassword) { setPwError(tv.newRequired); return; }
    if (newPassword.length < 8) { setPwError(tv.newMinLength); return; }
    if (!confirmPassword) { setPwError(tv.confirmRequired); return; }
    if (newPassword !== confirmPassword) { setPwError(tv.passwordsDoNotMatch); return; }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    setPwLoading(true);
    try {
      await changeMyPassword(token, { currentPassword, newPassword });
      await refreshUser();
      // Redirect is handled by the effect above once user state updates
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, t, refreshUser]);

  if (authLoading) return <AuthLayout><div /></AuthLayout>;

  // ── Pending Approval View ─────────────────────────────────────────────────
  if (user && !user.mustChangePassword && user.isActive === false) {
    return (
      <AuthLayout>
        <Card className="auth-panel-card p-8 sm:p-10">
          <div className="flex justify-center mb-6">
            <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
          </div>
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Account pending activation</h2>
              <p className="mt-2 text-sm text-gray-500 max-w-sm">
                Your account is currently pending approval from an administrator.
              </p>
              <p className="mt-3 text-sm text-gray-500 max-w-sm">
                You can close this page and come back once your admin has approved your account.
              </p>
            </div>
            <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 text-left w-full">
              <p className="font-semibold">What happens next?</p>
              <p className="mt-1">An administrator will activate your account. Once activated, this page will automatically redirect you to the dashboard when you log in again.</p>
            </div>
            <Button
              variant="secondary"
              className="mt-2 w-full"
              disabled={statusRefreshing}
              onClick={async () => {
                setStatusRefreshing(true);
                try { await refreshUser(); } finally { setStatusRefreshing(false); }
              }}
            >
              {statusRefreshing
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking…</>
                : <><RefreshCw className="mr-2 h-4 w-4" />Refresh my account status</>
              }
            </Button>
          </div>
        </Card>
      </AuthLayout>
    );
  }

  // ── Change Password View ──────────────────────────────────────────────────
  const cp = 'staffOnboarding.changePassword';
  return (
    <AuthLayout>
      <Card className="auth-panel-card p-8 sm:p-10">
        <div className="flex justify-center mb-6">
          <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">{t(`${cp}.title`)}</h2>
        <p className="mt-1 text-sm text-gray-500">{t(`${cp}.subtitle`)}</p>

        {pwError && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{pwError}</div>
        )}

        <div className="mt-6 space-y-4">
          <div className="relative">
            <Input
              type={showCurrent ? 'text' : 'password'}
              label={t(`${cp}.currentPasswordLabel`)}
              placeholder={t(`${cp}.currentPasswordPlaceholder`)}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <Input
              type={showNew ? 'text' : 'password'}
              label={t(`${cp}.newPasswordLabel`)}
              placeholder={t(`${cp}.newPasswordPlaceholder`)}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              label={t(`${cp}.confirmPasswordLabel`)}
              placeholder={t(`${cp}.confirmPasswordPlaceholder`)}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          className="auth-cta-btn mt-6 w-full"
          onClick={handleChangePassword}
          disabled={pwLoading}
        >
          {pwLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t(`${cp}.submitButton`)}
        </Button>
      </Card>
    </AuthLayout>
  );
}
