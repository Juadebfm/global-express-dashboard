import type { ReactElement } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
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
    </div>
  );
}
