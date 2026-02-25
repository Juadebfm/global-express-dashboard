import type { ReactElement } from 'react';
import { useState } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { AlertBanner } from '@/components/ui';
import { useAuth, useDashboardData, useMyNotificationPreferences, useSearch } from '@/hooks';
import { AppShell, PageHeader, PagePlaceholder, type PlaceholderItem } from '@/pages/shared';
import { deleteMyAccount, exportMyAccountData } from '@/services';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';

const settingsItems: PlaceholderItem[] = [
  {
    id: 'settings-1',
    title: 'Profile & Security',
    subtitle: 'Passwords, 2FA, and access management',
    tag: 'Owner',
  },
  {
    id: 'settings-2',
    title: 'Notifications',
    subtitle: 'Email, SMS, and in-app alerts',
    tag: 'Preferences',
  },
  {
    id: 'settings-3',
    title: 'Billing',
    subtitle: 'Invoices and payment methods',
    tag: 'Finance',
  },
];

export function SettingsPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const {
    preferences,
    isLoading: prefsLoading,
    error: prefsError,
    isSaving: prefsSaving,
    saveError: prefsSaveError,
    updateChannel,
  } = useMyNotificationPreferences();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isCustomer = isClerkSignedIn && !user;

  const channelRows: Array<{
    key: keyof NonNullable<typeof preferences>['channels'];
    label: string;
  }> = [
    { key: 'email', label: 'Email' },
    { key: 'sms', label: 'SMS' },
    { key: 'push', label: 'Push' },
    { key: 'inApp', label: 'In-App' },
    { key: 'whatsapp', label: 'WhatsApp' },
  ];

  const renderStatus = (value: boolean | null): { label: string; className: string } => {
    if (value === true) return { label: 'Enabled', className: 'bg-emerald-50 text-emerald-700' };
    if (value === false) return { label: 'Disabled', className: 'bg-rose-50 text-rose-700' };
    return { label: 'Unknown', className: 'bg-gray-100 text-gray-600' };
  };

  const handleExport = async (): Promise<void> => {
    setExportError(null);
    setIsExporting(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token is missing.');

      const file = await exportMyAccountData(token);
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      if (downloadError instanceof Error) {
        setExportError(downloadError.message);
      } else {
        setExportError('Failed to export account data.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    const shouldDelete = window.confirm(
      'Delete your account? This action is irreversible and you will be signed out.'
    );

    if (!shouldDelete) return;

    setDeleteError(null);
    setIsDeleting(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token is missing.');

      await deleteMyAccount(token);
      localStorage.removeItem('globalxpress_token');
      localStorage.removeItem('globalxpress_refresh');
      await signOut();
      navigate(ROUTES.HOME, { replace: true });
    } catch (removeError) {
      if (removeError instanceof Error) {
        setDeleteError(removeError.message);
      } else {
        setDeleteError('Failed to delete account.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading settings...">
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Configure preferences for your GlobalExpress account."
        />

        {isCustomer && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Account Data Export</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Download a copy of your account data.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleExport()}
                  disabled={isExporting || isDeleting}
                  className={cn(
                    'rounded-xl px-4 py-2 text-sm font-semibold text-white transition',
                    isExporting
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'bg-brand-500 hover:bg-brand-600'
                  )}
                >
                  {isExporting ? 'Exporting...' : 'Export Data'}
                </button>
              </div>
              {exportError && (
                <div className="mt-4">
                  <AlertBanner tone="error" message={exportError} />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-red-700">Delete Account</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Permanently remove your account and sign out.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteAccount()}
                  disabled={isDeleting || isExporting}
                  className={cn(
                    'rounded-xl px-4 py-2 text-sm font-semibold text-white transition',
                    isDeleting
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'bg-red-600 hover:bg-red-700'
                  )}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
              {deleteError && (
                <div className="mt-4">
                  <AlertBanner tone="error" message={deleteError} />
                </div>
              )}
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Notification Preferences</h3>
              <p className="mt-1 text-xs text-gray-500">
                Loaded from your account preferences.
              </p>
            </div>

            <div className="mt-5">
              {prefsLoading && (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                  Loading notification preferences...
                </div>
              )}

              {!prefsLoading && prefsError && (
                <AlertBanner tone="error" message={prefsError} />
              )}
              {!prefsLoading && !prefsError && prefsSaveError && (
                <div className="mt-3">
                  <AlertBanner tone="error" message={prefsSaveError} />
                </div>
              )}

              {!prefsLoading && !prefsError && preferences && (
                <div className="space-y-3">
                  {channelRows.map((row) => {
                    const currentValue = preferences.channels[row.key];
                    const status = renderStatus(currentValue);
                    const nextValue = currentValue !== true;

                    return (
                      <div
                        key={row.key}
                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{row.label}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {status.label}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                          <button
                            type="button"
                            disabled={prefsSaving}
                            onClick={() => void updateChannel(row.key, nextValue)}
                            className={cn(
                              'relative h-6 w-11 rounded-full transition',
                              currentValue === true ? 'bg-brand-500' : 'bg-gray-200',
                              prefsSaving && 'cursor-not-allowed opacity-60'
                            )}
                            aria-label={`Toggle ${row.label} notifications`}
                          >
                            <span
                              className={cn(
                                'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition',
                                currentValue === true ? 'left-6' : 'left-1'
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {prefsSaving && (
                    <p className="text-xs text-gray-500">Saving preferences...</p>
                  )}
                </div>
              )}

              {!prefsLoading && !prefsError && !preferences && (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                  Notification preferences are unavailable.
                </div>
              )}
            </div>
            </section>
          </section>
        )}

        <PagePlaceholder
          title="Settings Modules"
          description="Manage how your account and organization operates."
          items={settingsItems}
          query={query}
          emptyLabel="No settings match your search."
        />
      </div>
    </AppShell>
  );
}
