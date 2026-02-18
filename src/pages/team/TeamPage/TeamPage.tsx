import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { ChevronDown, Mail, Search, User, UserPlus, X } from 'lucide-react';
import { useAuth, useDashboardData, useSearch } from '@/hooks';
import { AppShell, PageHeader } from '@/pages/shared';
import {
  mockTeamMembers,
  type TeamMember,
  type TeamPermissions,
  type TeamRole,
} from '@/data/mockTeam';
import { cn } from '@/utils';

type TeamTab = 'all' | 'admin' | 'non-admin';
type ActiveModal = 'invite' | 'edit' | 'profile' | 'remove' | null;

interface TeamFormState {
  fullName: string;
  email: string;
  role: TeamRole;
  permissions: TeamPermissions;
}

const emptyForm: TeamFormState = {
  fullName: '',
  email: '',
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
  const { data, isLoading, error } = useDashboardData();
  const { query, setQuery } = useSearch();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TeamTab>('all');
  const [members, setMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [formState, setFormState] = useState<TeamFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

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
    setFormState({
      fullName: member.fullName,
      email: member.email,
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
    setFormState((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
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

  const handleSave = (): void => {
    if (!formState.fullName.trim() || !formState.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }

    if (activeModal === 'invite') {
      const approvalStatus = formState.role === 'staff' && isAdmin ? 'pending' : 'approved';

      const newMember: TeamMember = {
        id: `team-${Date.now()}`,
        fullName: formState.fullName.trim(),
        email: formState.email.trim().toLowerCase(),
        role: formState.role,
        permissions: { ...formState.permissions },
        approvalStatus,
      };

      setMembers((prev) => [newMember, ...prev]);
      setActiveTab('all');
      closeModal();
      return;
    }

    if (activeModal === 'edit' && selectedMember) {
      setMembers((prev) =>
        prev.map((member) =>
          member.id === selectedMember.id
            ? {
                ...member,
                fullName: formState.fullName.trim(),
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
    setMembers((prev) => prev.filter((member) => member.id !== selectedMember.id));
    closeModal();
  };

  const approveMember = (member: TeamMember): void => {
    setMembers((prev) =>
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
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading team...">
      <div className="space-y-6">
        <PageHeader
          title="Team"
          subtitle="Here are your teams so far"
          actions={
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
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
                  Add team
                </button>
              )}
            </div>
          }
        />

        {!hasAccess ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-lg font-semibold text-gray-800">Access restricted</p>
            <p className="mt-2 text-sm text-gray-500">
              Team management is available to Admin and Super Admin accounts only.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex flex-wrap items-center gap-6 border-b border-gray-100 pb-4">
              {([
                { id: 'all', label: 'All team' },
                { id: 'admin', label: 'Admin' },
                { id: 'non-admin', label: 'Non Admin' },
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
                <p className="text-sm font-semibold text-gray-700">No Admin available to manage</p>
                <p className="mt-1 text-sm text-gray-500">
                  Expand your business by create teams
                </p>
                <button
                  type="button"
                  onClick={openInvite}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-brand-600 shadow-sm"
                >
                  <UserPlus className="h-4 w-4" />
                  Add team
                </button>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Permission</th>
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
                                    Pending approval
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
                                  Approve
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
                                Remove
                              </button>
                            </div>
                            {!canEdit && (
                              <p className="mt-2 text-xs text-gray-400">
                                Requires Super Admin
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
                <h2 className="text-xl font-semibold text-gray-800">View team profile</h2>
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
                    <span className="font-medium">Teammate role</span>
                    <span>{roleLabels[selectedMember.role]}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Permission</span>
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
                    Remove
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
                    Edit
                  </button>
                  {canApproveMember(selectedMember) && (
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            )}

            {(activeModal === 'invite' || activeModal === 'edit') && (
              <div>
                <h2 className="text-center text-xl font-semibold text-gray-800">
                  {activeModal === 'invite' ? 'Invite Team member' : 'Edit Team member'}
                </h2>

                <div className="mt-6 space-y-4">
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formState.fullName}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, fullName: event.target.value }))
                      }
                      placeholder="Enter teammate name"
                      className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-500"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder="Enter teammate email"
                      className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-500"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={formState.role}
                      onChange={(event) => handleRoleChange(event.target.value as TeamRole)}
                      className="w-full appearance-none rounded-2xl border border-gray-200 bg-white py-3 pl-4 pr-10 text-sm text-gray-700 outline-none transition focus:border-brand-500"
                    >
                      {roleOptions.map((option) => (
                        <option key={option} value={option}>
                          {roleLabels[option]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700">Permissions</h3>
                  <div className="mt-3 space-y-3 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Make as an Admin</span>
                      <button
                        type="button"
                        onClick={handleAdminToggle}
                        disabled={!isSuperAdmin}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition',
                          formState.permissions.makeAdmin ? 'bg-brand-500' : 'bg-gray-200',
                          !isSuperAdmin && 'cursor-not-allowed opacity-50'
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
                      <span>Can transfer funds and view</span>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('canTransfer')}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition',
                          formState.permissions.canTransfer ? 'bg-brand-500' : 'bg-gray-200'
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
                      <span>Can view only</span>
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
                        Staff created by Admin require Super Admin approval.
                      </p>
                    )}
                  </div>
                </div>

                {formError && <p className="mt-4 text-sm text-red-500">{formError}</p>}

                <div className="mt-8 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex-1 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {activeModal === 'remove' && selectedMember && (
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-800">Remove user account</h2>
                <p className="mt-4 text-sm text-gray-500">
                  Are you sure you want to remove {selectedMember.fullName}&rsquo;s account?
                  They will lose their access to login back
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
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-200"
                  >
                    Cancel
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

