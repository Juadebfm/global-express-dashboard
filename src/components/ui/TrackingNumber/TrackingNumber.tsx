import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { CopyButton } from '../CopyButton';
import { cn } from '@/utils';

interface TrackingNumberProps {
  /**
   * The customer-visible tracking number, or null before warehouse
   * verification has assigned one.
   */
  value: string | null;
  className?: string;
}

/**
 * Renders a tracking number, or a plain "not assigned yet" note when the
 * backend has not issued one.
 *
 * A customer tracking number only exists once the goods are verified and
 * priced and the order joins a dispatch batch. Before that the backend sends
 * null, and nothing tracking-shaped may be shown — no placeholder number, no
 * copy control, and never the internal order number as a substitute.
 */
export function TrackingNumber({ value, className }: TrackingNumberProps): ReactElement {
  const { t } = useTranslation('common');

  if (!value) {
    return (
      <span className={cn('text-sm text-gray-400', className)}>
        {t('tracking.notAssigned')}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {value}
      <CopyButton value={value} />
    </span>
  );
}
