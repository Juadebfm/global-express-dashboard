import { useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Lock, Search, ShieldCheck } from 'lucide-react';
import { Pagination } from '@/components/ui';
import { useSetUserCapability, useTeam, useUserPermissions } from '@/hooks';
import { useFeedbackStore } from '@/store/feedback/feedback.store';
import type { Capability, TeamMember } from '@/types';
import { cn } from '@/utils';

const ACCESS_PAGE_SIZE = 20;

function RoleBadge({ role }: { role: string }): ReactElement {
  const { t } = useTranslation('team');

  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium',
        role === 'superadmin' ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-600',
      )}
    >
      {t(`roleLabels.${role}`, { defaultValue: role })}
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
  const { t } = useTranslation('team');
  const roleIneligible = !capability.eligible;
  const blocked = disabled || roleIneligible;

  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{capability.name}</p>
          {roleIneligible && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              {t('access.requiresRole', {
                role: t(`roleLabels.${capability.minimumRole}`, {
                  defaultValue: capability.minimumRole,
                }),
              })}
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
        aria-label={t('access.toggleLabel', {
          action: t(capability.granted ? 'access.revoke' : 'access.grant'),
          name: capability.name,
        })}
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

interface TeamAccessPanelProps {
  onEditMember: (member: TeamMember) => void;
}

/** Superadmin-only role and capability management within the Team page. */
export function TeamAccessPanel({ onEditMember }: TeamAccessPanelProps): ReactElement {
  const { t } = useTranslation(['team', 'shipments']);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lastToastId = useRef<string | null>(null);
  const pushMessage = useFeedbackStore((state) => state.pushMessage);
  const dismissMessage = useFeedbackStore((state) => state.dismissMessage);
  const trimmedQuery = query.trim();
  const {
    members,
    pagination,
    isLoading: isTeamLoading,
    error: teamError,
  } = useTeam({ q: trimmedQuery || undefined, page, limit: ACCESS_PAGE_SIZE });
  const targetQuery = useUserPermissions(selectedId);
  const setCapability = useSetUserCapability();

  const target = targetQuery.data ?? null;
  const targetMember = members.find((member) => member.id === selectedId) ?? null;
  const targetIsSuperadmin = target?.role === 'superadmin';

  const showAccessMessage = (tone: 'success' | 'error', message: string): void => {
    if (lastToastId.current) dismissMessage(lastToastId.current);
    lastToastId.current = pushMessage({ tone, message, durationMs: 5000 });
  };

  const handleSearchChange = (value: string): void => {
    setQuery(value);
    setPage(1);
    setSelectedId(null);
  };

  const handlePageChange = (nextPage: number): void => {
    setPage(nextPage);
    setSelectedId(null);
  };

  const handleToggle = async (capability: Capability, next: boolean): Promise<void> => {
    if (!selectedId) return;
    try {
      await setCapability.mutateAsync({
        userId: selectedId,
        capability: capability.key,
        enabled: next,
      });
      showAccessMessage(
        'success',
        t(next ? 'access.updatedGranted' : 'access.updatedRevoked', { name: capability.name }),
      );
    } catch (error) {
      showAccessMessage(
        'error',
        error instanceof Error ? error.message : t('access.updateError'),
      );
    }
  };

  return (
    <section aria-labelledby="team-access-heading" className="space-y-3">
      <div>
        <h2 id="team-access-heading" className="text-lg font-semibold text-gray-900">
          {t('access.title')}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{t('access.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:h-[calc(100dvh-15rem)] lg:min-h-[32rem] lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder={t('access.searchPlaceholder')}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="min-h-0 divide-y divide-gray-100 lg:flex-1 lg:overflow-y-auto">
            {isTeamLoading ? (
              <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('access.loadingMembers')}
              </div>
            ) : teamError ? (
              <p className="px-5 py-8 text-center text-sm text-red-700">{teamError}</p>
            ) : members.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">{t('access.emptyMembers')}</p>
            ) : (
              members.map((member) => (
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
                    <span className="truncate text-sm font-semibold text-gray-900">{member.fullName}</span>
                    <RoleBadge role={member.role} />
                  </div>
                  <span className="truncate text-xs text-gray-500">{member.email}</span>
                </button>
              ))
            )}
          </div>

          {!isTeamLoading && !teamError && pagination.totalPages > 1 && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              className="m-3 mt-0 shrink-0"
              labels={{
                pageOf: (currentPage, totalPages) =>
                  t('shipments:pagination.pageOf', { page: currentPage, totalPages }),
                totalLabel: (total) => t('shipments:pagination.total', { count: total }),
                prev: t('shipments:pagination.prev'),
                next: t('shipments:pagination.next'),
              }}
              onPageChange={handlePageChange}
            />
          )}
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center lg:flex-1">
              <ShieldCheck className="h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">{t('access.selectMember')}</p>
            </div>
          ) : targetQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-20 text-sm text-gray-500 lg:flex-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('access.loadingPermissions')}
            </div>
          ) : targetQuery.error ? (
            <div className="px-6 py-20 text-center text-sm text-red-700 lg:flex-1">
              {targetQuery.error instanceof Error
                ? targetQuery.error.message
                : t('access.loadPermissionsError')}
            </div>
          ) : target && targetMember ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{targetMember.fullName}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {target.isActive ? t('access.activeAccount') : t('access.inactiveAccount')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={target.role} />
                  <button
                    type="button"
                    onClick={() => onEditMember(targetMember)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    {t('access.changeRole')}
                  </button>
                </div>
              </div>

              {targetIsSuperadmin && (
                <div className="flex items-start gap-2 border-b border-blue-200 bg-blue-50 px-5 py-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-blue-800" />
                  <p className="text-sm text-blue-800">{t('access.superadminNotice')}</p>
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
          ) : (
            <div className="flex items-center justify-center px-6 py-20 text-center text-sm text-gray-500 lg:flex-1">
              {t('access.memberNotAvailable')}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
