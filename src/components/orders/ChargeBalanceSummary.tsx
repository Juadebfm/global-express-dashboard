import type { ReactElement } from 'react';
import { cn, formatCurrency } from '@/utils';

interface ChargeBalanceSummaryProps {
  finalChargeUsd: number | null;
  amountDue: number | null;
  className?: string;
  valueClassName?: string;
  compact?: boolean;
}

/** Displays the verified shipment charge and the remaining balance together. */
export function ChargeBalanceSummary({
  finalChargeUsd,
  amountDue,
  className,
  valueClassName,
  compact = false,
}: ChargeBalanceSummaryProps): ReactElement | null {
  if (finalChargeUsd == null) return null;

  const dueLabel = amountDue != null && amountDue > 0
    ? formatCurrency(amountDue, 'USD')
    : 'Paid in full';

  if (compact) {
    return (
      <p className={cn('text-xs text-gray-500', className)}>
        Final charge <span className={cn('font-semibold text-gray-900', valueClassName)}>{formatCurrency(finalChargeUsd, 'USD')}</span>
        {' · '}
        Amount due <span className={cn('font-semibold text-gray-900', valueClassName)}>{dueLabel}</span>
      </p>
    );
  }

  return (
    <dl className={cn('grid grid-cols-2 gap-x-4 gap-y-2', className)}>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Final charge</dt>
        <dd className={cn('mt-0.5 text-sm font-semibold text-gray-900', valueClassName)}>
          {formatCurrency(finalChargeUsd, 'USD')}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Amount due</dt>
        <dd className={cn('mt-0.5 text-sm font-semibold text-gray-900', valueClassName)}>{dueLabel}</dd>
      </div>
    </dl>
  );
}
