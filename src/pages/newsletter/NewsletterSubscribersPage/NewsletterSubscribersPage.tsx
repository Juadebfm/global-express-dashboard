import type { ReactElement } from 'react';
import { useState } from 'react';
import { Download, Trash2, UserX } from 'lucide-react';
import { useNewsletterSubscribers, useDeactivateSubscriber, useDeleteSubscriber, useExportSubscribers } from '@/hooks/useNewsletter';
import { AppShell, PageHeader } from '@/pages/shared';
import { Pagination } from '@/components/ui';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useFeedbackStore } from '@/store';

const PAGE_SIZE = 50;

interface PendingAction {
  type: 'deactivate' | 'delete';
  id: string;
  email: string;
}

export function NewsletterSubscribersPage(): ReactElement {
  const [page, setPage] = useState(1);
  const [activeOnly, setActiveOnly] = useState<boolean | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const { subscribers, pagination, isLoading } = useNewsletterSubscribers(page, PAGE_SIZE, activeOnly);
  const deactivate = useDeactivateSubscriber();
  const remove = useDeleteSubscriber();
  const exportCsv = useExportSubscribers();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const isConfirming = deactivate.isPending || remove.isPending;

  const handleConfirm = async (): Promise<void> => {
    if (!pendingAction) return;
    const { type, id } = pendingAction;
    try {
      if (type === 'deactivate') {
        await deactivate.mutateAsync(id);
        pushMessage({ tone: 'success', message: 'Subscriber deactivated.' });
      } else {
        await remove.mutateAsync(id);
        pushMessage({ tone: 'success', message: 'Subscriber deleted.' });
      }
      setPendingAction(null);
    } catch {
      pushMessage({ tone: 'error', message: type === 'deactivate' ? 'Failed to deactivate.' : 'Failed to delete.' });
    }
  };

  const handleExport = async () => {
    try {
      await exportCsv.mutateAsync();
      pushMessage({ tone: 'success', message: 'CSV downloaded.' });
    } catch {
      pushMessage({ tone: 'error', message: 'Export failed.' });
    }
  };

  return (
    <AppShell data={null} isLoading={false} error={null} requireData={false}>
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="Newsletter Subscribers"
          subtitle={pagination ? `${pagination.total} total` : undefined}
        />
        <button
          onClick={handleExport}
          disabled={exportCsv.isPending}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-3">
        <select
          value={activeOnly === undefined ? '' : String(activeOnly)}
          onChange={(e) => {
            const v = e.target.value;
            setActiveOnly(v === '' ? undefined : v === 'true');
            setPage(1);
          }}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
        >
          <option value="">All subscribers</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : subscribers.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-gray-200 text-gray-500 text-sm">
          No subscribers found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Subscribed</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{sub.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        sub.isActive
                          ? 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700'
                          : 'rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600'
                      }
                    >
                      {sub.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(sub.subscribedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {sub.isActive && (
                        <button
                          title="Deactivate"
                          onClick={() => setPendingAction({ type: 'deactivate', id: sub.id, email: sub.email })}
                          className="rounded p-1 text-amber-600 hover:bg-amber-50"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        title="Delete permanently"
                        onClick={() => setPendingAction({ type: 'delete', id: sub.id, email: sub.email })}
                        className="rounded p-1 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            page={page}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <ConfirmModal
        isOpen={pendingAction !== null}
        tone={pendingAction?.type === 'delete' ? 'danger' : 'warning'}
        title={
          pendingAction?.type === 'delete'
            ? `Permanently delete ${pendingAction.email}?`
            : `Deactivate ${pendingAction?.email}?`
        }
        message={
          pendingAction?.type === 'delete'
            ? 'This cannot be undone.'
            : 'They will no longer receive emails.'
        }
        confirmLabel={pendingAction?.type === 'delete' ? 'Delete' : 'Deactivate'}
        isLoading={isConfirming}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setPendingAction(null)}
      />
    </AppShell>
  );
}
