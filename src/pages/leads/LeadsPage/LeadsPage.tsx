import { Fragment, useState } from 'react';
import type { ReactElement } from 'react';
import { ChevronDown, Trash2, UserCheck } from 'lucide-react';
import type { Lead, LeadStatus, LeadType } from '@/types';
import { useLeads, useUpdateLead, useDeleteLead } from '@/hooks/useLeads';
import { AppShell, PageHeader } from '@/pages/shared';
import { Pagination } from '@/components/ui';
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
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  converted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const TYPE_LABELS: Record<LeadType, string> = {
  d2d_intake: 'D2D Intake',
  shop_inquiry: 'Shop Inquiry',
};

function StatusDropdown({ lead, onUpdate }: { lead: Lead; onUpdate: (id: string, status: LeadStatus) => void }) {
  const [open, setOpen] = useState(false);
  const statuses: LeadStatus[] = ['new', 'contacted', 'converted', 'closed'];
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
          STATUS_CLASSES[lead.status],
        )}
      >
        {STATUS_LABELS[lead.status]}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-36 rounded-md border border-border bg-surface shadow-lg">
          {statuses.map((s) => (
            <button
              key={s}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
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

  const { leads, pagination, isLoading } = useLeads(page, PAGE_SIZE, {
    leadType: typeFilter,
    status: statusFilter,
  });
  const { update, isUpdating } = useUpdateLead();
  const deleteMutation = useDeleteLead();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    try {
      await update(id, { status });
      pushMessage({ tone: 'success', message: 'Lead status updated.' });
    } catch {
      pushMessage({ tone: 'error', message: 'Failed to update status.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this lead?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      pushMessage({ tone: 'success', message: 'Lead deleted.' });
    } catch {
      pushMessage({ tone: 'error', message: 'Failed to delete lead.' });
    }
  };

  return (
    <AppShell data={null} isLoading={false} error={null} requireData={false}>
      <PageHeader
        title="Leads"
        subtitle={pagination ? `${pagination.total} total` : undefined}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={typeFilter ?? ''}
          onChange={(e) => { setTypeFilter((e.target.value as LeadType) || undefined); setPage(1); }}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text"
        >
          <option value="">All types</option>
          <option value="d2d_intake">D2D Intake</option>
          <option value="shop_inquiry">Shop Inquiry</option>
        </select>
        <select
          value={statusFilter ?? ''}
          onChange={(e) => { setStatusFilter((e.target.value as LeadStatus) || undefined); setPage(1); }}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground text-sm">
          No leads found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((lead) => (
                <Fragment key={lead.id}>
                  <tr
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                  >
                    <td className="px-4 py-3 font-medium text-text">{lead.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[lead.leadType]}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <StatusDropdown lead={lead} onUpdate={handleStatusChange} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.email ?? lead.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {lead.status !== 'converted' && (
                          <button
                            title="Mark converted"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(lead.id, 'converted')}
                            className="rounded p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-40"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          title="Delete"
                          onClick={() => handleDelete(lead.id)}
                          className="rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === lead.id && (
                    <tr key={`${lead.id}-expanded`} className="bg-muted/20">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                          {lead.message && (
                            <div>
                              <span className="font-medium text-muted-foreground">Message / Goods</span>
                              <p className="mt-0.5 text-text">{lead.message}</p>
                            </div>
                          )}
                          {lead.originCountry && (
                            <div>
                              <span className="font-medium text-muted-foreground">Origin</span>
                              <p className="mt-0.5 text-text">{lead.originCountry}</p>
                            </div>
                          )}
                          {lead.phone && (
                            <div>
                              <span className="font-medium text-muted-foreground">Phone</span>
                              <p className="mt-0.5 text-text">{lead.phone}</p>
                            </div>
                          )}
                          {lead.email && (
                            <div>
                              <span className="font-medium text-muted-foreground">Email</span>
                              <p className="mt-0.5 text-text">{lead.email}</p>
                            </div>
                          )}
                          {lead.metadata && (
                            <div className="sm:col-span-2">
                              <span className="font-medium text-muted-foreground">Details</span>
                              <pre className="mt-0.5 text-xs text-text whitespace-pre-wrap">
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
    </AppShell>
  );
}
