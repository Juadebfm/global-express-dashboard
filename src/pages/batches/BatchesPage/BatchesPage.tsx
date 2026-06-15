import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, ChevronRight, Plane, Ship } from 'lucide-react';
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

function BatchRow({ batch }: { batch: BatchListItem }): ReactElement {
  const detailPath = ROUTES.BATCH_DETAIL.replace(':batchId', batch.id);

  return (
    <Link
      to={detailPath}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group"
    >
      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0', modeBadgeClass(batch.transportMode))}>
        {batch.transportMode === 'air' ? <Plane className="h-3 w-3" /> : <Ship className="h-3 w-3" />}
        {batch.transportLabel}
      </span>
      <p className="font-mono text-sm font-semibold text-gray-900 truncate flex-1 min-w-0">
        {batch.masterTrackingNumber}
      </p>
      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium shrink-0', statusBadgeClass(batch.status))}>
        {batch.statusLabel}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors" />
    </Link>
  );
}

export function BatchesPage(): ReactElement {
  const { user } = useAuth();

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
    avatarUrl: '/images/favicon.svg',
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
              <Card className="divide-y divide-gray-100 overflow-hidden p-0">
                {data.batches.map((batch) => (
                  <BatchRow key={batch.id} batch={batch} />
                ))}
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
