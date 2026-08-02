import { Fragment, useState } from 'react';
import type { ReactElement } from 'react';
import { ChevronDown, Trash2, UserCheck } from 'lucide-react';
import type { Lead, LeadStatus, LeadType } from '@/types';
import { useLeads, useUpdateLead, useDeleteLead } from '@/hooks/useLeads';
import { useCapability } from '@/hooks/usePermissions';
import { AppShell, PageHeader } from '@/pages/shared';
import { Pagination } from '@/components/ui';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useFeedbackStore } from '@/store';
import { cn } from '@/utils';

const PAGE_SIZE = 50;

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  converted: 'Converted',
  closed: 'Closed',
};

const STATUS_CLASSES: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  converted: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-600',
};

const TYPE_LABELS: Record<LeadType, string> = {
  d2d_intake: 'D2D Intake',
  shop_inquiry: 'Shop Inquiry',
  general_inquiry: 'General Inquiry',
};

function StatusDropdown({ lead, onUpdate }: { lead: Lead; onUpdate: (id: string, status: LeadStatus) => void }) {
  const [open, setOpen] = useState(false);
  const statuses: LeadStatus[] = ['new', 'contacted', 'converted', 'closed'];
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
          STATUS_CLASSES[lead.status],
        )}
      >
        {STATUS_LABELS[lead.status]}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-36 rounded-md border border-gray-200 bg-white shadow-lg">
          {statuses.map((s) => (
            <button
              key={s}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => { onUpdate(lead.id, s); setOpen(false); }}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LeadsPage(): ReactElement {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<LeadType | undefined>();
  const [statusFilter, setStatusFilter] = useState<LeadStatus | undefined>();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { leads, pagination, isLoading } = useLeads(page, PAGE_SIZE, {
    leadType: typeFilter,
    status: statusFilter,
  });
  const { update, isUpdating } = useUpdateLead();
  const deleteMutation = useDeleteLead();
  const canDeleteLead = useCapability('leads.manage');
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    try {
      await update(id, { status });
      pushMessage({ tone: 'success', message: 'Inquiry status updated.' });
    } catch {
      pushMessage({ tone: 'error', message: 'Failed to update status.' });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget || !canDeleteLead) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      pushMessage({ tone: 'success', message: 'Inquiry deleted.' });
      setDeleteTarget(null);
    } catch {
      pushMessage({ tone: 'error', message: 'Failed to delete inquiry.' });
    }
  };

  return (
    <AppShell data={null} isLoading={false} error={null} requireData={false}>
      <PageHeader
        title="Inquiries"
        subtitle={pagination ? `${pagination.total} total` : undefined}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <select
            value={typeFilter ?? ''}
            onChange={(e) => { setTypeFilter((e.target.value as LeadType) || undefined); setPage(1); }}
            className="appearance-none rounded-md border border-gray-200 bg-white px-3 py-1.5 pr-9 text-sm text-gray-700"
          >
            <option value="">All types</option>
            <option value="d2d_intake">D2D Intake</option>
            <option value="shop_inquiry">Shop Inquiry</option>
            <option value="general_inquiry">General Inquiry</option>
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </span>
        </div>
        <div className="relative">
          <select
            value={statusFilter ?? ''}
            onChange={(e) => { setStatusFilter((e.target.value as LeadStatus) || undefined); setPage(1); }}
            className="appearance-none rounded-md border border-gray-200 bg-white px-3 py-1.5 pr-9 text-sm text-gray-700"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-gray-200 text-gray-500 text-sm">
          No inquiries found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <Fragment key={lead.id}>
                  <tr
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{lead.fullName}</td>
                    <td className="px-4 py-3 text-gray-500">{TYPE_LABELS[lead.leadType]}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <StatusDropdown lead={lead} onUpdate={handleStatusChange} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {lead.email ?? lead.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {lead.status !== 'converted' && (
                          <button
                            title="Mark converted"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(lead.id, 'converted')}
                            className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                        {canDeleteLead && (
                          <button
                            title="Delete"
                            onClick={() => setDeleteTarget(lead.id)}
                            className="rounded p-1 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === lead.id && (
                    <tr key={`${lead.id}-expanded`} className="bg-gray-50">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                          {lead.message && (
                            <div>
                              <span className="font-medium text-gray-500">Message / Goods</span>
                              <p className="mt-0.5 text-gray-900">{lead.message}</p>
                            </div>
                          )}
                          {lead.originCountry && (
                            <div>
                              <span className="font-medium text-gray-500">Origin</span>
                              <p className="mt-0.5 text-gray-900">{lead.originCountry}</p>
                            </div>
                          )}
                          {lead.phone && (
                            <div>
                              <span className="font-medium text-gray-500">Phone</span>
                              <p className="mt-0.5 text-gray-900">{lead.phone}</p>
                            </div>
                          )}
                          {lead.email && (
                            <div>
                              <span className="font-medium text-gray-500">Email</span>
                              <p className="mt-0.5 text-gray-900">{lead.email}</p>
                            </div>
                          )}
                          {lead.metadata && (
                            <div className="sm:col-span-2">
                              <span className="font-medium text-gray-500">Details</span>
                              <pre className="mt-0.5 text-xs text-gray-900 whitespace-pre-wrap">
                                {JSON.stringify(lead.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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

      {canDeleteLead && (
        <ConfirmModal
          isOpen={deleteTarget !== null}
          tone="danger"
          title="Permanently delete this inquiry?"
          message="This cannot be undone."
          confirmLabel="Delete"
          isLoading={deleteMutation.isPending}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppShell>
  );
}
