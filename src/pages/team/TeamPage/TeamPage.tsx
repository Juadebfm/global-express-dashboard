import type { ComponentType, ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronDown, KeyRound, Loader2, Mail, Search, User, UserPlus, X } from 'lucide-react';
import type { Country } from 'react-phone-number-input';
import { getCountries, getCountryCallingCode } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import en from 'react-phone-number-input/locale/en';
import {
  useAuth,
  useAuthToken,
  useCan,
  useChangeUserRole,
  useDashboardData,
  usePositions,
  useSearch,
  useTeam,
  useUpdateUser,
} from '@/hooks';
import { AppShell, PageHeader } from '@/pages/shared';
import { Pagination } from '@/components/ui';
import { adminResetPassword, deleteUser } from '@/services';
import { ApiError } from '@/lib/apiClient';
import type { TeamMember, TeamRole } from '@/types';
import { cn } from '@/utils';
import { useFeedbackStore } from '@/store';
import {
  buildE164,
  isPossibleE164,
  type PhoneCountryOption,
} from '@/pages/profile/ProfilePage/internalPhone';

type TeamTab = 'all' | 'admin' | 'non-admin';
type ActiveModal = 'invite' | 'edit' | 'profile' | 'remove' | 'reset-password' | null;

interface TeamFormState {
  firstName: string;
  lastName: string;
  email: string;
  role: TeamRole;
  position: string;
}

