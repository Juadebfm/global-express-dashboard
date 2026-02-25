import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { SupportTicketForm } from '@/components/forms';
import { AlertBanner, Button } from '@/components/ui';
import { useDashboardData, useSearch, useSupportTickets } from '@/hooks';
import { AppShell, PageHeader } from '@/pages/shared';
import type { CreateSupportTicketPayload } from '@/types';

function normalizeTag(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function formatLabel(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((item) => item[0].toUpperCase() + item.slice(1))
    .join(' ');
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getPriorityClass(priority: string): string {
  switch (normalizeTag(priority)) {
    case 'high':
      return 'bg-red-50 text-red-600';
    case 'low':
      return 'bg-blue-50 text-blue-600';
    default:
      return 'bg-amber-50 text-amber-600';
  }
}

function getStatusClass(status: string): string {
  switch (normalizeTag(status)) {
    case 'resolved':
      return 'bg-green-50 text-green-700';
    case 'closed':
      return 'bg-gray-100 text-gray-600';
    case 'in_progress':
      return 'bg-blue-50 text-blue-700';
    default:
      return 'bg-amber-50 text-amber-700';
  }
}

export function SupportPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();
  const {
    tickets,
    isLoading: ticketsLoading,
    error: ticketsError,
    isCreating,
    createTicket,
    refresh,
  } = useSupportTickets();

  const filteredTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return tickets;

    return tickets.filter((ticket) => {
      const haystack = [
        ticket.ticketNumber,
        ticket.subject,
        ticket.description,
        ticket.category,
        ticket.priority,
        ticket.status,
        ticket.relatedTrackingNumber ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [tickets, query]);

  const handleCreateTicket = async (payload: CreateSupportTicketPayload): Promise<void> => {
    await createTicket(payload);
  };

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading support...">
      <div className="space-y-6">
        <PageHeader
          title="Support Tickets"
          subtitle="Create and track your support requests."
        />

        <SupportTicketForm
          onSubmit={handleCreateTicket}
          isLoading={isCreating}
        />

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Your Tickets</h2>
              <p className="mt-1 text-sm text-gray-500">
                {filteredTickets.length} ticket{filteredTickets.length === 1 ? '' : 's'}
                {query.trim() ? ' match your search' : ' found'}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={refresh}
            >
              Refresh
            </Button>
          </div>

          <div className="divide-y divide-gray-100">
            {ticketsLoading && (
              <div className="px-5 py-8 text-sm text-gray-500">Loading your support tickets...</div>
            )}

            {!ticketsLoading && ticketsError && (
              <div className="px-5 py-6">
                <AlertBanner tone="error" message={ticketsError} />
              </div>
            )}

            {!ticketsLoading && !ticketsError && filteredTickets.length === 0 && (
              <div className="px-5 py-8">
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500">
                  {query.trim()
                    ? 'No support tickets match your search.'
                    : 'No support tickets yet. Create one using the form above.'}
                </div>
              </div>
            )}

            {!ticketsLoading &&
              !ticketsError &&
              filteredTickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">{ticket.ticketNumber}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPriorityClass(ticket.priority)}`}
                      >
                        {formatLabel(ticket.priority)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(ticket.status)}`}
                      >
                        {formatLabel(ticket.status)}
                      </span>
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-600">
                        {formatLabel(ticket.category)}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900">{ticket.subject}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {ticket.description || 'No description provided.'}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      {ticket.requesterName && <span>{ticket.requesterName}</span>}
                      <span>{formatDate(ticket.createdAt)}</span>
                      {ticket.relatedTrackingNumber && (
                        <span>Tracking: {ticket.relatedTrackingNumber}</span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-sm text-gray-500">{formatTime(ticket.createdAt)}</div>
                </article>
              ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
