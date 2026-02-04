import type { ReactElement } from 'react';
import { Copy, Download, PenSquare, Trash2 } from 'lucide-react';
import type { ShipmentFilterTab } from '@/types';
import { cn } from '@/utils';

interface ShipmentsFiltersProps {
  filters: ShipmentFilterTab[];
  active: ShipmentFilterTab['value'];
  onChange: (value: ShipmentFilterTab['value']) => void;
}

export function ShipmentsFilters({
  filters,
  active,
  onChange,
}: ShipmentsFiltersProps): ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-6">
        {filters.map((filter) => {
          const isActive = filter.value === active;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onChange(filter.value)}
              className={cn(
                'relative text-sm font-medium transition-colors',
                isActive ? 'text-brand-600' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {filter.label}
              {isActive && (
                <span className="absolute -bottom-3 left-0 h-0.5 w-full rounded-full bg-brand-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-gray-400">
        {[Copy, Download, Trash2, PenSquare].map((Icon, index) => (
          <button
            key={`action-${index}`}
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            aria-label="Table action"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
