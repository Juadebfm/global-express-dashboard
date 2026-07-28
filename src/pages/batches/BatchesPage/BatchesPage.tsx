import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, ChevronRight, Package, Plane, Scale, Ship, Users } from 'lucide-react';
import { useAuth, useBatches } from '@/hooks';
import { AppLayout } from '@/components/layout';
import { PageHeader } from '@/pages/shared';
import { Card, Pagination } from '@/components/ui';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';
import type { BatchListItem } from '@/types';

type StatusFilter = 'all' | 'open' | 'closed';
type ModeFilter = 'all' | 'air' | 'sea';

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
];

const MODE_FILTERS: { label: string; value: ModeFilter; icon: ReactElement }[] = [
  { label: 'All modes', value: 'all', icon: <Boxes className="h-3.5 w-3.5" /> },
  { label: 'Air', value: 'air', icon: <Plane className="h-3.5 w-3.5" /> },
  { label: 'Sea', value: 'sea', icon: <Ship className="h-3.5 w-3.5" /> },
];

function statusBadgeClass(status: BatchListItem['status']): string {
  if (status === 'open') return 'bg-emerald-50 text-emerald-700';
  return 'bg-gray-100 text-gray-600';
}

function modeBadgeClass(mode: BatchListItem['transportMode']): string {
  if (mode === 'air') return 'bg-sky-50 text-sky-700';
  return 'bg-indigo-50 text-indigo-700';
}

function ModeBadge({ batch }: { batch: BatchListItem }): ReactElement {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0', modeBadgeClass(batch.transportMode))}>
      {batch.transportMode === 'air' ? <Plane className="h-3 w-3" /> : <Ship className="h-3 w-3" />}
      {batch.transportLabel}
    </span>
  );
}

function StatusBadge({ batch }: { batch: BatchListItem }): ReactElement {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0', statusBadgeClass(batch.status))}>
      {batch.statusLabel}
    </span>
  );
}

// Mobile: card row
function BatchCard({ batch }: { batch: BatchListItem }): ReactElement {
  const detailPath = ROUTES.BATCH_DETAIL.replace(':batchId', batch.id);

  return (
    <Link
      to={detailPath}
      className="block px-4 py-3.5 hover:bg-gray-50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <ModeBadge batch={batch} />
        <p className="font-mono text-sm font-semibold text-gray-900 truncate flex-1 min-w-0">
          {batch.masterTrackingNumber}
        </p>
        <StatusBadge batch={batch} />
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Customers</p>
          <p className="text-xs text-gray-700">{batch.customerCount}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Orders</p>
          <p className="text-xs text-gray-700">{batch.orderCount}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Weight</p>
          <p className="text-xs text-gray-700">{batch.totalWeightKg} kg</p>
        </div>
      </div>
    </Link>
  );
}

export function BatchesPage(): ReactElement {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useBatches({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    transportMode: modeFilter !== 'all' ? modeFilter : undefined,
    page,
    limit: 20,
  });

  const layoutUser = {
    displayName: user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
      : 'Staff',
    email: user?.email ?? '',
    avatarUrl: user?.avatarUrl ?? null,
  };

  return (
    <AppLayout user={layoutUser}>
      <div className="space-y-6">
        <PageHeader
          title="Batches"
          subtitle="Batches are created automatically when orders are verified and priced"
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          {/* Status tabs */}
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  statusFilter === tab.value
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mode filter */}
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
            {MODE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => { setModeFilter(f.value); setPage(1); }}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  modeFilter === f.value
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading && (
          <Card className="divide-y divide-gray-100 overflow-hidden p-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="h-5 w-24 rounded-full bg-gray-100 animate-pulse" />
                <div className="h-4 w-56 rounded bg-gray-100 animate-pulse flex-1" />
                <div className="h-5 w-28 rounded-full bg-gray-100 animate-pulse" />
                <div className="h-4 w-4 rounded bg-gray-100 animate-pulse" />
              </div>
            ))}
          </Card>
        )}

        {!isLoading && error && (
          <Card className="p-8 text-center">
            <p className="text-sm text-red-500">
              {error instanceof Error ? error.message : 'Failed to load batches'}
            </p>
          </Card>
        )}

        {!isLoading && !error && (
          <>
            {(!data?.batches || data.batches.length === 0) ? (
              <Card className="p-12 flex flex-col items-center gap-3 text-center">
                <Boxes className="h-10 w-10 text-gray-300" />
                <p className="font-medium text-gray-700">No batches found</p>
                <p className="text-sm text-gray-400">
                  {statusFilter !== 'all' || modeFilter !== 'all'
                    ? 'Try adjusting the filters above.'
                    : 'Batches are created automatically once orders are verified and priced.'}
                </p>
              </Card>
            ) : (
              <Card className="overflow-hidden p-0">
                {/* Mobile: card list */}
                <div className="divide-y divide-gray-100 md:hidden">
                  {data.batches.map((batch) => (
                    <BatchCard key={batch.id} batch={batch} />
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="whitespace-nowrap border-r border-gray-200 px-6 py-4">Mode</th>
                        <th className="whitespace-nowrap border-r border-gray-200 px-6 py-4">Master Tracking #</th>
                        <th className="whitespace-nowrap border-r border-gray-200 px-6 py-4">Status</th>
                        <th className="whitespace-nowrap border-r border-gray-200 px-6 py-4">
                          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Customers</span>
                        </th>
                        <th className="whitespace-nowrap border-r border-gray-200 px-6 py-4">
                          <span className="inline-flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Orders</span>
                        </th>
                        <th className="whitespace-nowrap px-6 py-4">
                          <span className="inline-flex items-center gap-1.5"><Scale className="h-3.5 w-3.5" /> Total Weight</span>
                        </th>
                        <th className="w-10 px-4 py-4" aria-hidden />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {data.batches.map((batch) => {
                        const detailPath = ROUTES.BATCH_DETAIL.replace(':batchId', batch.id);
                        return (
                          <tr
                            key={batch.id}
                            className="cursor-pointer transition hover:bg-gray-50"
                            onClick={() => navigate(detailPath)}
                          >
                            <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4">
                              <ModeBadge batch={batch} />
                            </td>
                            <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 font-mono font-semibold text-gray-900">
                              {batch.masterTrackingNumber}
                            </td>
                            <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4">
                              <StatusBadge batch={batch} />
                            </td>
                            <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-700">
                              {batch.customerCount}
                            </td>
                            <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-700">
                              {batch.orderCount}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-gray-700">
                              {batch.totalWeightKg} kg
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {data && (
              <div className="mt-4">
                <Pagination
                  page={page}
                  totalPages={data.pagination.totalPages}
                  total={data.pagination.total}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

    </AppLayout>
  );
}
