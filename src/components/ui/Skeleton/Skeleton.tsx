import type { ReactElement, CSSProperties } from 'react';
import { cn } from '@/utils';

export interface SkeletonProps {
  /**
   * Width — number is treated as px, string passes through (e.g. '60%').
   * Default: '100%' so the skeleton fills its container.
   */
  width?: string | number;
  /**
   * Height — number is treated as px, string passes through.
   * Default: '1rem' (matches text-base line height).
   */
  height?: string | number;
  /** Round into a circle (avatar/icon placeholders). */
  circle?: boolean;
  /** Escape hatch for any other styling (e.g. margin, custom rounding). */
  className?: string;
  /**
   * Aria label for screen readers. Defaults to "Loading" — override when
   * the placeholder represents a specific piece of content (e.g. "Loading
   * shipments list").
   */
  ariaLabel?: string;
}

function toCssLength(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * Animated placeholder for content that's still loading. Compose multiple
 * Skeletons (rows, columns, varying widths) to match the shape of the real
 * UI — that's what makes them less jarring than a centered spinner.
 *
 * Example — a list row with avatar + two lines:
 *
 *   <div className="flex items-center gap-3 p-3">
 *     <Skeleton circle width={36} height={36} />
 *     <div className="flex-1 space-y-2">
 *       <Skeleton height={14} width="60%" />
 *       <Skeleton height={12} width="40%" />
 *     </div>
 *   </div>
 */
export function Skeleton({
  width = '100%',
  height = '1rem',
  circle = false,
  className,
  ariaLabel = 'Loading',
}: SkeletonProps): ReactElement {
  const style: CSSProperties = {
    width: toCssLength(width),
    height: toCssLength(height),
  };

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      style={style}
      className={cn(
        'animate-pulse bg-gray-200/80',
        circle ? 'rounded-full' : 'rounded-md',
        className,
      )}
    />
  );
}
