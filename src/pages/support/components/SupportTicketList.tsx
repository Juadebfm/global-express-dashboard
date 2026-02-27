import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { getSupportStatusDisplay } from '@/lib/supportStatusUtils';
import type { SupportTicket } from '@/types';

interface SupportTicketListProps {
  tickets: SupportTicket[];
  isStaff: boolean;
  isLoading: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d);
}

export function SupportTicketList({ tickets, isStaff, isLoading }: SupportTicketListProps): ReactElement {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500 shadow-sm">
        Loading tickets...
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
        <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-300" />
        No support tickets found.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
      {tickets.map((ticket) => {
        const status = getSupportStatusDisplay(ticket.status, isStaff);
        return (
          <button
            type="button"
            key={ticket.id}
            onClick={() => navigate(`/support/${ticket.id}`)}
            className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-400">{ticket.ticketNumber}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.bgClass} ${status.textClass}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
                  {status.label}
                </span>
              </div>
              <h3 className="truncate text-sm font-semibold text-gray-900">{ticket.subject}</h3>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {ticket.description || 'No description'}
              </p>
              {isStaff && ticket.requesterName && (
                <span className="mt-1 block text-xs text-gray-400">By {ticket.requesterName}</span>
              )}
            </div>

            <div className="shrink-0 text-right text-xs text-gray-400">
              <div>{formatDate(ticket.createdAt)}</div>
              <div>{formatTime(ticket.createdAt)}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