const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = getCountries()
  .map((code) => ({
    code,
    name: (en as Record<string, string>)[code] || code,
    dialCode: `+${getCountryCallingCode(code)}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const emptyForm: TeamFormState = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'staff',
  position: '',
};

const roleLabels: Record<TeamRole, string> = {
  staff: 'Staff',
  admin: 'Admin',
  superadmin: 'Super Admin',
};

const matchesQuery = (member: TeamMember, query: string): boolean => {
  if (!query) return true;
  const haystack = [member.fullName, member.email, roleLabels[member.role]]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
};

const permissionSummary = (member: TeamMember): string => {
  if (member.role === 'superadmin') {
    return 'All Access (Owner)';
  }
  if (member.permissions.makeAdmin) {
    return 'Elevated Access';
  }
  const labels: string[] = [];
  if (member.permissions.canTransfer) labels.push('Transfer and view');
  if (member.permissions.viewOnly) labels.push('View Only');
  return labels.length ? labels.join(' / ') : 'Custom';
};

const buildInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
};

interface InvitePhoneFieldProps {
  label: string;
  example: string;
  placeholder: string;
  value: string;
  selectedCountry: PhoneCountryOption;
  onCountryChange: (code: Country) => void;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

function InvitePhoneField({
  label,
  example,
  placeholder,
  value,
  selectedCountry,
  onCountryChange,
  onChange,
  error,
  disabled = false,
}: InvitePhoneFieldProps): ReactElement {
  const FlagIcon = flags[selectedCountry.code] as ComponentType<{
    title?: string;
    className?: string;
  }> | undefined;

  return (
    <div className="w-full">
      <label htmlFor="invite-phone" className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative w-full shrink-0 sm:w-[128px]">
          {FlagIcon && (
            <FlagIcon
              title={selectedCountry.name}
              className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-5 -translate-y-1/2 rounded-sm"
            />
          )}
          <select
            aria-label={`${label} country code`}
            value={selectedCountry.code}
            onChange={(event) => onCountryChange(event.target.value as Country)}
            disabled={disabled}
            className={cn(
              'w-full appearance-none rounded-2xl border bg-white py-3 pl-10 pr-9 text-sm text-transparent outline-none transition focus:ring-2',
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-200 focus:border-brand-500 focus:ring-brand-500',
              disabled && 'cursor-not-allowed bg-gray-50',
            )}
          >
            {PHONE_COUNTRY_OPTIONS.map((country) => (
              <option key={country.code} value={country.code} className="text-gray-900">
                {country.name} ({country.dialCode})
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-sm text-gray-900"
            aria-hidden="true"
          >
            {selectedCountry.dialCode}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-2.5 z-[1] flex items-center">
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </span>
        </div>
        <input
          id="invite-phone"
          type="tel"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'invite-phone-error invite-phone-example' : 'invite-phone-example'}
          className={cn(
            'min-w-0 flex-1 rounded-2xl border bg-white px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:ring-2',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-200 focus:border-brand-500 focus:ring-brand-500',
            disabled && 'cursor-not-allowed bg-gray-50',
          )}
        />
      </div>
      <p id="invite-phone-example" className="mt-1.5 text-xs text-gray-500">
        {example}
      </p>
      {error && (
        <p id="invite-phone-error" className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function TeamPage(): ReactElement {
  const { t } = useTranslation(['team', 'shipments']);
  const { data, isLoading, error } = useDashboardData();
  const { query, setQuery } = useSearch();
  const { user } = useAuth();

  // ?page=N URL state — same shape as the other paginated pages.
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const setPage = (next: number): void => {
    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        if (next <= 1) {
          updated.delete('page');
        } else {
          updated.set('page', String(next));
        }
        return updated;
      },
      { replace: true },
    );
  };

  const {
    members: apiMembers,
    pagination,
    isLoading: teamLoading,
    approveMember: approveApi,
    inviteMember,
    isInviting,
  } = useTeam({ page });
  const pushMessage = useFeedbackStore((state) => state.pushMessage);
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const [isRemoving, setIsRemoving] = useState(false);
  const { positions, isLoading: positionsLoading } = usePositions();
  const updateUserMutation = useUpdateUser();
  const changeRoleMutation = useChangeUserRole();
  const [activeTab, setActiveTab] = useState<TeamTab>('all');
  // All four mutations below (invite/edit/remove/approve) invalidate the
  // ['team'] query on success, so apiMembers is always the fresh source of
  // truth — no local override needed. (A prior version of this page mirrored
  // edits into local state because edit/remove were fake, local-only
  // mutations; that override was never cleared, so it permanently masked
  // fresh data — including brand-new invites — after the first edit/remove.)
  const members = apiMembers;
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [formState, setFormState] = useState<TeamFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [invitePhone, setInvitePhone] = useState('');
  const [invitePhoneCountryCode, setInvitePhoneCountryCode] = useState<Country>('NG');
  const [invitePhoneError, setInvitePhoneError] = useState<string | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [confirmTemporaryPassword, setConfirmTemporaryPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const isSuperAdmin = useCan('app.superadmin');
  const hasAccess = useCan('team.view');
  const isSavingForm = isInviting || updateUserMutation.isPending || changeRoleMutation.isPending;

  const roleOptions: TeamRole[] = isSuperAdmin ? ['staff', 'superadmin'] : ['staff'];
  const selectedInvitePhoneCountry = useMemo(
    () =>
      PHONE_COUNTRY_OPTIONS.find((country) => country.code === invitePhoneCountryCode) ??
      PHONE_COUNTRY_OPTIONS[0],
    [invitePhoneCountryCode],
  );

  const resolvedMembers = useMemo(() => {
    if (!user || user.role !== 'superadmin') return members;
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Super Admin';
    return members.map((member) =>
      member.id === user.id
        ? { ...member, fullName, email: user.email }
        : member
    );
  }, [members, user]);

  const filteredMembers = useMemo(() => {
    const base = resolvedMembers.filter((member) => {
      if (activeTab === 'admin') {
        return member.role === 'superadmin';
      }
      if (activeTab === 'non-admin') {
        return member.role === 'staff';
      }
      return true;
    });

    return base.filter((member) => matchesQuery(member, query.trim()));
  }, [resolvedMembers, activeTab, query]);

  const openInvite = (): void => {
    setFormState(emptyForm);
    setFormError(null);
    setInvitePhone('');
    setInvitePhoneCountryCode('NG');
    setInvitePhoneError(null);
    setSelectedMember(null);
    setActiveModal('invite');
  };

  const openEdit = (member: TeamMember): void => {
    setSelectedMember(member);
    const nameParts = member.fullName.trim().split(' ');
    setFormState({
      firstName: nameParts[0] ?? '',
      lastName: nameParts.slice(1).join(' '),
      email: member.email,
      role: member.role,
      position: member.position ?? '',
    });
    setFormError(null);
    setActiveModal('edit');
  };

  const openProfile = (member: TeamMember): void => {
    setSelectedMember(member);
    setActiveModal('profile');
  };

  const openRemove = (member: TeamMember): void => {
    setSelectedMember(member);
    setActiveModal('remove');
  };

  const openResetPassword = (member: TeamMember): void => {
    setSelectedMember(member);
    setTemporaryPassword('');
    setConfirmTemporaryPassword('');
    setFormError(null);
    setActiveModal('reset-password');
  };

  const closeModal = (): void => {
    setActiveModal(null);
    setFormError(null);
    setInvitePhoneError(null);
    setRoleDropdownOpen(false);
    setTemporaryPassword('');
    setConfirmTemporaryPassword('');
  };

  const handleRoleChange = (value: TeamRole): void => {
    setFormState((prev) => ({ ...prev, role: value }));
  };

  // Only superadmin can reach this page at all (team.view requires
  // app.admin — see src/lib/permissions.ts — and there is no 'admin' role
  // in the backend), so editing has only ever been a superadmin action.
  const canEditMember = (): boolean => isSuperAdmin;

  // Backend is the source of truth for the two real guards (can't delete
  // yourself, can't delete the last active superadmin — both surfaced via
  // handleRemove's error handling). Client-side we only block the obvious
  // self-delete case up front; a superadmin removing another superadmin is
  // legitimate as long as one remains.
  const canRemoveMember = (member: TeamMember): boolean => {
    if (!isSuperAdmin) return false;
    return member.id !== user?.id;
  };

  const canApproveMember = (member: TeamMember): boolean =>
    isSuperAdmin && member.approvalStatus === 'pending';

  // This action is intentionally role-gated rather than capability-gated:
  // the backend exposes the temporary-password route to Superadmins only.
  const canResetMemberPassword = (member: TeamMember): boolean =>
    user?.role === 'superadmin' &&
    member.id !== user.id &&
    (member.role === 'staff' || member.role === 'admin');

  const handleSave = async (): Promise<void> => {
    if (activeModal === 'invite') {
      if (
        !formState.firstName.trim() ||
        !formState.lastName.trim() ||
        !formState.email.trim()
      ) {
        setFormError(t('modals.formError'));
        return;
      }
      if (!invitePhone.trim()) {
        setFormError(null);
        setInvitePhoneError(t('modals.invite.phoneRequired'));
        return;
      }
      if (!isPossibleE164(invitePhone, selectedInvitePhoneCountry)) {
        setFormError(null);
        setInvitePhoneError(t('modals.invite.phoneInvalid'));
        return;
      }

      try {
        await inviteMember({
          firstName: formState.firstName.trim(),
          lastName: formState.lastName.trim(),
          email: formState.email.trim().toLowerCase(),
          phone: buildE164(invitePhone, selectedInvitePhoneCountry),
          role: formState.role === 'superadmin' ? 'superadmin' : 'staff',
          position: formState.position.trim() || undefined,
        });
        pushMessage({ tone: 'success', message: t('modals.invite.inviteSuccess') });
        setActiveTab('all');
        closeModal();
      } catch (err) {
        if (
          err instanceof ApiError &&
          (err.status === 422 ||
            (err.status === 409 &&
              err.problem?.code === 'PHONE_ALREADY_REGISTERED' &&
              err.problem?.field === 'phone')) &&
          err.problem?.detail
        ) {
          setFormError(null);
          setInvitePhoneError(err.problem.detail);
          return;
        }
        const msg = err instanceof Error ? err.message : t('modals.invite.inviteError');
        setFormError(msg);
      }
      return;
    }

    if (
      !formState.firstName.trim() ||
      !formState.lastName.trim() ||
      !formState.email.trim()
    ) {
      setFormError(t('modals.formError'));
      return;
    }

    if (activeModal === 'edit' && selectedMember) {
      const trimmedPosition = formState.position.trim();
      try {
        await updateUserMutation.mutateAsync({
          id: selectedMember.id,
          payload: {
            firstName: formState.firstName.trim(),
            lastName: formState.lastName.trim(),
            position: trimmedPosition || undefined,
          },
        });
        if (formState.role !== selectedMember.role) {
          await changeRoleMutation.mutateAsync({
            id: selectedMember.id,
            payload: { role: formState.role },
          });
        }
        pushMessage({ tone: 'success', message: t('modals.edit.editSuccess') });
        closeModal();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('modals.edit.editError');
        setFormError(msg);
      }
    }
  };

  // Staff/superadmin deletion is immediate and permanent (erased, not the
  // 7-day soft-delete customers/suppliers get) — backend enforces the two
  // 409 cases below (self-delete, last remaining superadmin) and returns
  // its own precise message for both, which we just surface as-is.
  const handleRemove = async (): Promise<void> => {
    if (!selectedMember) return;
    setFormError(null);
    setIsRemoving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const result = await deleteUser(token, selectedMember.id);
      void queryClient.invalidateQueries({ queryKey: ['team'] });
      pushMessage({ tone: 'success', message: result.message });
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('modals.remove.removeError'));
    } finally {
      setIsRemoving(false);
    }
  };

  const approveMember = (member: TeamMember): void => {
    approveApi(member.id);
  };

  const handleApprove = (): void => {
    if (!selectedMember) return;
    approveMember(selectedMember);
    closeModal();
  };

  const handleResetPassword = async (): Promise<void> => {
    if (!selectedMember || !canResetMemberPassword(selectedMember)) return;

    setFormError(null);
    if (temporaryPassword.length < 12) {
      setFormError(t('modals.resetPassword.validation.minLength'));
      return;
    }
    if (temporaryPassword !== confirmTemporaryPassword) {
      setFormError(t('modals.resetPassword.validation.passwordsDoNotMatch'));
      return;
    }

    setIsResettingPassword(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const result = await adminResetPassword(token, selectedMember.id, {
        newPassword: temporaryPassword,
      });
      if (!result.sessionsInvalidated || !result.user.mustChangePassword) {
        throw new Error('The temporary password could not be confirmed. Please try again.');
      }
      pushMessage({
        tone: 'success',
        message: t('modals.resetPassword.success', { name: selectedMember.fullName }),
      });
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('modals.resetPassword.error'));
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <AppShell data={data} isLoading={isLoading || teamLoading} error={error} loadingLabel={t('loadingLabel')}>
      <div className="space-y-6">
        <PageHeader
          title={t('pageTitle')}
          subtitle={t('subtitle')}
          actions={
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none transition focus:border-brand-500"
                />
              </div>
              {hasAccess && (
                <button
                  type="button"
                  onClick={openInvite}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 shadow-sm transition hover:border-brand-500 hover:text-brand-700 whitespace-nowrap"
                >
                  <UserPlus className="h-4 w-4" />
                  {t('addTeamButton')}
                </button>
              )}
            </div>
          }
        />

        {!hasAccess ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-lg font-semibold text-gray-800">{t('accessRestricted.title')}</p>
            <p className="mt-2 text-sm text-gray-500">
              {t('accessRestricted.message')}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-6 border-b border-gray-100 pb-4">
              {([
                { id: 'all', label: t('tabs.all') },
                { id: 'admin', label: t('tabs.admin') },
                { id: 'non-admin', label: t('tabs.nonAdmin') },
              ] as Array<{ id: TeamTab; label: string }>).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative text-sm font-semibold transition',
                    activeTab === tab.id ? 'text-brand-600' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute -bottom-4 left-0 h-0.5 w-full rounded-full bg-brand-500" />
                  )}
                </button>
              ))}
            </div>

            {filteredMembers.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-500">
                  <User className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-gray-700">{t('emptyState.title')}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {t('emptyState.subtitle')}
                </p>
                <button
                  type="button"
                  onClick={openInvite}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-brand-600 shadow-sm"
                >
                  <UserPlus className="h-4 w-4" />
                  {t('addTeamButton')}
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-gray-200">
                  {/* Mobile: card list */}
                  <div className="divide-y divide-gray-100 md:hidden">
                    {filteredMembers.map((member) => {
                      const canEdit = canEditMember();
                      const canRemove = canRemoveMember(member);
                      return (
                        <div
                          key={member.id}
                          className="px-4 py-4"
                          onClick={() => openProfile(member)}
                        >
                          {/* Name + email */}
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
                              {buildInitials(member.fullName)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-gray-800">{member.fullName}</p>
                                {member.approvalStatus === 'pending' && (
                                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
                                    {t('table.pendingApproval')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">{member.email}</p>
                            </div>
                          </div>
                          {/* Role + position + permissions */}
                          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{t('table.columns.role')}</p>
                              <p className="text-xs font-medium text-gray-700">{roleLabels[member.role]}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{t('table.columns.position')}</p>
                              <p className="text-xs text-gray-700">{member.position ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{t('table.columns.permission')}</p>
                              <p className="text-xs text-gray-500">{permissionSummary(member)}</p>
                            </div>
                          </div>
                          {/* Action buttons */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {canApproveMember(member) && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  approveMember(member);
                                }}
                                className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                              >
                                {t('table.approve')}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openRemove(member);
                              }}
                              disabled={!canRemove}
                              className={cn(
                                'rounded-full px-4 py-1.5 text-xs font-semibold transition',
                                canRemove
                                  ? 'bg-red-500 text-white hover:bg-red-600'
                                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
                              )}
                            >
                              {t('table.remove')}
                            </button>
                          </div>
                          {!canEdit && (
                            <p className="mt-1.5 text-xs text-gray-400">
                              {t('table.requiresSuperAdmin')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Desktop: table */}
                  <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-6 py-4">{t('table.columns.name')}</th>
                      <th className="px-6 py-4">{t('table.columns.email')}</th>
                      <th className="px-6 py-4">{t('table.columns.role')}</th>
                      <th className="px-6 py-4">{t('table.columns.position')}</th>
                      <th className="px-6 py-4">{t('table.columns.permission')}</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredMembers.map((member) => {
                      const canEdit = canEditMember();
                      const canRemove = canRemoveMember(member);
                      return (
                        <tr
                          key={member.id}
                          className="transition hover:bg-gray-50"
                          onClick={() => openProfile(member)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
                                {buildInitials(member.fullName)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{member.fullName}</p>
                                {member.approvalStatus === 'pending' && (
                                  <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
                                    {t('table.pendingApproval')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-500">{member.email}</td>
                          <td className="px-6 py-4 font-medium text-gray-700">
                            {roleLabels[member.role]}
                          </td>
                          <td className="px-6 py-4 text-gray-500">{member.position ?? '—'}</td>
                          <td className="px-6 py-4 text-gray-500">{permissionSummary(member)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canApproveMember(member) && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    approveMember(member);
                                  }}
                                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                                >
                                  {t('table.approve')}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openRemove(member);
                                }}
                                disabled={!canRemove}
                                className={cn(
                                  'rounded-full px-4 py-1.5 text-xs font-semibold transition',
                                  canRemove
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'cursor-not-allowed bg-gray-200 text-gray-400'
                                )}
                              >
                                {t('table.remove')}
                              </button>
                            </div>
                            {!canEdit && (
                              <p className="mt-2 text-xs text-gray-400">
                                {t('table.requiresSuperAdmin')}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                  </div>
                </div>
                {pagination.totalPages > 1 && (
                  <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    labels={{
                      pageOf: (p, tp) =>
                        t('shipments:pagination.pageOf', { page: p, totalPages: tp }),
                      totalLabel: (count) =>
                        t('shipments:pagination.total', { count }),
                      prev: t('shipments:pagination.prev'),
                      next: t('shipments:pagination.next'),
                    }}
                    onPageChange={setPage}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-3 py-4 sm:items-center sm:px-4 sm:py-8">
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-4 shadow-xl sm:max-h-[90vh] sm:p-8">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-600 sm:right-6 sm:top-6"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {activeModal === 'profile' && selectedMember && (
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-800">{t('modals.profile.title')}</h2>
                <div className="mt-6 flex flex-col items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-2xl font-semibold text-brand-600">
                    {buildInitials(selectedMember.fullName)}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-800">
                      {selectedMember.fullName}
                    </p>
                    <p className="text-sm text-gray-500">{selectedMember.email}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <span className="font-medium">{t('modals.profile.teammateRole')}</span>
                    <span>{roleLabels[selectedMember.role]}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <span className="font-medium">{t('modals.profile.position')}</span>
                    <span>{selectedMember.position ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('modals.profile.permission')}</span>
                    <span>{permissionSummary(selectedMember)}</span>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
                  <button
                    type="button"
                    onClick={() => openRemove(selectedMember)}
                    disabled={!canRemoveMember(selectedMember)}
                    className={cn(
                      'w-full rounded-xl border px-6 py-2.5 text-sm font-semibold sm:w-auto',
                      canRemoveMember(selectedMember)
                        ? 'border-red-500 text-red-500 hover:bg-red-50'
                        : 'cursor-not-allowed border-gray-200 text-gray-300'
                    )}
                  >
                    {t('modals.profile.removeButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(selectedMember)}
                    disabled={!canEditMember()}
                    className={cn(
                      'w-full rounded-xl px-6 py-2.5 text-sm font-semibold text-white sm:w-auto',
                      canEditMember()
                        ? 'bg-brand-500 hover:bg-brand-600'
                        : 'cursor-not-allowed bg-gray-200 text-gray-400'
                    )}
                  >
                    {t('modals.profile.editButton')}
                  </button>
                  {canResetMemberPassword(selectedMember) && (
                    <button
                      type="button"
                      onClick={() => openResetPassword(selectedMember)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 px-6 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 sm:w-auto"
                    >
                      <KeyRound className="h-4 w-4" />
                      {t('modals.profile.resetPasswordButton')}
                    </button>
                  )}
                  {canApproveMember(selectedMember) && (
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
                    >
                      {t('modals.profile.approveButton')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeModal === 'reset-password' && selectedMember && (
              <div>
                <h2 className="px-8 text-center text-xl font-semibold text-gray-800">
                  {t('modals.resetPassword.title')}
                </h2>
                <p className="mt-4 text-sm leading-6 text-gray-600">
                  {t('modals.resetPassword.message', { name: selectedMember.fullName })}
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="temporary-password" className="mb-1.5 block text-sm font-medium text-gray-700">
                      {t('modals.resetPassword.passwordLabel')}
                    </label>
                    <input
                      id="temporary-password"
                      type="password"
                      autoComplete="new-password"
                      value={temporaryPassword}
                      onChange={(event) => setTemporaryPassword(event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-temporary-password" className="mb-1.5 block text-sm font-medium text-gray-700">
                      {t('modals.resetPassword.confirmPasswordLabel')}
                    </label>
                    <input
                      id="confirm-temporary-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmTemporaryPassword}
                      onChange={(event) => setConfirmTemporaryPassword(event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-brand-500"
                    />
                  </div>
                </div>

                {formError && <p className="mt-4 text-sm text-red-500" role="alert">{formError}</p>}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isResettingPassword}
                    className="w-full flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-200 disabled:opacity-50 sm:w-auto"
                  >
                    {t('modals.cancelButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleResetPassword()}
                    disabled={isResettingPassword}
                    className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 sm:w-auto"
                  >
                    {isResettingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('modals.resetPassword.submitButton')}
                  </button>
                </div>
              </div>
            )}

            {(activeModal === 'invite' || activeModal === 'edit') && (
              <div>
                <h2 className="px-8 text-center text-lg font-semibold text-gray-800 sm:text-xl">
                  {activeModal === 'invite' ? t('modals.invite.title') : t('modals.edit.title')}
                </h2>

                <div className="mt-6 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={formState.firstName}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, firstName: event.target.value }))
                        }
                        placeholder={t('modals.invite.firstNamePlaceholder')}
                        className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-500"
                      />
                    </div>
                    <div className="relative flex-1">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={formState.lastName}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, lastName: event.target.value }))
                        }
                        placeholder={t('modals.invite.lastNamePlaceholder')}
                        className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-500"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={formState.email}
                      disabled={activeModal === 'edit'}
                      title={activeModal === 'edit' ? t('modals.edit.emailLocked') : undefined}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder={t('modals.invite.emailPlaceholder')}
                      className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                  {activeModal === 'invite' && (
                    <InvitePhoneField
                      label={t('modals.invite.phoneLabel')}
                      example={t('modals.invite.phoneExample')}
                      placeholder={t('modals.invite.phonePlaceholder')}
                      value={invitePhone}
                      selectedCountry={selectedInvitePhoneCountry}
                      onCountryChange={(code) => {
                        setInvitePhoneCountryCode(code);
                        setInvitePhoneError(null);
                      }}
                      onChange={(value) => {
                        setInvitePhone(value);
                        setInvitePhoneError(null);
                      }}
                      error={invitePhoneError ?? undefined}
                      disabled={isSavingForm}
                    />
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setRoleDropdownOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white py-3 pl-4 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-500"
                    >
                      <span>{roleLabels[formState.role]}</span>
                      <ChevronDown className={cn('h-4 w-4 text-gray-400 transition', roleDropdownOpen && 'rotate-180')} />
                    </button>
                    {roleDropdownOpen && (
                      <ul className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                        {roleOptions.map((option) => (
                          <li key={option}>
                            <button
                              type="button"
                              onClick={() => {
                                handleRoleChange(option);
                                setRoleDropdownOpen(false);
                              }}
                              className={cn(
                                'flex w-full items-center px-4 py-2.5 text-sm transition hover:bg-brand-50 hover:text-brand-600',
                                formState.role === option
                                  ? 'bg-brand-50 font-semibold text-brand-600'
                                  : 'text-gray-700'
                              )}
                            >
                              {roleLabels[option]}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <PositionSelect
                      value={formState.position}
                      onChange={(next) => setFormState((prev) => ({ ...prev, position: next }))}
                      positions={positions}
                      isLoading={positionsLoading}
                    />
                  </div>
                </div>

                {formError && <p className="mt-4 text-sm text-red-500">{formError}</p>}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSavingForm}
                    className="w-full flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-200 disabled:opacity-50 sm:w-auto"
                  >
                    {t('modals.cancelButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSavingForm}
                    className="w-full flex-1 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 sm:w-auto"
                  >
                    {isSavingForm ? '...' : t('modals.saveButton')}
                  </button>
                </div>
              </div>
            )}

            {activeModal === 'remove' && selectedMember && (
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-800">{t('modals.remove.title')}</h2>
                <p className="mt-4 text-sm text-gray-500">
                  {t('modals.remove.message', { name: selectedMember.fullName })}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-gray-50 px-4 py-4 text-left">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
                    {buildInitials(selectedMember.fullName)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{selectedMember.fullName}</p>
                    <p className="text-sm text-gray-500">{selectedMember.email}</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-500">
                    {permissionSummary(selectedMember)}
                  </span>
                </div>
                {formError && <p className="mt-4 text-sm text-red-500">{formError}</p>}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-4">
                  <button
                    type="button"
                    onClick={() => void handleRemove()}
                    disabled={!canRemoveMember(selectedMember) || isRemoving}
                    className={cn(
                      'w-full flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto',
                      canRemoveMember(selectedMember)
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'cursor-not-allowed bg-gray-200 text-gray-400'
                    )}
                  >
                    {isRemoving ? '...' : t('modals.remove.removeButton')}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isRemoving}
                    className="w-full flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-200 disabled:opacity-50 sm:w-auto"
                  >
                    {t('modals.remove.cancelButton')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

interface PositionSelectProps {
  value: string;
  onChange: (next: string) => void;
  positions: string[];
  isLoading: boolean;
}

// Preset dropdown + free-text "Others" fallback. The preset list comes from
// GET /internal/positions — not a fixed enum, it grows automatically as
// staff type new "Others" values, so this never hardcodes the option list.
const OTHERS_SENTINEL = '__others__';

function PositionSelect({ value, onChange, positions, isLoading }: PositionSelectProps): ReactElement {
  const { t } = useTranslation('team');
  const [othersMode, setOthersMode] = useState<boolean>(
    () => value !== '' && !positions.includes(value),
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <select
          value={othersMode ? OTHERS_SENTINEL : value}
          disabled={isLoading}
          onChange={(event) => {
            const next = event.target.value;
            if (next === OTHERS_SENTINEL) {
              setOthersMode(true);
              onChange('');
              return;
            }
            setOthersMode(false);
            onChange(next);
          }}
          className="w-full appearance-none rounded-2xl border border-gray-200 bg-white py-3 pl-4 pr-10 text-sm text-gray-700 outline-none transition focus:border-brand-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
        >
        <option value="">
          {isLoading ? t('modals.positionLoading') : t('modals.positionPlaceholder')}
        </option>
        {positions.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
        <option value={OTHERS_SENTINEL}>{t('modals.positionOthersOption')}</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
      {othersMode && (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t('modals.positionOthersPlaceholder')}
          autoFocus
          className="w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-gray-700 outline-none transition focus:border-brand-500"
        />
      )}
    </div>
  );
}
