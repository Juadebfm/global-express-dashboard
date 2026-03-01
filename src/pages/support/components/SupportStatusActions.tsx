import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { SupportTicketStatus } from '@/types';

interface SupportStatusActionsProps {
  currentStatus: string;
  onStatusChange: (status: SupportTicketStatus) => void;
  isPending: boolean;
}

const TRANSITIONS: Record<string, { next: SupportTicketStatus; labelKey: string; className: string }[]> = {
  open: [
    { next: 'in_progress', labelKey: 'statusActions.startWorking', className: 'bg-blue-600 hover:bg-blue-700 text-white' },
  ],
  in_progress: [
    { next: 'resolved', labelKey: 'statusActions.markResolved', className: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  ],
  resolved: [
    { next: 'closed', labelKey: 'statusActions.closeTicket', className: 'bg-gray-600 hover:bg-gray-700 text-white' },
    { next: 'in_progress', labelKey: 'statusActions.reopen', className: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50' },
  ],
};

export function SupportStatusActions({ currentStatus, onStatusChange, isPending }: SupportStatusActionsProps): ReactElement | null {
  const { t } = useTranslation('support');
  const actions = TRANSITIONS[currentStatus];
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
      <span className="text-xs text-gray-500">Actions:</span>
      {actions.map((action) => (
        <button
          key={action.next}
          type="button"
          disabled={isPending}
          onClick={() => onStatusChange(action.next)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${action.className}`}
        >
          {t(action.labelKey)}
        </button>
      ))}
    </div>
  );
}
