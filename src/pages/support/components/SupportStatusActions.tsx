import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { SupportTicketStatus } from '@/types';

interface SupportStatusActionsProps {
  currentStatus: string;
  onStatusChange: (status: SupportTicketStatus) => void;
  isPending: boolean;
}

const TRANSITIONS: Record<
  string,
  {
    next: SupportTicketStatus;
    labelKey: string;
    buttonClass: string;
    bannerClass: string;
    hint: string;
  }[]
> = {
  open: [
    {
      next: 'in_progress',
      labelKey: 'statusActions.startWorking',
      buttonClass: 'bg-brand-500 hover:bg-brand-600 text-white',
      bannerClass: 'border-brand-200 bg-brand-50',
      hint: 'This ticket is unassigned — click Start Working to take ownership and reply.',
    },
  ],
  in_progress: [
    {
      next: 'resolved',
      labelKey: 'statusActions.markResolved',
      buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      bannerClass: 'border-emerald-200 bg-emerald-50',
      hint: 'Issue addressed? Mark as resolved to notify the customer.',
    },
  ],
  resolved: [
    {
      next: 'closed',
      labelKey: 'statusActions.closeTicket',
      buttonClass: 'bg-gray-600 hover:bg-gray-700 text-white',
      bannerClass: 'border-gray-200 bg-gray-50',
      hint: 'Close the ticket once no further action is needed.',
    },
    {
      next: 'in_progress',
      labelKey: 'statusActions.reopen',
      buttonClass: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
      bannerClass: '',
      hint: '',
    },
  ],
};

export function SupportStatusActions({
  currentStatus,
  onStatusChange,
  isPending,
}: SupportStatusActionsProps): ReactElement | null {
  const { t } = useTranslation('support');
  const actions = TRANSITIONS[currentStatus];
  if (!actions || actions.length === 0) return null;

  const primary = actions[0];
  const secondary = actions.slice(1);

  return (
    <div className={`border-t px-4 py-3 ${primary.bannerClass}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        {primary.hint && (
          <p className="text-xs text-gray-600 sm:flex-1">{primary.hint}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {secondary.map((action) => (
            <button
              key={action.next}
              type="button"
              disabled={isPending}
              onClick={() => onStatusChange(action.next)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${action.buttonClass}`}
            >
              {t(action.labelKey)}
            </button>
          ))}
          <button
            type="button"
            disabled={isPending}
            onClick={() => onStatusChange(primary.next)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 ${primary.buttonClass}`}
          >
            {isPending ? '…' : t(primary.labelKey)}
          </button>
        </div>
      </div>
    </div>
  );
}
