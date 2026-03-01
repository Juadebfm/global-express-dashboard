import type { ReactElement } from 'react';
import { CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import type { KpiCard as KpiCardType, ChangeIndicator } from '@/types';
import { cn } from '@/utils';
import i18n from '@/i18n/i18n';

interface KpiCardProps {
  data: KpiCardType;
}

const statusStyles: Record<KpiCardType['status'], { bg: string; icon: ReactElement }> = {
  good: {
    bg: 'bg-[#CEFFC4]',
    icon: <CheckCircle2 className="h-4 w-4 text-green-700" />,
  },
  warning: {
    bg: 'bg-[#FFC8C8]',
    icon: <AlertCircle className="h-4 w-4 text-red-600" />,
  },
  bad: {
    bg: 'bg-[#FFC8C8]',
    icon: <AlertCircle className="h-4 w-4 text-red-600" />,
  },
};

function ChangeBadge({ change }: { change: ChangeIndicator }): ReactElement | null {
  if (!change) return null;
  const isUp = change.direction === 'up';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isUp ? 'text-green-600' : 'text-red-500'
      )}
    >
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? '+' : '-'}{change.value}%
    </span>
  );
}

export function KpiCard({ data }: KpiCardProps): ReactElement {
  const status = statusStyles[data.status];
  const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
  const displayValue = data.display ?? new Intl.NumberFormat(locale).format(data.value);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{data.title}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', status.bg)}>
          {status.icon}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-semibold text-gray-900">{displayValue}</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-xs text-gray-500">{data.helperText}</p>
          <ChangeBadge change={data.change} />
        </div>
      </div>
    </div>
  );
}
