import type { SupportTicketStatus } from '@/types';

interface SupportStatusDisplay {
  customerLabel: string;
  staffLabel: string;
  bgClass: string;
  textClass: string;
  dotClass: string;
}

const STATUS_MAP: Record<SupportTicketStatus, SupportStatusDisplay> = {
  open: {
    customerLabel: 'Awaiting response',
    staffLabel: 'New',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
  in_progress: {
    customerLabel: 'In progress',
    staffLabel: 'In progress',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-500',
  },
  resolved: {
    customerLabel: 'Resolved',
    staffLabel: 'Resolved',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  closed: {
    customerLabel: 'Closed',
    staffLabel: 'Closed',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
    dotClass: 'bg-gray-400',
  },
};

export function getSupportStatusDisplay(
  status: SupportTicketStatus | string,
  isStaff: boolean
): { label: string; bgClass: string; textClass: string; dotClass: string } {
  const entry = STATUS_MAP[status as SupportTicketStatus] ?? STATUS_MAP.open;
  return {
    label: isStaff ? entry.staffLabel : entry.customerLabel,
    bgClass: entry.bgClass,
    textClass: entry.textClass,
    dotClass: entry.dotClass,
  };
}
