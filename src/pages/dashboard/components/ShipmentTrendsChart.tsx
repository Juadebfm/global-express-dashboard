import type { ReactElement } from 'react';
import type { ShipmentTrendsChart as ShipmentTrendsChartType } from '@/types';

interface ShipmentTrendsChartProps {
  chart: ShipmentTrendsChartType;
}

const DELIVERY_COLOR = '#FF6600';
const SHIPMENT_COLOR = '#78654F';

export function ShipmentTrendsChart({
  chart,
}: ShipmentTrendsChartProps): ReactElement {
  const width = 640;
  const height = 260;
  const padding = { top: 16, right: 20, bottom: 32, left: 42 };

  const values = chart.data.flatMap((item) => [item.deliveries, item.shipments]);
  const maxValue = Math.max(...values, 0);
  const paddedMax = maxValue === 0 ? 1 : Math.ceil(maxValue * 1.1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const scaleX = (index: number): number =>
    padding.left + (index / (chart.data.length - 1)) * innerWidth;

  const scaleY = (value: number): number =>
    padding.top + innerHeight - (value / paddedMax) * innerHeight;

  const buildPath = (key: 'deliveries' | 'shipments'): string =>
    chart.data
      .map((point, index) => {
        const x = scaleX(index);
        const y = scaleY(point[key]);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

  const ticks = 5;
  const yTicks = Array.from({ length: ticks }, (_, index) => {
    const value = (paddedMax / (ticks - 1)) * index;
    return {
      value,
      y: scaleY(value),
    };
  }).reverse();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{chart.title}</h3>
          <p className="text-xs text-gray-500 mt-1">{chart.subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {chart.legend.map((item) => {
            const color =
              item.key === 'deliveries' ? DELIVERY_COLOR : SHIPMENT_COLOR;

            return (
              <span key={item.key} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {item.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-6 h-64 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid + Y axis labels */}
          {yTicks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={tick.y}
                y2={tick.y}
                stroke="#E5E7EB"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#9CA3AF"
              >
                {Math.round(tick.value).toLocaleString('en-US')}
              </text>
            </g>
          ))}

          {/* X axis labels */}
          {chart.data.map((point, index) => (
            <text
              key={point.month}
              x={scaleX(index)}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#9CA3AF"
            >
              {point.month}
            </text>
          ))}

          {/* Lines */}
          <path
            d={buildPath('deliveries')}
            stroke={DELIVERY_COLOR}
            strokeWidth="2"
            fill="none"
          />
          <path
            d={buildPath('shipments')}
            stroke={SHIPMENT_COLOR}
            strokeWidth="2"
            fill="none"
          />

          {/* Points */}
          {chart.data.map((point, index) => (
            <g key={`${point.month}-points`}>
              <circle
                cx={scaleX(index)}
                cy={scaleY(point.deliveries)}
                r="3"
                fill={DELIVERY_COLOR}
              />
              <circle
                cx={scaleX(index)}
                cy={scaleY(point.shipments)}
                r="3"
                fill={SHIPMENT_COLOR}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
