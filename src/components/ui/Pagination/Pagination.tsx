import type { ReactElement } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils';

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  // Optional copy override — defaults to "Page X of Y · N total". The
  // caller can supply a localised "of" / "total" via the `labels` prop.
  labels?: {
    pageOf?: (page: number, totalPages: number) => string;
    totalLabel?: (total: number) => string;
    prev?: string;
    next?: string;
  };
  className?: string;
  onPageChange: (page: number) => void;
}

const defaultLabels: Required<NonNullable<PaginationProps['labels']>> = {
  pageOf: (page, totalPages) => `Page ${page} of ${totalPages}`,
  totalLabel: (total) => `${total} total`,
  prev: 'Previous',
  next: 'Next',
};

/**
 * Compact Prev/Next pagination with a "Page X of Y · N total" indicator.
 *
 * Renders nothing when `totalPages <= 1` so a single-page list doesn't
 * sprout dead chrome. Caller is responsible for resetting `page` to 1
 * when filters change.
 */
export function Pagination({
  page,
  totalPages,
  total,
  labels,
  className,
  onPageChange,
}: PaginationProps): ReactElement | null {
  if (totalPages <= 1) return null;

  const merged = { ...defaultLabels, ...labels };
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm',
        className,
      )}
    >
      <p className="text-gray-700">
        <span className="font-semibold text-gray-900">
          {merged.pageOf(page, totalPages)}
        </span>
        <span className="mx-2 text-gray-300">·</span>
        <span>{merged.totalLabel(total)}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 font-medium text-gray-700 transition-colors',
            'hover:bg-gray-50',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white',
          )}
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          aria-label={merged.prev}
        >
          <ChevronLeft className="h-4 w-4" />
          {merged.prev}
        </button>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 font-medium text-gray-700 transition-colors',
            'hover:bg-gray-50',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white',
          )}
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          aria-label={merged.next}
        >
          {merged.next}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
