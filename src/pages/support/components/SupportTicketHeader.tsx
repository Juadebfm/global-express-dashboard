import type { ReactElement } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSupportStatusDisplay } from '@/lib/supportStatusUtils';
import type { SupportTicket } from '@/types';
import { ROUTES } from '@/constants';

interface SupportTicketHeaderProps {
  ticket: SupportTicket;
  isStaff: boolean;
}

function formatLabel(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function SupportTicketHeader({ ticket, isStaff }: SupportTicketHeaderProps): ReactElement {
  const navigate = useNavigate();
  const status = getSupportStatusDisplay(ticket.status, isStaff);

  return (
    <div className="flex items-start gap-3 border-b border-gray-200 bg-white px-4 py-3">
      <button
        type="button"
        onClick={() => navigate(ROUTES.SUPPORT)}
        className="mt-0.5 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        aria-label="Back to tickets"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">{ticket.ticketNumber}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.bgClass} ${status.textClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
            {status.label}
          </span>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600">
            {formatLabel(ticket.category)}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
            {formatLabel(ticket.priority)}
          </span>
        </div>
        <h2 className="mt-1 truncate text-base font-semibold text-gray-900">{ticket.subject}</h2>
      </div>
    </div>
  );
}
