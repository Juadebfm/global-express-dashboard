import type { ReactElement } from 'react';
import type { SupportTicketStatus } from '@/types';

type FilterValue = SupportTicketStatus | 'all';

interface SupportTicketFiltersProps {
  activeFilter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export function SupportTicketFilters({ activeFilter, onFilterChange }: SupportTicketFiltersProps): ReactElement {
  return (
    <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => onFilterChange(f.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFilter === f.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
