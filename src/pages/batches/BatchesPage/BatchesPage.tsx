import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, ChevronRight, Plus, Plane, Ship } from 'lucide-react';
import { useAuth, useBatches, useCreateBatch, useCan } from '@/hooks';
import { AppLayout } from '@/components/layout';
import { PageHeader } from '@/pages/shared';
import { Button, Card, Pagination } from '@/components/ui';
import { useFeedbackStore } from '@/store';
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

function BatchCard({ batch }: { batch: BatchListItem }): ReactElement {
  const detailPath = ROUTES.BATCH_DETAIL.replace(':batchId', batch.id);

  return (
    <Link to={detailPath} className="block group">
      <Card className="p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', modeBadgeClass(batch.transportMode))}>
                {batch.transportMode === 'air' ? <Plane className="h-3 w-3" /> : <Ship className="h-3 w-3" />}
                {batch.transportLabel}
              </span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusBadgeClass(batch.status))}>
                {batch.statusLabel}
              </span>
            </div>
            <p className="font-mono text-sm font-semibold text-gray-900 truncate">{batch.masterTrackingNumber}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
              <span><span className="font-medium text-gray-700">{batch.customerCount}</span> customers</span>
              <span><span className="font-medium text-gray-700">{batch.orderCount}</span> orders</span>
              <span><span className="font-medium text-gray-700">{batch.totalWeightKg}</span> kg</span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors mt-1" />
        </div>
      </Card>
    </Link>
  );
}

export function BatchesPage(): ReactElement {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = useCan('app.admin');
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [page, setPage] = useState(1);
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);

  const { data, isLoading, error } = useBatches({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    transportMode: modeFilter !== 'all' ? modeFilter : undefined,
    page,
    limit: 20,
  });

  const createBatch = useCreateBatch();

  const handleCreateBatch = async (transportMode: 'air' | 'sea'): Promise<void> => {
    try {
      const newBatch = await createBatch.mutateAsync({ transportMode });
      pushMessage({ tone: 'success', message: `New ${transportMode} batch created.` });
      navigate(ROUTES.BATCH_DETAIL.replace(':batchId', newBatch.id));
    } catch (err) {
      pushMessage({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to create batch' });
    }
    setShowNewBatchModal(false);
  };

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
          subtitle="Manage shipment batches and track goods movement"
          actions={
            isAdmin ? (
              <Button onClick={() => setShowNewBatchModal(true)} disabled={createBatch.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                New Batch
              </Button>
            ) : undefined
          }
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
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
                    : 'Batches appear here once orders are ready for shipping.'}
                </p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.batches.map((batch) => (
                  <BatchCard key={batch.id} batch={batch} />
                ))}
              </div>
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

      {/* New Batch Modal */}
      {showNewBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">New batch</h2>
            <p className="text-sm text-gray-500">Select the transport mode for the new batch.</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void handleCreateBatch('air')}
                disabled={createBatch.isPending}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-gray-200 p-4 text-sm font-medium text-gray-700 hover:border-brand-500 hover:text-brand-600 transition-colors disabled:opacity-50"
              >
                <Plane className="h-6 w-6" />
                Air
              </button>
              <button
                type="button"
                onClick={() => void handleCreateBatch('sea')}
                disabled={createBatch.isPending}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-gray-200 p-4 text-sm font-medium text-gray-700 hover:border-brand-500 hover:text-brand-600 transition-colors disabled:opacity-50"
              >
                <Ship className="h-6 w-6" />
                Sea
              </button>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowNewBatchModal(false)}
            >
              Cancel
            </Button>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
