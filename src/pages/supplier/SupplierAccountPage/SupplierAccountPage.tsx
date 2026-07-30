import type { ReactElement } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { AlertBanner, Card, ConfirmModal } from '@/components/ui';
import { AvatarUploader } from '@/components/profile';
import { SupplierLayout } from '@/components/supplier/SupplierLayout';
import { ROUTES } from '@/constants';
import { deleteMyAccount } from '@/services';
import { useFeedbackStore } from '@/store';
import { useSupplierAuthStore } from '@/store/supplierAuth';

function getInitials(firstName: string, lastName: string, email: string): string {
  const name = `${firstName} ${lastName}`.trim();
  if (name) {
    return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  }
  return email[0]?.toUpperCase() ?? 'GX';
}

export function SupplierAccountPage(): ReactElement {
  const navigate = useNavigate();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const token = useSupplierAuthStore((state) => state.token);
  const user = useSupplierAuthStore((state) => state.user);
  const setAvatarUrl = useSupplierAuthStore((state) => state.setAvatarUrl);
  const clearAuth = useSupplierAuthStore((state) => state.clearAuth);
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || 'Supplier';

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async (): Promise<void> => {
    if (!token) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const result = await deleteMyAccount(token);
      clearAuth();
      pushMessage({ tone: 'success', message: result.message });
      navigate(ROUTES.SUPPLIER_LOGIN, { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SupplierLayout>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Account</h1>
            <p className="mt-0.5 text-sm text-gray-500">Manage your personal account image.</p>
          </div>
        </div>

        <Card className="mx-auto max-w-md p-6">
          <div className="mb-5 text-center">
            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="mt-1 text-sm text-gray-500">{user?.email}</p>
          </div>
          <AvatarUploader
            avatarUrl={user?.avatarUrl ?? null}
            initials={getInitials(user?.firstName ?? '', user?.lastName ?? '', user?.email ?? '')}
            getToken={async () => token}
            onAvatarChanged={setAvatarUrl}
          />
        </Card>

        <Card className="mx-auto max-w-md border-red-200 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-red-700">Delete account</h3>
              <p className="mt-1 text-xs text-gray-500">Deactivate your account and schedule your data for deletion.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete account
            </button>
          </div>
          {deleteError && <div className="mt-4"><AlertBanner tone="error" message={deleteError} /></div>}
          <ConfirmModal
            isOpen={showDeleteConfirm}
            title="Delete account?"
            message="Your account will be deactivated immediately. Your personal data will be permanently deleted after seven days unless you reactivate your account."
            confirmLabel="Delete account"
            cancelLabel="Cancel"
            tone="danger"
            isLoading={isDeleting}
            onConfirm={() => void handleDeleteAccount()}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </Card>
      </div>
    </SupplierLayout>
  );
}
