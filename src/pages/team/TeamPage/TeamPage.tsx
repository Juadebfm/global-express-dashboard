import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Lock, Mail, Search, User, UserPlus, X } from 'lucide-react';
import { useAuth, useDashboardData, useSearch, useTeam } from '@/hooks';
import { AppShell, PageHeader } from '@/pages/shared';
import type { TeamMember, TeamPermissions, TeamRole } from '@/types';
import { cn } from '@/utils';
import { useFeedbackStore } from '@/store';

type TeamTab = 'all' | 'admin' | 'non-admin';
type ActiveModal = 'invite' | 'edit' | 'profile' | 'remove' | null;

interface TeamFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: TeamRole;
  permissions: TeamPermissions;
}

const emptyForm: TeamFormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'staff',
  permissions: {
    makeAdmin: false,
    canTransfer: true,
    viewOnly: false,
  },
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
  if (member.role === 'admin' || member.permissions.makeAdmin) {
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

export function TeamPage(): ReactElement {
  const { t } = useTranslation('team');
  const { data, isLoading, error } = useDashboardData();
  const { query, setQuery } = useSearch();
  const { user } = useAuth();
  const { members: apiMembers, isLoading: teamLoading, approveMember: approveApi, inviteMember, isInviting } = useTeam();
  const pushMessage = useFeedbackStore((state) => state.pushMessage);
  const [activeTab, setActiveTab] = useState<TeamTab>('all');
  const [membersOverride, setMembersOverride] = useState<TeamMember[] | null>(null);
  const members = membersOverride ?? apiMembers;
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [formState, setFormState] = useState<TeamFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const updateMembers = (updater: (current: TeamMember[]) => TeamMember[]): void => {
    setMembersOverride((prev) => updater(prev ?? apiMembers));
  };

  const role = user?.role;
  const isSuperAdmin = role === 'superadmin';
  const isAdmin = role === 'admin';
  const hasAccess = isSuperAdmin || isAdmin;

  const roleOptions: TeamRole[] = isSuperAdmin ? ['staff', 'admin', 'superadmin'] : ['staff'];

  const resolvedMembers = useMemo(() => {
    if (!user || user.role !== 'superadmin') return members;
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Super Admin';
    return members.map((member) =>
      member.role === 'superadmin'
        ? { ...member, fullName, email: user.email }
        : member
    );
  }, [members, user]);

  const filteredMembers = useMemo(() => {
    const base = resolvedMembers.filter((member) => {
      if (activeTab === 'admin') {
        return member.role === 'admin' || member.role === 'superadmin';
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
      password: '',
      role: member.role,
      permissions: { ...member.permissions },
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

  const closeModal = (): void => {
    setActiveModal(null);
    setFormError(null);
    setRoleDropdownOpen(false);
  };

  const handleRoleChange = (value: TeamRole): void => {
    setFormState((prev) => ({
      ...prev,
      role: value,
      permissions: {
        ...prev.permissions,
        makeAdmin: value === 'admin' || value === 'superadmin',
      },
    }));
  };

  const handlePermissionToggle = (key: keyof TeamPermissions): void => {
    setFormState((prev) => {
      const next = !prev.permissions[key];

      if (key === 'viewOnly' && next) {
        // viewOnly ON → turn off everything else
        return {
          ...prev,
          permissions: { makeAdmin: false, canTransfer: false, viewOnly: true },
          role: 'staff',
        };
      }

      if (key !== 'viewOnly' && next) {
        // any other permission ON → turn off viewOnly
        return {
          ...prev,
          permissions: { ...prev.permissions, [key]: true, viewOnly: false },
        };
      }

      return {
        ...prev,
        permissions: { ...prev.permissions, [key]: next },
      };
    });
  };

  const handleAdminToggle = (): void => {
    if (!isSuperAdmin) return;
    setFormState((prev) => {
      const makeAdmin = !prev.permissions.makeAdmin;
      return {
        ...prev,
        role: makeAdmin ? 'admin' : 'staff',
        permissions: {
          ...prev.permissions,
          makeAdmin,
        },
      };
    });
  };

  const canEditMember = (member: TeamMember): boolean => {
    if (isSuperAdmin) return true;
    return isAdmin && member.role === 'staff';
  };

  const canRemoveMember = (member: TeamMember): boolean => {
    if (!isSuperAdmin) return false;
    return member.role !== 'superadmin';
  };

  const canApproveMember = (member: TeamMember): boolean =>
    isSuperAdmin && member.approvalStatus === 'pending';

  const handleSave = async (): Promise<void> => {
    if (!formState.firstName.trim() || !formState.email.trim()) {
      setFormError(t('modals.formError'));
      return;
    }

    if (activeModal === 'invite') {
      if (!formState.password.trim()) {
        setFormError(t('modals.formError'));
        return;
      }

      try {
        await inviteMember({
          firstName: formState.firstName.trim(),
          lastName: formState.lastName.trim(),
          email: formState.email.trim().toLowerCase(),
          password: formState.password,
          role: formState.role,
        });
        pushMessage({ tone: 'success', message: t('modals.invite.inviteSuccess') });
        setActiveTab('all');
        closeModal();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('modals.invite.inviteError');
        setFormError(msg);
      }
      return;
    }

    if (activeModal === 'edit' && selectedMember) {
      const fullName = `${formState.firstName.trim()} ${formState.lastName.trim()}`.trim();
      updateMembers((prev) =>
        prev.map((member) =>
          member.id === selectedMember.id
            ? {
                ...member,
                fullName,
                email: formState.email.trim().toLowerCase(),
                role: formState.role,
                permissions: { ...formState.permissions },
              }
            : member
        )
      );
      closeModal();
    }
  };

  const handleRemove = (): void => {
    if (!selectedMember) return;
    updateMembers((prev) => prev.filter((member) => member.id !== selectedMember.id));
    closeModal();
  };

  const approveMember = (member: TeamMember): void => {
    approveApi(member.id);
    updateMembers((prev) =>
      prev.map((item) =>
        item.id === member.id ? { ...item, approvalStatus: 'approved' } : item
      )
    );
  };

  const handleApprove = (): void => {
    if (!selectedMember) return;
    approveMember(selectedMember);
    closeModal();
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
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
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
              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-6 py-4">{t('table.columns.name')}</th>
                      <th className="px-6 py-4">{t('table.columns.email')}</th>
                      <th className="px-6 py-4">{t('table.columns.role')}</th>
                      <th className="px-6 py-4">{t('table.columns.permission')}</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredMembers.map((member) => {
                      const canEdit = canEditMember(member);
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
            )}
          </div>
        )}
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-6 top-6 text-gray-400 transition hover:text-gray-600"
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
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('modals.profile.permission')}</span>
                    <span>{permissionSummary(selectedMember)}</span>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => openRemove(selectedMember)}
                    disabled={!canRemoveMember(selectedMember)}
                    className={cn(
                      'rounded-xl border px-6 py-2.5 text-sm font-semibold',
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
                    disabled={!canEditMember(selectedMember)}
                    className={cn(
                      'rounded-xl px-6 py-2.5 text-sm font-semibold text-white',
                      canEditMember(selectedMember)
                        ? 'bg-brand-500 hover:bg-brand-600'
                        : 'cursor-not-allowed bg-gray-200 text-gray-400'
                    )}
                  >
                    {t('modals.profile.editButton')}
                  </button>
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

            {(activeModal === 'invite' || activeModal === 'edit') && (
              <div>
                <h2 className="text-center text-xl font-semibold text-gray-800">
                  {activeModal === 'invite' ? t('modals.invite.title') : t('modals.edit.title')}
                </h2>

                <div className="mt-6 space-y-4">
                  <div className="flex gap-3">
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
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder={t('modals.invite.emailPlaceholder')}
                      className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-500"
                    />
                  </div>
                  {activeModal === 'invite' && (
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="password"
                        value={formState.password}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, password: event.target.value }))
                        }
                        placeholder={t('modals.invite.passwordPlaceholder')}
                        className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-500"
                      />
                    </div>
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
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700">{t('modals.permissions.sectionTitle')}</h3>
                  <div className="mt-3 space-y-3 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span className={cn(formState.permissions.viewOnly && 'text-gray-400')}>{t('modals.permissions.makeAdmin')}</span>
                      <button
                        type="button"
                        onClick={handleAdminToggle}
                        disabled={!isSuperAdmin || formState.permissions.viewOnly}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition',
                          formState.permissions.makeAdmin ? 'bg-brand-500' : 'bg-gray-200',
                          (!isSuperAdmin || formState.permissions.viewOnly) && 'cursor-not-allowed opacity-50'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition',
                            formState.permissions.makeAdmin ? 'left-6' : 'left-1'
                          )}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={cn(formState.permissions.viewOnly && 'text-gray-400')}>{t('modals.permissions.canTransfer')}</span>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('canTransfer')}
                        disabled={formState.permissions.viewOnly}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition',
                          formState.permissions.canTransfer ? 'bg-brand-500' : 'bg-gray-200',
                          formState.permissions.viewOnly && 'cursor-not-allowed opacity-50'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition',
                            formState.permissions.canTransfer ? 'left-6' : 'left-1'
                          )}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t('modals.permissions.viewOnly')}</span>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('viewOnly')}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition',
                          formState.permissions.viewOnly ? 'bg-brand-500' : 'bg-gray-200'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition',
                            formState.permissions.viewOnly ? 'left-6' : 'left-1'
                          )}
                        />
                      </button>
                    </div>
                    {isAdmin && (
                      <p className="text-xs text-amber-600">
                        {t('modals.permissions.adminApprovalNote')}
                      </p>
                    )}
                  </div>
                </div>

                {formError && <p className="mt-4 text-sm text-red-500">{formError}</p>}

                <div className="mt-8 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isInviting}
                    className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                  >
                    {t('modals.cancelButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isInviting}
                    className="flex-1 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {isInviting ? '...' : t('modals.saveButton')}
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
                <div className="mt-6 flex items-center gap-4 rounded-2xl bg-gray-50 px-4 py-4 text-left">
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
                <div className="mt-8 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={!canRemoveMember(selectedMember)}
                    className={cn(
                      'flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white',
                      canRemoveMember(selectedMember)
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'cursor-not-allowed bg-gray-200 text-gray-400'
                    )}
                  >
                    {t('modals.remove.removeButton')}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-200"
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
