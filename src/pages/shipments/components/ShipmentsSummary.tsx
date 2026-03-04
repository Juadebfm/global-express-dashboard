import type { ReactElement } from 'react';
import { Layers, Scale } from 'lucide-react';
import type {
  ShipmentMetricCard,
  ShipmentOverviewCard,
  StatusCategory,
} from '@/types';
import i18n from '@/i18n/i18n';

interface ShipmentsSummaryProps {
  overview: ShipmentOverviewCard;
  metrics: ShipmentMetricCard[];
}

const statusStyles: Record<StatusCategory, { dot: string; bar: string }> = {
  pending: { dot: 'bg-amber-500', bar: 'bg-amber-500' },
  active: { dot: 'bg-blue-500', bar: 'bg-blue-500' },
  completed: { dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  exception: { dot: 'bg-rose-500', bar: 'bg-rose-500' },
};

const metricIcons: Record<ShipmentMetricCard['icon'], ReactElement> = {
  weight: <Scale className="h-4 w-4" />,
  value: <Layers className="h-4 w-4" />,
  items: <Layers className="h-4 w-4" />,
};

function getLocale(): string {
  return i18n.language === 'ko' ? 'ko-KR' : 'en-US';
}

const formatValue = (metric: ShipmentMetricCard): string => {
  const locale = getLocale();
  if (metric.unit === 'USD') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(metric.value);
  }

  return `${new Intl.NumberFormat(locale).format(metric.value)} ${metric.unit}`;
};

export function ShipmentsSummary({
  overview,
  metrics,
}: ShipmentsSummaryProps): ReactElement {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{overview.title}</p>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            <Layers className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 text-2xl font-semibold text-gray-900">
          {overview.total}
        </div>
        <div className="mt-4 space-y-3">
          {overview.breakdown.map((item) => {
            const style = statusStyles[item.status];
            const percent =
              overview.total === 0 ? 0 : Math.round((item.value / overview.total) * 100);

            return (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className="font-medium text-gray-800">{item.value}</span>
                </div>
                <div className="h-1 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-1 rounded-full ${style.bar}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{metric.title}</p>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
              {metricIcons[metric.icon]}
            </span>
          </div>
          <div className="mt-3 text-xl font-semibold text-gray-900">
            {formatValue(metric)}
          </div>
          <p className="mt-2 text-xs text-gray-500">{metric.helperText}</p>
        </div>
      ))}
    </section>
  );
}
