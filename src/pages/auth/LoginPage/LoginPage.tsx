import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { AuthLayout } from '@/components/layout';
import { LoginForm, type LoginFormData } from '@/components/forms';
import { ProvisioningGateModal } from '@/components/ui';
import { useAuth, useProvisioningGate } from '@/hooks';
import {
  PROVISIONING_GATE_BLOCK_MESSAGE,
  PROVISIONING_GATE_TARGET_UTC,
  ROUTES,
  isProvisioningGateActive,
} from '@/constants';

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { login, isLoading, isAuthenticated, user, error, clearError } = useAuth();
  const { isProvisioningActive, countdownLabel, remainingMs } = useProvisioningGate();
  const [dismissedProvisioningTarget, setDismissedProvisioningTarget] = useState<number | null>(null);

  const isProvisioningModalOpen =
    isProvisioningActive && dismissedProvisioningTarget !== PROVISIONING_GATE_TARGET_UTC;
  const provisioningModalMessage =
    `${PROVISIONING_GATE_BLOCK_MESSAGE}. Estimated unlock in ${countdownLabel}.`;

  // Redirect already-authenticated users to the correct dashboard.
  // Only redirect when we have a resolved role — otherwise the
  // ProtectedRoute on the target page would bounce us back here (loop).
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role) {
      // Staff needing onboarding go to the onboarding page first
      if (user.mustChangePassword || user.mustCompleteProfile) {
        navigate(ROUTES.STAFF_ONBOARDING, { replace: true });
        return;
      }
      // MFA-required role hasn't enrolled yet — funnel into enrollment
      if (user.mustEnrollMfa) {
        navigate(ROUTES.MFA_ENROLL, { replace: true });
        return;
      }
      const dest =
        user.role === 'staff' || user.role === 'admin' || user.role === 'superadmin'
          ? ROUTES.ADMIN_DASHBOARD
          : ROUTES.DASHBOARD;
      navigate(dest, { replace: true });
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // 423 account-lockout — apiClient dispatches `auth:locked` with the
  // backend's `lockedUntil` ISO timestamp. Hold it locally and drive a
  // 1-Hz countdown until the lock elapses.
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const handler = (event: Event): void => {
      const detail = (event as CustomEvent<{ lockedUntil?: string }>).detail;
      const parsed = detail?.lockedUntil ? Date.parse(detail.lockedUntil) : NaN;
      if (Number.isNaN(parsed) || parsed <= Date.now()) return;
      setLockedUntil(parsed);
    };
    window.addEventListener('auth:locked', handler);
    return () => window.removeEventListener('auth:locked', handler);
  }, []);

  useEffect(() => {
    if (lockedUntil === null) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      if (now >= lockedUntil) {
        setLockedUntil(null);
        window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  const lockoutRemainingSec =
    lockedUntil !== null ? Math.max(0, Math.ceil((lockedUntil - nowMs) / 1000)) : 0;
  const isLockedOut = lockoutRemainingSec > 0;
  const lockoutCountdownLabel = isLockedOut
    ? `${Math.floor(lockoutRemainingSec / 60)
        .toString()
        .padStart(2, '0')}:${(lockoutRemainingSec % 60).toString().padStart(2, '0')}`
    : undefined;

  const closeProvisioningModal = (): void => {
    setDismissedProvisioningTarget(PROVISIONING_GATE_TARGET_UTC);
  };

  const reopenProvisioningModal = (): void => {
    setDismissedProvisioningTarget(null);
  };

  const handleSubmit = async (data: LoginFormData): Promise<void> => {
    if (isProvisioningGateActive()) {
      clearError();
      reopenProvisioningModal();
      return;
    }

    // Short-circuit: don't even hit the network while the lockout is active.
    if (isLockedOut) return;

    try {
      const result = await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });
      // Evict any customer Clerk session on this device
      await signOut();

      if (result.kind === 'mfa_required') {
        // mfaToken is short-lived (5 min) and held in router state only —
        // intentionally NOT persisted to storage.
        navigate(ROUTES.MFA_CHALLENGE, {
          state: { mfaToken: result.mfaToken, userId: result.userId },
          replace: true,
        });
        return;
      }
      // result.kind === 'success' → useEffect handles redirect once user lands
    } catch {
      // Error is handled by context
    }
  };

  return (
    <AuthLayout>
      <LoginForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={isProvisioningActive || isLockedOut ? null : error}
        isLockedOut={isLockedOut}
        lockoutCountdownLabel={lockoutCountdownLabel}
      />
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
    </AuthLayout>
  );
}
