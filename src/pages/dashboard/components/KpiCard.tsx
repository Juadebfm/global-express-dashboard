import type { ReactElement } from 'react';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import type { KpiCard as KpiCardType } from '@/types';
import { cn } from '@/utils';

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

export function KpiCard({ data }: KpiCardProps): ReactElement {
  const TrendIcon = data.trend.direction === 'up' ? ArrowUpRight : ArrowDownRight;
  const trendColor =
    data.trend.direction === 'up' ? 'text-green-600' : 'text-red-600';
  const status = statusStyles[data.status];

  const displayValue =
    data.display ??
    new Intl.NumberFormat('en-US').format(data.value);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{data.title}</p>
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            status.bg
          )}
        >
          {status.icon}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-semibold text-gray-900">{displayValue}</p>
        <p className="text-xs text-gray-500 mt-1">{data.helperText}</p>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className={cn('flex items-center gap-1 font-semibold', trendColor)}>
          {data.trend.direction === 'up' ? '+' : '-'}
          {data.trend.percent}%
          <TrendIcon className="h-3.5 w-3.5" />
        </span>
        <span className="text-gray-400">{data.trend.period}</span>
      </div>
    </div>
  );
}
