import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AppShell, PageHeader } from '@/pages/shared';
import { useAuth, useAdminUsers, useUpdateUser, useDashboardData, useSearch } from '@/hooks';
import { cn } from '@/utils';

const roleLabelMap: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
  user: 'Customer',
};

const roleStyleMap: Record<string, string> = {
  superadmin: 'bg-purple-50 text-purple-700',
  admin: 'bg-blue-50 text-blue-700',
  staff: 'bg-amber-50 text-amber-700',
  user: 'bg-gray-100 text-gray-600',
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export function UsersPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query, setQuery } = useSearch();
  const { user } = useAuth();
  const { users: apiUsers, total, isLoading: usersLoading, error: usersError } = useAdminUsers();
  const updateUserMutation = useUpdateUser();

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const role = user?.role;
  const hasAccess = role === 'admin' || role === 'superadmin';

  useEffect(() => {
    if (!actionMessage) return undefined;
    const timeout = window.setTimeout(() => setActionMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return apiUsers;
    const needle = query.trim().toLowerCase();
    return apiUsers.filter((u) =>
      `${u.firstName} ${u.lastName} ${u.email} ${roleLabelMap[u.role] ?? u.role}`
        .toLowerCase()
        .includes(needle)
    );
  }, [apiUsers, query]);

  const handleUnlock = (userId: string): void => {
    const target = apiUsers.find((u) => u.id === userId);
    updateUserMutation.mutate(
      { id: userId, payload: { isActive: true } },
      {
        onSuccess: () => {
          setActionMessage(
            target
              ? `Unlocked ${target.firstName} ${target.lastName}'s account.`
              : 'Account unlocked.'
          );
        },
        onError: () => {
          setActionMessage('Failed to unlock account.');
        },
      }
    );
  };

  return (
    <AppShell
      data={data}
      isLoading={isLoading || usersLoading}
      error={error}
      loadingLabel="Loading users..."
    >
      <div className="space-y-6">
        <PageHeader
          title="Users"
          subtitle={`Manage user accounts across the platform.${total > 0 ? ` ${total} total users.` : ''}`}
          actions={
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search users"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none transition focus:border-brand-500"
                />
              </div>
            </div>
          }
        />

        {usersError && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {usersError}
          </div>
        )}

        {!hasAccess ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-lg font-semibold text-gray-800">Access restricted</p>
            <p className="mt-2 text-sm text-gray-500">
              User management is available to Admin and Super Admin accounts only.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            {actionMessage && (
              <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {actionMessage}
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredUsers.map((appUser) => {
                    const isActive = appUser.isActive !== false;
                    return (
                      <tr key={appUser.id} className="transition hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-gray-800">
                          {appUser.firstName} {appUser.lastName}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{appUser.email}</td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                              roleStyleMap[appUser.role] ?? 'bg-gray-100 text-gray-600'
                            )}
                          >
                            {roleLabelMap[appUser.role] ?? appUser.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                              isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            )}
                          >
                            {isActive ? 'Active' : 'Locked'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {formatDate(appUser.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {!isActive && (
                              <button
                                type="button"
                                onClick={() => handleUnlock(appUser.id)}
                                disabled={updateUserMutation.isPending}
                                className={cn(
                                  'rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600',
                                  updateUserMutation.isPending && 'cursor-not-allowed opacity-60'
                                )}
                              >
                                Unlock
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500">
                  {apiUsers.length === 0 ? 'No users found.' : 'No users match your search.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
