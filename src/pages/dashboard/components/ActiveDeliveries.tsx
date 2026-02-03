import type { ReactElement } from 'react';
import { Truck, Ship, Plane } from 'lucide-react';
import type { ActiveDelivery } from '@/types';

interface ActiveDeliveriesProps {
  title: string;
  subtitle: string;
  items: ActiveDelivery[];
  emptyLabel?: string;
}

const statusStyles: Record<
  ActiveDelivery['status'],
  { bg: string; text: string }
> = {
  on_time: { bg: 'bg-[#0000FF]', text: 'text-white' },
  delayed: { bg: 'bg-[#FF0000]', text: 'text-white' },
  completed: { bg: 'bg-[#008000]', text: 'text-white' },
};

const modeIcons: Record<ActiveDelivery['mode'], ReactElement> = {
  truck: <Truck className="h-4 w-4" />,
  ship: <Ship className="h-4 w-4" />,
  air: <Plane className="h-4 w-4" />,
};

export function ActiveDeliveries({
  title,
  subtitle,
  items,
  emptyLabel,
}: ActiveDeliveriesProps): ReactElement {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </div>

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
            {emptyLabel ?? 'No matching deliveries found.'}
          </div>
        ) : (
          items.map((item) => {
            const status = statusStyles[item.status];

            return (
              <div key={item.id} className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#F4EBFF] text-gray-600">
                    {modeIcons[item.mode]}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.location.city}, {item.location.state}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.activeShipments} active shipments
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${status.bg} ${status.text}`}
                  >
                    {item.statusLabel}
                  </span>
                  <p className="mt-1 text-xs text-gray-500">
                    {'eta' in item
                      ? item.eta.display
                      : 'delay' in item
                        ? item.delay.display
                        : 'Delivered'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
