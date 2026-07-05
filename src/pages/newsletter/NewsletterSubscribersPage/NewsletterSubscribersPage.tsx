import type { ReactElement } from 'react';
import { useState } from 'react';
import { Download, Trash2, UserX } from 'lucide-react';
import { useNewsletterSubscribers, useDeactivateSubscriber, useDeleteSubscriber, useExportSubscribers } from '@/hooks/useNewsletter';
import { AppShell, PageHeader } from '@/pages/shared';
import { Pagination } from '@/components/ui';
import { useFeedbackStore } from '@/store';

const PAGE_SIZE = 50;

export function NewsletterSubscribersPage(): ReactElement {
  const [page, setPage] = useState(1);
  const [activeOnly, setActiveOnly] = useState<boolean | undefined>(undefined);

  const { subscribers, pagination, isLoading } = useNewsletterSubscribers(page, PAGE_SIZE, activeOnly);
  const deactivate = useDeactivateSubscriber();
  const remove = useDeleteSubscriber();
  const exportCsv = useExportSubscribers();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const handleDeactivate = async (id: string, email: string) => {
    if (!confirm(`Deactivate ${email}? They will no longer receive emails.`)) return;
    try {
      await deactivate.mutateAsync(id);
      pushMessage({ tone: 'success', message: 'Subscriber deactivated.' });
    } catch {
      pushMessage({ tone: 'error', message: 'Failed to deactivate.' });
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    try {
      await remove.mutateAsync(id);
      pushMessage({ tone: 'success', message: 'Subscriber deleted.' });
    } catch {
      pushMessage({ tone: 'error', message: 'Failed to delete.' });
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
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-muted disabled:opacity-60"
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
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text"
        >
          <option value="">All subscribers</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : subscribers.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground text-sm">
          No subscribers found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Subscribed</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-text">{sub.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        sub.isActive
                          ? 'rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }
                    >
                      {sub.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(sub.subscribedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {sub.isActive && (
                        <button
                          title="Deactivate"
                          onClick={() => handleDeactivate(sub.id, sub.email)}
                          className="rounded p-1 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        title="Delete permanently"
                        onClick={() => handleDelete(sub.id, sub.email)}
                        className="rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
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
    </AppShell>
  );
}
