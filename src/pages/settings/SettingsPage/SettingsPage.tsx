import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { AlertBanner, ConfirmModal } from '@/components/ui';
import {
  useAuth,
  useChangePassword,
  useDashboardData,
  useFxRate,
  useMyNotificationPreferences,
  usePricingRules,
  useRestrictedGoods,
  useSearch,
} from '@/hooks';
import { AppShell, PageHeader } from '@/pages/shared';
import { deleteMyAccount, exportMyAccountData, getOnboardingSettings, updateOnboardingSettings } from '@/services';
import type { ProfileRequirements } from '@/types';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';

/* ── Helpers ─────────────────────────────────────────────────── */

type SettingsTab = 'general' | 'fx' | 'pricing' | 'restricted-goods';

const OPERATOR_TAB_IDS: SettingsTab[] = ['general', 'fx', 'pricing', 'restricted-goods'];

/** Map tab ID → i18n key under `tabs.*` */
const TAB_I18N_KEY: Record<SettingsTab, string> = {
  general: 'tabs.general',
  fx: 'tabs.fx',
  pricing: 'tabs.pricing',
  'restricted-goods': 'tabs.restrictedGoods',
};

/* ── Component ───────────────────────────────────────────────── */

export function SettingsPage(): ReactElement {
  const { t } = useTranslation('settings');
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
      setPasswordSuccess(t('changePassword.successMessage'));
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      // error is on mutation state
    }
  };

  /* ── Onboarding settings (superadmin only) ────────────────── */
  const isSuperadmin = user?.role === 'superadmin';
  const [onboardingReqs, setOnboardingReqs] = useState<ProfileRequirements | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingSaving, setOnboardingSaving] = useState(false);

  useEffect(() => {
    if (!isSuperadmin) return;
    const token = localStorage.getItem('globalxpress_token');
    if (!token) return;
    setOnboardingLoading(true);
    getOnboardingSettings(token)
      .then(setOnboardingReqs)
      .catch(() => setOnboardingError(t('onboarding.failedMessage')))
      .finally(() => setOnboardingLoading(false));
  }, [isSuperadmin, t]);

  const handleToggleNationalId = async (): Promise<void> => {
    const token = localStorage.getItem('globalxpress_token');
    if (!token || !onboardingReqs) return;
    setOnboardingSaving(true);
    try {
      const updated = await updateOnboardingSettings(token, {
        requireNationalId: !onboardingReqs.requireNationalId,
      });
      setOnboardingReqs(updated);
    } catch {
      setOnboardingError(t('onboarding.failedMessage'));
    } finally {
      setOnboardingSaving(false);
    }
  };

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
    { key: 'notifyEmailAlerts', label: t('notificationPreferences.channels.notifyEmailAlerts') },
    { key: 'notifyInAppAlerts', label: t('notificationPreferences.channels.notifyInAppAlerts') },
    { key: 'consentMarketing', label: t('notificationPreferences.channels.consentMarketing') },
  ];

  const renderStatus = (value: boolean): { label: string; className: string } => {
    if (value) return { label: t('notificationPreferences.status.enabled'), className: 'bg-emerald-50 text-emerald-700' };
    return { label: t('notificationPreferences.status.disabled'), className: 'bg-rose-50 text-rose-700' };
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
        downloadError instanceof Error ? downloadError.message : t('accountDataExport.failedMessage')
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
        removeError instanceof Error ? removeError.message : t('deleteAccount.failedMessage')
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel={t('loadingLabel')}>
      <div className="space-y-6">
        <PageHeader
          title={t('pageTitle')}
          subtitle={t('subtitle')}
        />

        {/* ── Operator tab bar (staff see read-only, admin can edit) */}
        {isOperator && (
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
            {OPERATOR_TAB_IDS.map((tabId) => (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition',
                  activeTab === tabId
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t(TAB_I18N_KEY[tabId])}
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
                <h3 className="text-sm font-semibold text-gray-900">{t('changePassword.title')}</h3>
                <p className="mt-1 text-xs text-gray-500">{t('changePassword.subtitle')}</p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="current-pw" className="block text-xs font-medium text-gray-700">
                      {t('changePassword.currentPassword')}
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
                      {t('changePassword.newPassword')}
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
                    {changePasswordMutation.isPending ? t('changePassword.savingButton') : t('changePassword.saveButton')}
                  </button>
                </div>
              </section>
            )}

            {/* Superadmin: Onboarding settings */}
            {isOperator && isSuperadmin && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">{t('onboarding.title')}</h3>
                <p className="mt-1 text-xs text-gray-500">{t('onboarding.subtitle')}</p>

                {onboardingLoading && (
                  <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                    {t('onboarding.loadingText')}
                  </div>
                )}

                {onboardingError && (
                  <div className="mt-4">
                    <AlertBanner tone="error" message={onboardingError} />
                  </div>
                )}

                {!onboardingLoading && !onboardingError && onboardingReqs && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t('onboarding.requireNationalId')}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{t('onboarding.requireNationalIdDescription')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-[11px] font-semibold',
                            onboardingReqs.requireNationalId
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          )}
                        >
                          {onboardingReqs.requireNationalId ? t('onboarding.enabled') : t('onboarding.disabled')}
                        </span>
                        <button
                          type="button"
                          disabled={onboardingSaving}
                          onClick={() => void handleToggleNationalId()}
                          className={cn(
                            'relative h-6 w-11 rounded-full transition',
                            onboardingReqs.requireNationalId ? 'bg-brand-500' : 'bg-gray-200',
                            onboardingSaving && 'cursor-not-allowed opacity-60'
                          )}
                          aria-label="Toggle national ID requirement"
                        >
                          <span
                            className={cn(
                              'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition',
                              onboardingReqs.requireNationalId ? 'left-6' : 'left-1'
                            )}
                          />
                        </button>
                      </div>
                    </div>
                    {onboardingSaving && (
                      <p className="mt-2 text-xs text-gray-500">{t('onboarding.savingText')}</p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Customer sections */}
            {isCustomer && (
              <section className="space-y-6">
                {/* Data export */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{t('accountDataExport.title')}</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {t('accountDataExport.subtitle')}
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
                      {isExporting ? t('accountDataExport.exportingButton') : t('accountDataExport.exportButton')}
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
                      <h3 className="text-sm font-semibold text-red-700">{t('deleteAccount.title')}</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {t('deleteAccount.subtitle')}
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
                      {t('deleteAccount.deleteButton')}
                    </button>
                  </div>
                  {deleteError && (
                    <div className="mt-4">
                      <AlertBanner tone="error" message={deleteError} />
                    </div>
                  )}
                  <ConfirmModal
                    isOpen={showDeleteConfirm}
                    title={t('deleteAccount.modal.title')}
                    message={t('deleteAccount.modal.message')}
                    confirmLabel={t('deleteAccount.modal.confirmLabel')}
                    cancelLabel={t('deleteAccount.modal.cancelLabel')}
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
                      {t('notificationPreferences.title')}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {t('notificationPreferences.subtitle')}
                    </p>
                  </div>

                  <div className="mt-5">
                    {prefsLoading && (
                      <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                        {t('notificationPreferences.loadingText')}
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
                          <p className="text-xs text-gray-500">{t('notificationPreferences.savingText')}</p>
                        )}
                      </div>
                    )}

                    {!prefsLoading && !prefsError && !preferences && (
                      <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                        {t('notificationPreferences.unavailableText')}
                      </div>
                    )}
                  </div>
                </section>
              </section>
            )}
          </>
        )}


        {/* ── FX Rate tab (all operators — read-only) ─────────── */}
        {isOperator && activeTab === 'fx' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">{t('fxRate.title')}</h3>
            <p className="mt-1 text-xs text-gray-500">
              {t('fxRate.subtitle')}
            </p>

            {fxRate.isLoading && (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                {t('fxRate.loadingText')}
              </div>
            )}

            {fxRate.error && (
              <div className="mt-4">
                <AlertBanner
                  tone="error"
                  message={
                    fxRate.error instanceof Error
                      ? fxRate.error.message
                      : t('fxRate.failedMessage')
                  }
                />
              </div>
            )}

            {fxRate.data && (
              <div className="mt-4 space-y-4">
                <SettingsField label={t('fxRate.fields.mode')} value={fxRate.data.mode === 'live' ? t('fxRate.fields.modeLive') : t('fxRate.fields.modeManual')} />
                <SettingsField label={t('fxRate.fields.manualRate')} value={String(fxRate.data.manualRate)} />
                <SettingsField
                  label={t('fxRate.fields.effectiveRate')}
                  value={fxRate.data.effectiveRate != null ? String(fxRate.data.effectiveRate) : t('fxRate.fields.notAvailable')}
                />
              </div>
            )}
          </section>
        )}

        {/* ── Pricing tab (all operators — read-only) ──────────── */}
        {isOperator && activeTab === 'pricing' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">{t('pricing.title')}</h3>
            <p className="mt-1 text-xs text-gray-500">
              {t('pricing.subtitle')}
            </p>

            {pricing.isLoading && (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                {t('pricing.loadingText')}
              </div>
            )}

            {pricing.error && (
              <div className="mt-4">
                <AlertBanner
                  tone="error"
                  message={
                    pricing.error instanceof Error
                      ? pricing.error.message
                      : t('pricing.failedMessage')
                  }
                />
              </div>
            )}

            {pricing.data && pricing.data.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">{t('pricing.table.name')}</th>
                      <th className="px-4 py-3">{t('pricing.table.mode')}</th>
                      <th className="px-4 py-3">{t('pricing.table.rate')}</th>
                      <th className="px-4 py-3">{t('pricing.table.weightRange')}</th>
                      <th className="px-4 py-3">{t('pricing.table.status')}</th>
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
                            {rule.isActive ? t('pricing.statusActive') : t('pricing.statusInactive')}
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
                {t('pricing.emptyText')}
              </div>
            )}
          </section>
        )}

        {/* ── Restricted Goods tab (all operators — read-only) ── */}
        {isOperator && activeTab === 'restricted-goods' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">{t('restrictedGoods.title')}</h3>
            <p className="mt-1 text-xs text-gray-500">
              {t('restrictedGoods.subtitle')}
            </p>

            {restrictedGoods.isLoading && (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                {t('restrictedGoods.loadingText')}
              </div>
            )}

            {restrictedGoods.error && (
              <div className="mt-4">
                <AlertBanner
                  tone="error"
                  message={
                    restrictedGoods.error instanceof Error
                      ? restrictedGoods.error.message
                      : t('restrictedGoods.failedMessage')
                  }
                />
              </div>
            )}

            {restrictedGoods.data && restrictedGoods.data.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">{t('restrictedGoods.table.code')}</th>
                      <th className="px-4 py-3">{t('restrictedGoods.table.nameEn')}</th>
                      <th className="px-4 py-3">{t('restrictedGoods.table.nameKo')}</th>
                      <th className="px-4 py-3">{t('restrictedGoods.table.override')}</th>
                      <th className="px-4 py-3">{t('restrictedGoods.table.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {restrictedGoods.data.map((item) => (
                      <tr key={item.id} className="transition hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{item.code}</td>
                        <td className="px-4 py-3 text-gray-600">{item.nameEn}</td>
                        <td className="px-4 py-3 text-gray-600">{item.nameKo}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {item.allowWithOverride ? t('restrictedGoods.overrideAllowed') : t('restrictedGoods.overrideNo')}
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
                            {item.isActive ? t('restrictedGoods.statusRestricted') : t('restrictedGoods.statusInactive')}
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
                {t('restrictedGoods.emptyText')}
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
