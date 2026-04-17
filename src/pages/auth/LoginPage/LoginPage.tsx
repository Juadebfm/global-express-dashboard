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

    try {
      await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });
      // Evict any customer Clerk session on this device
      await signOut();
      // The useEffect above handles redirect once isAuthenticated + user are set
    } catch {
      // Error is handled by context
    }
  };

  return (
    <AuthLayout>
      <LoginForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={isProvisioningActive ? null : error}
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
