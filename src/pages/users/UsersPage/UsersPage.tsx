import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AppShell, PageHeader } from '@/pages/shared';
import { useAuth, useDashboardData, useSearch } from '@/hooks';
import { mockAppUsers, type AppUser } from '@/data/mockAppUsers';
import { cn } from '@/utils';

const statusLabelMap: Record<AppUser['status'], string> = {
  active: 'Active',
  issue: 'Needs Attention',
  locked: 'Locked',
};

const statusStyleMap: Record<AppUser['status'], string> = {
  active: 'bg-emerald-50 text-emerald-700',
  issue: 'bg-amber-50 text-amber-700',
  locked: 'bg-rose-50 text-rose-700',
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
  const [users, setUsers] = useState<AppUser[]>(mockAppUsers);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const role = user?.role;
  const hasAccess = role === 'admin' || role === 'superadmin';

  useEffect(() => {
    if (!actionMessage) return undefined;
    const timeout = window.setTimeout(() => setActionMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users;
    const needle = query.trim().toLowerCase();
    return users.filter((item) =>
      `${item.fullName} ${item.email} ${statusLabelMap[item.status]}`
        .toLowerCase()
        .includes(needle)
    );
  }, [users, query]);

  const handleRefresh = (userId: string): void => {
    const target = users.find((item) => item.id === userId);
    if (!target) return;
    setActionMessage(`Refreshed ${target.fullName}'s account.`);
  };

  const handleResolve = (userId: string): void => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === userId ? { ...item, status: 'active' } : item
      )
    );
    const target = users.find((item) => item.id === userId);
    setActionMessage(
      target ? `Resolved issue for ${target.fullName}.` : 'Issue resolved.'
    );
  };

  const handleUnlock = (userId: string): void => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === userId ? { ...item, status: 'active' } : item
      )
    );
    const target = users.find((item) => item.id === userId);
    setActionMessage(
      target ? `Unlocked ${target.fullName}'s account.` : 'Account unlocked.'
    );
  };

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading users...">
      <div className="space-y-6">
        <PageHeader
          title="Users"
          subtitle="Support customer accounts, resolve issues, and refresh access."
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
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Active</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredUsers.map((appUser) => (
                    <tr key={appUser.id} className="transition hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        {appUser.fullName}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{appUser.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                            statusStyleMap[appUser.status]
                          )}
                        >
                          {statusLabelMap[appUser.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {formatDate(appUser.lastActive)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleRefresh(appUser.id)}
                            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-brand-500 hover:text-brand-600"
                          >
                            Refresh
                          </button>
                          {appUser.status === 'issue' && (
                            <button
                              type="button"
                              onClick={() => handleResolve(appUser.id)}
                              className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                            >
                              Resolve
                            </button>
                          )}
                          {appUser.status === 'locked' && (
                            <button
                              type="button"
                              onClick={() => handleUnlock(appUser.id)}
                              className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600"
                            >
                              Unlock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500">
                  No users match your search.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
