import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { SupportTicketStatus } from '@/types';

type FilterValue = SupportTicketStatus | 'all';

interface SupportTicketFiltersProps {
  activeFilter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
}

const FILTER_KEYS: { value: FilterValue; key: string }[] = [
  { value: 'all', key: 'filters.all' },
  { value: 'open', key: 'filters.open' },
  { value: 'in_progress', key: 'filters.inProgress' },
  { value: 'resolved', key: 'filters.resolved' },
  { value: 'closed', key: 'filters.closed' },
];

export function SupportTicketFilters({ activeFilter, onFilterChange }: SupportTicketFiltersProps): ReactElement {
  const { t } = useTranslation('support');
  return (
    <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
      {FILTER_KEYS.map((f) => (
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
          {t(f.key)}
        </button>
      ))}
    </div>
  );
}
