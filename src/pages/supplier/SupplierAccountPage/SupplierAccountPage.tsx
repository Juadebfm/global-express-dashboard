import type { ReactElement } from 'react';
import { UserRound } from 'lucide-react';
import { Card } from '@/components/ui';
import { AvatarUploader } from '@/components/profile';
import { SupplierLayout } from '@/components/supplier/SupplierLayout';
import { useSupplierAuthStore } from '@/store/supplierAuth';

function getInitials(firstName: string, lastName: string, email: string): string {
  const name = `${firstName} ${lastName}`.trim();
  if (name) {
    return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  }
  return email[0]?.toUpperCase() ?? 'GX';
}

export function SupplierAccountPage(): ReactElement {
  const token = useSupplierAuthStore((state) => state.token);
  const user = useSupplierAuthStore((state) => state.user);
  const setAvatarUrl = useSupplierAuthStore((state) => state.setAvatarUrl);
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || 'Supplier';

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
      </div>
    </SupplierLayout>
  );
}
