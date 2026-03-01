import type { ReactElement } from 'react';
import { useState } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { AlertBanner, ConfirmModal } from '@/components/ui';
import {
  useAuth,
  useChangePassword,
  useDashboardData,
  useFxRate,
  useLogisticsSettings,
  useMyNotificationPreferences,
  usePricingRules,
  useRestrictedGoods,
  useSearch,
} from '@/hooks';
import { AppShell, PageHeader } from '@/pages/shared';
import { deleteMyAccount, exportMyAccountData } from '@/services';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';

/* ── Helpers ─────────────────────────────────────────────────── */

type SettingsTab = 'general' | 'logistics' | 'fx' | 'pricing' | 'restricted-goods';

const OPERATOR_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'fx', label: 'FX Rate' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'restricted-goods', label: 'Restricted Goods' },
];

/* ── Component ───────────────────────────────────────────────── */

export function SettingsPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  useSearch();
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isCustomer = isClerkSignedIn && !user;
  const isOperator = !!user;

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  /* ── Change password state (operators) ──────────────────────── */
  const changePasswordMutation = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleChangePassword = async (): Promise<void> => {
    setPasswordSuccess(null);
    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      // error is on mutation state
    }
  };

  /* ── Logistics settings (operators: read-only for staff, editable for admin) */
  const logistics = useLogisticsSettings();

  /* ── FX rate (operators: read-only for staff, editable for superadmin) */
  const fxRate = useFxRate();

  /* ── Pricing rules (operators: read-only for staff, editable for admin) */
  const pricing = usePricingRules();

  /* ── Restricted goods (operators: read-only for staff, editable for admin) */
  const restrictedGoods = useRestrictedGoods();

  /* ── Notification channel rows ──────────────────────────────── */
  const channelRows: Array<{
    key: keyof NonNullable<typeof preferences>['channels'];
    label: string;
  }> = [
    { key: 'notifyEmailAlerts', label: 'Email Alerts' },
    { key: 'notifyInAppAlerts', label: 'In-App Alerts' },
    { key: 'consentMarketing', label: 'Marketing Emails' },
  ];

  const renderStatus = (value: boolean): { label: string; className: string } => {
    if (value) return { label: 'Enabled', className: 'bg-emerald-50 text-emerald-700' };
    return { label: 'Disabled', className: 'bg-rose-50 text-rose-700' };
  };

  /* ── Customer actions ───────────────────────────────────────── */
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
      setExportError(
        downloadError instanceof Error ? downloadError.message : 'Failed to export account data.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
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
      setDeleteError(
        removeError instanceof Error ? removeError.message : 'Failed to delete account.'
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading settings...">
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Configure preferences for your GlobalExpress account."
        />

        {/* ── Operator tab bar (staff see read-only, admin can edit) */}
        {isOperator && (
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
            {OPERATOR_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition',
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── General tab ────────────────────────────────────── */}
        {activeTab === 'general' && (
          <>
            {/* Operator: Change password */}
            {isOperator && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>
                <p className="mt-1 text-xs text-gray-500">Update your operator account password.</p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="current-pw" className="block text-xs font-medium text-gray-700">
                      Current Password
                    </label>
                    <input
                      id="current-pw"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-pw" className="block text-xs font-medium text-gray-700">
                      New Password
                    </label>
                    <input
                      id="new-pw"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
                    />
                  </div>
                </div>

                {changePasswordMutation.error instanceof Error && (
                  <div className="mt-3">
                    <AlertBanner tone="error" message={changePasswordMutation.error.message} />
                  </div>
                )}
                {passwordSuccess && (
                  <div className="mt-3">
                    <AlertBanner tone="success" message={passwordSuccess} />
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    disabled={
                      changePasswordMutation.isPending || !currentPassword || !newPassword
                    }
                    onClick={() => void handleChangePassword()}
                    className={cn(
                      'rounded-xl px-4 py-2 text-sm font-semibold text-white transition',
                      changePasswordMutation.isPending || !currentPassword || !newPassword
                        ? 'cursor-not-allowed bg-gray-400'
                        : 'bg-brand-500 hover:bg-brand-600'
                    )}
                  >
                    {changePasswordMutation.isPending ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </section>
            )}

            {/* Customer sections */}
            {isCustomer && (
              <section className="space-y-6">
                {/* Data export */}
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

                {/* Delete account */}
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
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeleting || isExporting}
                      className={cn(
                        'rounded-xl px-4 py-2 text-sm font-semibold text-white transition',
                        isDeleting
                          ? 'cursor-not-allowed bg-gray-400'
                          : 'bg-red-600 hover:bg-red-700'
                      )}
                    >
                      Delete Account
                    </button>
                  </div>
                  {deleteError && (
                    <div className="mt-4">
                      <AlertBanner tone="error" message={deleteError} />
                    </div>
                  )}
                  <ConfirmModal
                    isOpen={showDeleteConfirm}
                    title="Delete Account"
                    message="This action is irreversible. Your account and all associated data will be permanently removed, and you will be signed out."
                    confirmLabel="Delete Account"
                    cancelLabel="Cancel"
                    tone="danger"
                    isLoading={isDeleting}
                    onConfirm={() => void handleDeleteAccount()}
                    onCancel={() => setShowDeleteConfirm(false)}
                  />
                </div>

                {/* Notification preferences */}
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Notification Preferences
                    </h3>
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
                                <p className="mt-1 text-xs text-gray-500">{status.label}</p>
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
          </>
        )}

        {/* ── Logistics tab (all operators — read-only) ─────── */}
        {isOperator && activeTab === 'logistics' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Logistics Settings</h3>
            <p className="mt-1 text-xs text-gray-500">
              Shipping lane, office addresses, and ETA notes.
            </p>

            {logistics.isLoading && (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                Loading logistics settings...
              </div>
            )}

            {logistics.error && (
              <div className="mt-4">
                <AlertBanner
                  tone="error"
                  message={
                    logistics.error instanceof Error
                      ? logistics.error.message
                      : 'Failed to load logistics settings.'
                  }
                />
              </div>
            )}

            {logistics.data && (
              <div className="mt-4 space-y-4">
                <SettingsField label="Shipping Lane" value={logistics.data.lane} />
                <SettingsField label="Korea Office" value={logistics.data.koreaOffice} />
                <SettingsField label="Lagos Office" value={logistics.data.lagosOffice} />
                <SettingsField label="ETA Notes" value={logistics.data.etaNotes} />
              </div>
            )}
          </section>
        )}

        {/* ── FX Rate tab (all operators — read-only) ─────────── */}
        {isOperator && activeTab === 'fx' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">FX Rate Settings</h3>
            <p className="mt-1 text-xs text-gray-500">
              Currency exchange rate configuration.
            </p>

            {fxRate.isLoading && (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                Loading FX rate settings...
              </div>
            )}

            {fxRate.error && (
              <div className="mt-4">
                <AlertBanner
                  tone="error"
                  message={
                    fxRate.error instanceof Error
                      ? fxRate.error.message
                      : 'Failed to load FX rate settings.'
                  }
                />
              </div>
            )}

            {fxRate.data && (
              <div className="mt-4 space-y-4">
                <SettingsField label="Mode" value={fxRate.data.mode === 'live' ? 'Live' : 'Manual'} />
                <SettingsField label="Manual Rate" value={String(fxRate.data.manualRate)} />
                <SettingsField
                  label="Effective Rate"
                  value={fxRate.data.effectiveRate != null ? String(fxRate.data.effectiveRate) : 'N/A'}
                />
              </div>
            )}
          </section>
        )}

        {/* ── Pricing tab (all operators — read-only) ──────────── */}
        {isOperator && activeTab === 'pricing' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Pricing Rules</h3>
            <p className="mt-1 text-xs text-gray-500">
              Active pricing rules for air and sea shipments.
            </p>

            {pricing.isLoading && (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                Loading pricing rules...
              </div>
            )}

            {pricing.error && (
              <div className="mt-4">
                <AlertBanner
                  tone="error"
                  message={
                    pricing.error instanceof Error
                      ? pricing.error.message
                      : 'Failed to load pricing rules.'
                  }
                />
              </div>
            )}

            {pricing.data && pricing.data.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Rate</th>
                      <th className="px-4 py-3">Weight Range</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {pricing.data.map((rule) => (
                      <tr key={rule.id} className="transition hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{rule.name}</td>
                        <td className="px-4 py-3 text-gray-500 capitalize">{rule.mode}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {rule.rateUsdPerKg != null
                            ? `$${rule.rateUsdPerKg}/kg`
                            : rule.flatRateUsdPerCbm != null
                              ? `$${rule.flatRateUsdPerCbm}/cbm`
                              : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {rule.minWeightKg != null || rule.maxWeightKg != null
                            ? `${rule.minWeightKg ?? 0} – ${rule.maxWeightKg ?? '∞'} kg`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              rule.isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                            )}
                          >
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pricing.data && pricing.data.length === 0 && (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
                No pricing rules configured.
              </div>
            )}
          </section>
        )}

        {/* ── Restricted Goods tab (all operators — read-only) ── */}
        {isOperator && activeTab === 'restricted-goods' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Restricted Goods</h3>
            <p className="mt-1 text-xs text-gray-500">
              Items restricted from shipment.
            </p>

            {restrictedGoods.isLoading && (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                Loading restricted goods...
              </div>
            )}

            {restrictedGoods.error && (
              <div className="mt-4">
                <AlertBanner
                  tone="error"
                  message={
                    restrictedGoods.error instanceof Error
                      ? restrictedGoods.error.message
                      : 'Failed to load restricted goods.'
                  }
                />
              </div>
            )}

            {restrictedGoods.data && restrictedGoods.data.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Name (EN)</th>
                      <th className="px-4 py-3">Name (KO)</th>
                      <th className="px-4 py-3">Override</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {restrictedGoods.data.map((item) => (
                      <tr key={item.id} className="transition hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{item.code}</td>
                        <td className="px-4 py-3 text-gray-600">{item.nameEn}</td>
                        <td className="px-4 py-3 text-gray-600">{item.nameKo}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {item.allowWithOverride ? 'Allowed' : 'No'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              item.isActive
                                ? 'bg-red-50 text-red-700'
                                : 'bg-gray-100 text-gray-500'
                            )}
                          >
                            {item.isActive ? 'Restricted' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {restrictedGoods.data && restrictedGoods.data.length === 0 && (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
                No restricted goods configured.
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

/* ── Small read-only field display ────────────────────────────── */

function SettingsField({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="flex items-start justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className="text-sm text-gray-500">{value || '—'}</span>
    </div>
  );
}
