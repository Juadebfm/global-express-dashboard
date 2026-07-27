import type { ReactElement } from 'react';
import { useState } from 'react';
import { ArrowLeft, BadgeCheck, Eye, EyeOff, MapPin, MessageCircle, Phone, Store } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { AlertBanner, Button, Card, PageLoader } from '@/components/ui';
import {
  useAdminSupplierDirectoryProfile,
  useAuth,
  useUpdateAdminSupplierDirectoryVerification,
} from '@/hooks';
import { ROUTES } from '@/constants';

function verificationLabel(status: string): string {
  return status.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AdminSupplierDirectoryProfilePage(): ReactElement {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = useAdminSupplierDirectoryProfile(supplierId);
  const updateVerification = useUpdateAdminSupplierDirectoryVerification(supplierId);
  const [notice, setNotice] = useState<string | null>(null);

  const layoutUser = {
    displayName: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'Staff',
    email: user?.email ?? '',
    avatarUrl: user?.avatarUrl ?? null,
  };

  const setVerification = async (verificationStatus: 'verified' | 'unverified'): Promise<void> => {
    try {
      await updateVerification.mutate({ verificationStatus });
      setNotice(`Directory profile marked ${verificationStatus}.`);
    } catch {
      setNotice(null);
    }
  };

  return (
    <AppLayout user={layoutUser}>
      <div className="mx-auto max-w-2xl space-y-6">
        <button
          type="button"
          onClick={() => navigate(ROUTES.SUPPLIER_NOTICES)}
          className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to supplier notices
        </button>

        {profile.isLoading && <PageLoader label="Loading directory profile..." />}
        {!profile.isLoading && profile.error && <AlertBanner tone="error" message="Could not load this supplier directory profile." />}
        {notice && <AlertBanner tone="success" message={notice} onClose={() => setNotice(null)} />}
        {updateVerification.error && <AlertBanner tone="error" message={updateVerification.error.message} />}

        {profile.data && (
          <>
            <div className="flex items-start gap-3">
              {profile.data.logoUrl ? (
                <img src={profile.data.logoUrl} alt="" className="h-12 w-12 rounded-xl border border-gray-100 object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Store className="h-5 w-5" /></span>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold text-gray-900">{profile.data.displayName || 'Unnamed supplier'}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500"><MapPin className="h-4 w-4" />{profile.data.city || 'City not provided'}, {profile.data.country || 'Country not provided'}</p>
              </div>
            </div>

            <Card className="space-y-5">
              <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Verification status</p>
                  <p className="mt-1 text-sm text-gray-500">This staff-managed label is displayed to customers. It does not change supplier discoverability.</p>
                </div>
                <span className="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{verificationLabel(profile.data.verificationStatus)}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => void setVerification('verified')} isLoading={updateVerification.isPending} leftIcon={<BadgeCheck className="h-4 w-4" />}>Mark verified</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => void setVerification('unverified')} disabled={updateVerification.isPending}>Mark unverified</Button>
              </div>

              <div className="border-b border-gray-100 pb-5">
                <p className="text-sm font-medium text-gray-900">Directory visibility</p>
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  {profile.data.isDiscoverable ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                  {profile.data.isDiscoverable ? 'Supplier has opted in to customer discovery.' : 'Supplier has not opted in to customer discovery.'}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900">Services</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.data.services.length ? profile.data.services.map((service) => (
                    <span key={service} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{service}</span>
                  )) : <p className="text-sm text-gray-500">No services listed.</p>}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900">Approved public contact channels</p>
                <div className="mt-2 space-y-2 text-sm text-gray-600">
                  {profile.data.publicEmail && <p>{profile.data.publicEmail}</p>}
                  {profile.data.publicPhone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" />{profile.data.publicPhone}</p>}
                  {profile.data.publicWhatsapp && <p className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-gray-400" />{profile.data.publicWhatsapp}</p>}
                  {!profile.data.publicEmail && !profile.data.publicPhone && !profile.data.publicWhatsapp && <p className="text-gray-500">No public contact channels.</p>}
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
