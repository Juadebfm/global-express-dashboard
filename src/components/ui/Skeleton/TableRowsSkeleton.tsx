import type { ReactElement } from 'react';
import { Skeleton } from './Skeleton';
import { cn } from '@/utils';

export interface TableRowsSkeletonProps {
  /** Number of cells per row. */
  columns: number;
  /** Number of skeleton rows. Default: 6. */
  rows?: number;
  /** Optional accessible label override. */
  ariaLabel?: string;
  /** Optional wrapper className (e.g. for table-specific borders). */
  className?: string;
}

// Per-cell widths cycle through these values so rows look varied without
// pretending to model the real data. First cell is intentionally wider
// to mimic a primary identifier column (tracking number, name, etc.).
const CELL_WIDTHS = ['22%', '18%', '14%', '10%', '12%', '14%', '16%', '10%'] as const;

/**
 * A generic horizontal-row skeleton used inside list/table containers
 * while the first fetch is in flight. Renders `rows` × `columns` blocks
 * arranged in a flex layout so it doesn't depend on a real <table>
 * structure — drop it anywhere a list will appear.
 *
 * Wrapped in role="status" + aria-busy so assistive tech narrates the
 * surface as loading.
 */
export function TableRowsSkeleton({
  columns,
  rows = 6,
  ariaLabel = 'Loading',
  className,
}: TableRowsSkeletonProps): ReactElement {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className={cn(
        'space-y-3 rounded-2xl border border-gray-200 bg-white p-4',
        className,
      )}
    >
      {/* Header strip — single wider block to mimic a column header bar. */}
      <div className="border-b border-gray-100 pb-3">
        <Skeleton height={18} width="22%" />
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b border-gray-100 py-3 last:border-b-0 last:pb-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              height={14}
              width={CELL_WIDTHS[colIndex % CELL_WIDTHS.length]}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
