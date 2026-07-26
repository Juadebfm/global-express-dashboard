import type { ChangeEvent, ReactElement } from 'react';
import { useState } from 'react';
import { CheckCircle2, Eye, Store } from 'lucide-react';
import { AlertBanner, Button, Card, Input, PageLoader } from '@/components/ui';
import { SupplierLayout } from '@/components/supplier/SupplierLayout';
import {
  useSupplierDirectoryProfile,
  useUpdateSupplierDirectoryProfile,
} from '@/hooks/useSupplierPortal';
import type { SupplierDirectoryProfile, SupplierDirectoryProfileInput } from '@/types';

function normaliseServices(value: string): string[] {
  return Array.from(new Set(value.split(',').map((service) => service.trim()).filter(Boolean)));
}

function profileIsComplete(profile: SupplierDirectoryProfileInput): boolean {
  return Boolean(
    profile.displayName.trim()
    && profile.country.trim()
    && profile.city.trim()
    && profile.services.length > 0
    && (profile.publicEmail?.trim() || profile.publicPhone?.trim() || profile.publicWhatsapp?.trim()),
  );
}

function ProfileForm({ profile }: { profile: SupplierDirectoryProfile }): ReactElement {
  const [values, setValues] = useState<SupplierDirectoryProfileInput>({
    displayName: profile.displayName ?? '',
    country: profile.country ?? '',
    city: profile.city ?? '',
    services: profile.services ?? [],
    logoUrl: profile.logoUrl ?? '',
    publicEmail: profile.publicEmail ?? '',
    publicPhone: profile.publicPhone ?? '',
    publicWhatsapp: profile.publicWhatsapp ?? '',
    isDiscoverable: profile.isDiscoverable,
  });
  const [servicesText, setServicesText] = useState((profile.services ?? []).join(', '));
  const [notice, setNotice] = useState<string | null>(null);
  const update = useUpdateSupplierDirectoryProfile();
  const isReadyToPublish = profileIsComplete({ ...values, services: normaliseServices(servicesText) });

  const updateField = (field: keyof SupplierDirectoryProfileInput) => (
    event: ChangeEvent<HTMLInputElement>,
  ): void => setValues((current) => ({ ...current, [field]: event.target.value }));

  const handleSave = async (): Promise<void> => {
    const payload: SupplierDirectoryProfileInput = {
      ...values,
      displayName: values.displayName.trim(),
      country: values.country.trim(),
      city: values.city.trim(),
      services: normaliseServices(servicesText),
      logoUrl: values.logoUrl?.trim() || undefined,
      publicEmail: values.publicEmail?.trim() || undefined,
      publicPhone: values.publicPhone?.trim() || undefined,
      publicWhatsapp: values.publicWhatsapp?.trim() || undefined,
    };
    try {
      await update.mutate(payload);
      setValues(payload);
      setServicesText(payload.services.join(', '));
      setNotice('Directory profile saved.');
    } catch {
      setNotice(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Store className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Directory profile</h1>
          <p className="mt-0.5 text-sm text-gray-500">Control how customers find and contact your business.</p>
        </div>
      </div>

      {notice && <AlertBanner tone="success" message={notice} onClose={() => setNotice(null)} />}
      {update.error && <AlertBanner tone="error" message={update.error.message} />}

      <Card className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">Customer visibility</p>
            <p className="mt-0.5">Your profile is listed only when your account is active, you opt in, and all required public details are complete. Staff verification is shown to customers but does not control this setting.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Business name" value={values.displayName} onChange={updateField('displayName')} />
          <Input label="Country" value={values.country} onChange={updateField('country')} />
          <Input label="City" value={values.city} onChange={updateField('city')} />
          <Input label="Logo URL (optional)" value={values.logoUrl ?? ''} onChange={updateField('logoUrl')} />
        </div>

        <div>
          <label htmlFor="supplier-directory-services" className="mb-1.5 block text-sm font-medium text-gray-700">Services</label>
          <input
            id="supplier-directory-services"
            value={servicesText}
            onChange={(event) => setServicesText(event.target.value)}
            placeholder="e.g. Sourcing, Consolidation"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-sm placeholder:text-gray-400 hover:border-gray-400 focus:border-brand-500 focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-gray-500">Separate services with commas. At least one service is required to appear in the directory.</p>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-medium text-gray-900">Public contact channels</p>
          <p className="mt-1 text-xs text-gray-500">Customers can see these only after opening your profile. Add at least one to be discoverable.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Public email" type="email" value={values.publicEmail ?? ''} onChange={updateField('publicEmail')} />
            <Input label="Public phone" type="tel" value={values.publicPhone ?? ''} onChange={updateField('publicPhone')} />
            <Input label="Public WhatsApp" type="tel" value={values.publicWhatsapp ?? ''} onChange={updateField('publicWhatsapp')} />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={values.isDiscoverable}
            onChange={(event) => setValues((current) => ({ ...current, isDiscoverable: event.target.checked }))}
            className="mt-0.5 h-4 w-4 accent-brand-500"
          />
          <span>
            <span className="block text-sm font-medium text-gray-900">Show my business in the customer directory</span>
            <span className="mt-0.5 block text-xs text-gray-500">You can turn this off at any time without deleting your profile.</span>
          </span>
        </label>

        {values.isDiscoverable && !isReadyToPublish && (
          <AlertBanner tone="warning" message="Complete your business name, country, city, at least one service, and one public contact channel before customers can find you." />
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">Staff status: <span className="font-medium text-gray-700">{profile.verificationStatus.replace(/[_-]/g, ' ')}</span></p>
          <Button type="button" onClick={() => void handleSave()} isLoading={update.isPending} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Save profile</Button>
        </div>
      </Card>
    </div>
  );
}

export function SupplierDirectoryProfilePage(): ReactElement {
  const profile = useSupplierDirectoryProfile();
  return (
    <SupplierLayout>
      {profile.isLoading && <PageLoader label="Loading directory profile..." />}
      {!profile.isLoading && profile.error && <AlertBanner tone="error" message="Could not load your directory profile. Please try again." />}
      {!profile.isLoading && profile.data && <ProfileForm profile={profile.data} />}
    </SupplierLayout>
  );
}
