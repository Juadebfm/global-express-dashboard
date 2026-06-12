import type { ReactElement } from 'react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Search, Shield, X } from 'lucide-react';
import { useAuditLogs, useDashboardData, useDebounce } from '@/hooks';
import { AppShell, PageHeader } from '@/pages/shared';
import { Pagination } from '@/components/ui';
import { cn } from '@/utils';
import type { AuditLog } from '@/types';

const RESOURCE_TYPES = [
  'order',
  'payment',
  'user',
  'shipment',
  'setting',
  'batch',
  'client',
  'supplier',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function actionTone(action: string): string {
  if (action.includes('approved') || action.includes('login')) return 'green';
  if (action.includes('rejected') || action.includes('delete') || action.includes('remove')) return 'red';
  if (action.includes('update') || action.includes('change')) return 'blue';
  return 'gray';
}

const toneClasses: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-blue-50 text-blue-700',
  gray: 'bg-gray-100 text-gray-600',
};

function ActionBadge({ action }: { action: string }): ReactElement {
  const tone = actionTone(action);
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', toneClasses[tone])}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

function MetadataCell({ metadata }: { metadata: Record<string, unknown> }): ReactElement {
  const entries = Object.entries(metadata).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return <span className="text-gray-400">—</span>;
  return (
    <span className="group relative cursor-default">
      <span className="text-xs text-gray-500 underline decoration-dotted">
        {entries.length} field{entries.length > 1 ? 's' : ''}
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg group-hover:block">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="font-medium text-gray-500">{k}:</span>
            <span className="break-all text-gray-800">{String(v)}</span>
          </div>
        ))}
      </span>
    </span>
  );
}

function LogRow({ log }: { log: AuditLog }): ReactElement {
  return (
    <tr className="transition hover:bg-gray-50">
      <td className="px-5 py-4 align-top">
        <p className="text-xs font-semibold text-gray-800">{formatDate(log.createdAt)}</p>
        <p className="mt-0.5 text-xs text-gray-400 tabular-nums">{formatTime(log.createdAt)}</p>
      </td>
      <td className="px-5 py-4 align-top">
        <ActionBadge action={log.action} />
      </td>
      <td className="px-5 py-4 align-top">
        <p className="text-xs font-medium text-gray-700">{log.resourceType}</p>
        <p className="mt-0.5 font-mono text-[10px] text-gray-400">{log.resourceId.slice(0, 8)}…</p>
      </td>
      <td className="px-5 py-4 align-top">
        <p className="text-xs font-semibold text-gray-800">
          {log.actor.firstName} {log.actor.lastName}
        </p>
        <p className="mt-0.5 text-[10px] capitalize text-gray-400">{log.actor.role}</p>
      </td>
      <td className="px-5 py-4 align-top font-mono text-xs text-gray-500">{log.ipAddress}</td>
      <td className="px-5 py-4 align-top">
        <MetadataCell metadata={log.metadata} />
      </td>
    </tr>
  );
}

export function AuditLogsPage(): ReactElement {
  const { data: dashData, isLoading: dashLoading, error: dashError } = useDashboardData();

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const setPage = (next: number): void => {
    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        if (next <= 1) updated.delete('page');
        else updated.set('page', String(next));
        return updated;
      },
      { replace: true },
    );
  };

  const [actionInput, setActionInput] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const debouncedAction = useDebounce(actionInput, 400);

  const hasFilters = !!(debouncedAction || resourceType || from || to);

  const clearFilters = (): void => {
    setActionInput('');
    setResourceType('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const { data, isLoading, error } = useAuditLogs({
    page,
    limit: 50,
    action: debouncedAction || undefined,
    resourceType: resourceType || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const logs = data?.logs ?? [];
  const pagination = data?.pagination;

  return (
    <AppShell data={dashData} isLoading={dashLoading} error={dashError} loadingLabel="Loading audit logs…">
      <div className="space-y-6">
        <PageHeader
          title="Audit Logs"
          subtitle="A full record of every action taken by staff on this platform."
        />

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-500">
            <Filter className="h-4 w-4" />
            Filter
          </div>

          {/* Action keyword */}
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={actionInput}
              onChange={(e) => { setActionInput(e.target.value); setPage(1); }}
              placeholder="Search action…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-800 outline-none transition focus:border-brand-500"
            />
          </div>

          {/* Resource type */}
          <select
            value={resourceType}
            onChange={(e) => { setResourceType(e.target.value); setPage(1); }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-brand-500"
          >
            <option value="">All resource types</option>
            {RESOURCE_TYPES.map((rt) => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-brand-500"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-brand-500"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200 bg-white">
          {error ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-red-600">{error.message}</p>
            </div>
          ) : isLoading && logs.length === 0 ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4 px-5 py-4">
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
                <Shield className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-gray-700">No log entries found</p>
              <p className="mt-1 text-sm text-gray-400">
                {hasFilters ? 'Try adjusting your filters.' : 'Activity will appear here as it happens.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <tr>
                      <th className="px-5 py-3">Time</th>
                      <th className="px-5 py-3">Action</th>
                      <th className="px-5 py-3">Resource</th>
                      <th className="px-5 py-3">Actor</th>
                      <th className="px-5 py-3">IP</th>
                      <th className="px-5 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <LogRow key={log.id} log={log} />
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="border-t border-gray-100 px-5 py-3">
                  <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    labels={{
                      pageOf: (p, tp) => `Page ${p} of ${tp}`,
                      totalLabel: (count) => `${count} entries`,
                      prev: 'Previous',
                      next: 'Next',
                    }}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
