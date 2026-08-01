import { useMemo, useState, type ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { Search, ShieldCheck, Loader2, Lock } from 'lucide-react';
import {
  useDashboardData,
  usePermissions,
  useSetUserCapability,
  useTeam,
  useUserPermissions,
} from '@/hooks';
import { AppShell, PageHeader } from '@/pages/shared';
import { useFeedbackStore } from '@/store/feedback/feedback.store';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';
import type { Capability, TeamMember } from '@/types';

/**
 * Superadmin capability administration.
 *
 * Gated on `role === 'superadmin'` rather than a capability, because the three
 * backing routes are `requireSuperAdmin` on the backend. This is the only
 * screen where a bare role check is the correct control.
 */

const ROLE_LABEL: Record<string, string> = {
  staff: 'Staff',
  admin: 'Admin',
  superadmin: 'Super Admin',
};

function RoleBadge({ role }: { role: string }): ReactElement {
  const isSuper = role === 'superadmin';
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium',
        isSuper ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-600',
      )}
    >
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

interface CapabilityRowProps {
  capability: Capability;
  disabled: boolean;
  isPending: boolean;
  onToggle: (next: boolean) => void;
}

function CapabilityRow({
  capability,
  disabled,
  isPending,
  onToggle,
}: CapabilityRowProps): ReactElement {
  // `eligible: false` means the target's role sits below the capability's
  // minimumRole — the backend would answer 422, so the control is inert and
  // says why rather than letting the user discover it by failing.
  const blocked = disabled || !capability.eligible;

  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{capability.name}</p>
          {!capability.eligible && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Requires {ROLE_LABEL[capability.minimumRole] ?? capability.minimumRole}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">{capability.description}</p>
        {capability.includes.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {capability.includes.map((item) => (
              <li key={item} className="text-xs text-gray-400">
                • {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={capability.granted}
        aria-label={`${capability.granted ? 'Revoke' : 'Grant'} ${capability.name}`}
        disabled={blocked || isPending}
        onClick={() => onToggle(!capability.granted)}
        className={cn(
          'relative mt-1 h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
          capability.granted ? 'bg-brand-500' : 'bg-gray-200',
          (blocked || isPending) && 'cursor-not-allowed opacity-50',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white transition',
            capability.granted ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}

export function PermissionsPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { isSuperadmin, isReady } = usePermissions();
  const { members, isLoading: teamLoading } = useTeam({ limit: 100 });
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const targetQuery = useUserPermissions(selectedId);
  const setCapability = useSetUserCapability();

  const filtered = useMemo<TeamMember[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(needle) || m.email.toLowerCase().includes(needle),
    );
  }, [members, query]);

  // Wait for the matrix before deciding — redirecting on the loading state
  // would bounce a superadmin off their own page on first paint.
  if (!isReady) {
    return (
      <AppShell data={data} isLoading error={error} loadingLabel="Loading permissions...">
        <div />
      </AppShell>
    );
  }

  if (!isSuperadmin) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />;
  }

  const target = targetQuery.data ?? null;
  const targetIsSuperadmin = target?.role === 'superadmin';

  const handleToggle = async (capability: Capability, next: boolean): Promise<void> => {
    if (!selectedId) return;
    try {
      await setCapability.mutateAsync({
        userId: selectedId,
        capability: capability.key,
        enabled: next,
      });
      pushMessage({
        tone: 'success',
        message: `${next ? 'Granted' : 'Revoked'} ${capability.name}.`,
      });
    } catch (err) {
      pushMessage({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Could not update this capability.',
      });
    }
  };

  return (
    <AppShell
      data={data}
      isLoading={isLoading || teamLoading}
      error={error}
      loadingLabel="Loading permissions..."
    >
      <div className="space-y-6">
        <PageHeader
          title="Permissions"
          subtitle="Grant or revoke capabilities for staff and admin accounts. Super Admins hold every capability implicitly."
        />

        <div className="grid gap-6 lg:h-[calc(100dvh-13rem)] lg:min-h-[32rem] lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* ── Operator list ──────────────────────────────────────────── */}
          <div className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white lg:overflow-hidden">
            <div className="border-b border-gray-100 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name or email"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none transition focus:border-brand-500"
                />
              </div>
            </div>

            <div className="min-h-0 divide-y divide-gray-100 lg:flex-1 lg:overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">
                  No operators match that search.
                </p>
              ) : (
                filtered.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedId(member.id)}
                    className={cn(
                      'flex w-full flex-col items-start gap-1 px-5 py-3 text-left transition-colors',
                      selectedId === member.id ? 'bg-brand-50' : 'hover:bg-gray-50',
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900">
                        {member.fullName}
                      </span>
                      <RoleBadge role={member.role} />
                    </div>
                    <span className="truncate text-xs text-gray-500">{member.email}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Capability matrix ──────────────────────────────────────── */}
          <div className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white lg:overflow-hidden">
            {!selectedId ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center lg:flex-1">
                <ShieldCheck className="h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">
                  Select an operator to review and change their capabilities.
                </p>
              </div>
            ) : targetQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-20 text-sm text-gray-500 lg:flex-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading capabilities...
              </div>
            ) : targetQuery.error ? (
              <div className="px-6 py-20 text-center text-sm text-red-700 lg:flex-1">
                {targetQuery.error instanceof Error
                  ? targetQuery.error.message
                  : 'Could not load this operator&rsquo;s capabilities.'}
              </div>
            ) : target ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {members.find((m) => m.id === selectedId)?.fullName ?? 'Operator'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {target.isActive ? 'Active account' : 'Inactive account'}
                    </p>
                  </div>
                  <RoleBadge role={target.role} />
                </div>

                {targetIsSuperadmin && (
                  <div className="flex items-start gap-2 border-b border-blue-200 bg-blue-50 px-5 py-3">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-blue-800" />
                    <p className="text-sm text-blue-800">
                      Super Admins hold every capability implicitly. Explicit grants cannot be
                      assigned to them.
                    </p>
                  </div>
                )}

                <div className="min-h-0 divide-y divide-gray-100 lg:flex-1 lg:overflow-y-auto">
                  {target.capabilities.map((capability) => (
                    <CapabilityRow
                      key={capability.key}
                      capability={capability}
                      disabled={targetIsSuperadmin}
                      isPending={setCapability.isPending}
                      onToggle={(next) => void handleToggle(capability, next)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
