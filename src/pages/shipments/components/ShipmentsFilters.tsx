import type { ReactElement } from 'react';
import { Copy, Download, PenSquare, Trash2 } from 'lucide-react';
import type { ShipmentFilterTab } from '@/types';
import { cn } from '@/utils';

interface ShipmentsFiltersProps {
  filters: ShipmentFilterTab[];
  active: ShipmentFilterTab['value'];
  onChange: (value: ShipmentFilterTab['value']) => void;
  onCopy?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  actionMessage?: string | null;
  actionsDisabled?: boolean;
}

export function ShipmentsFilters({
  filters,
  active,
  onChange,
  onCopy,
  onDownload,
  onDelete,
  onEdit,
  actionMessage,
  actionsDisabled = false,
}: ShipmentsFiltersProps): ReactElement {
  const actions = [
    { Icon: Copy, label: 'Copy rows', onClick: onCopy },
    { Icon: Download, label: 'Download CSV', onClick: onDownload },
    { Icon: Trash2, label: 'Delete rows', onClick: onDelete },
    { Icon: PenSquare, label: 'Edit rows', onClick: onEdit },
  ];

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
        {actionMessage && (
          <span className="text-xs font-medium text-gray-500">{actionMessage}</span>
        )}
        {actions.map(({ Icon, label, onClick }) => {
          const isDisabled = actionsDisabled || !onClick;

          return (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition',
                isDisabled
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:bg-gray-50 hover:text-gray-700'
              )}
              aria-label={label}
              title={label}
              disabled={isDisabled}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
