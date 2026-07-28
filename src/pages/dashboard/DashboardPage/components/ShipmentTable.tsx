import type { KeyboardEvent, ReactElement } from 'react';
import { Plane, Ship, Truck } from 'lucide-react';
import { cn, formatDate } from '@/utils';
import { formatTrackingDisplay, isInternalTracking } from '@/lib/trackingUtils';
import { getStatusStyle } from '@/lib/statusUtils';
import type { OrderListItem } from '@/types';

interface ShipmentTableProps {
  orders: OrderListItem[];
  onOpen: (orderId: string) => void;
}

function shipmentMode(row: OrderListItem): { label: string; icon: ReactElement } {
  if (row.raw.shipmentType === 'd2d') {
    return { label: 'Door-to-door', icon: <Truck className="h-4 w-4" /> };
  }
  if (row.transportMode === 'sea') {
    return { label: 'Sea freight', icon: <Ship className="h-4 w-4" /> };
  }
  return { label: 'Air freight', icon: <Plane className="h-4 w-4" /> };
}

function isRowActivation(event: KeyboardEvent<HTMLTableRowElement>): boolean {
  return event.key === 'Enter' || event.key === ' ';
}

function paymentCell(row: OrderListItem): { label: string; cls: string } | null {
  const raw = row.raw as Record<string, unknown>;
  const due = raw.amountDue != null ? parseFloat(raw.amountDue as string) : null;
  if (due != null && due > 0) {
    return {
      label: `$${due.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} due`,
      cls: 'bg-amber-100 text-amber-700',
    };
  }
  // amountDue is null once fully paid (not just "unset") — but that's the
  // same signal as "never priced yet", so also check finalChargeUsd to tell
  // the two apart and show "Paid" instead of a blank-looking dash.
  const finalCharge = raw.finalChargeUsd != null ? parseFloat(raw.finalChargeUsd as string) : null;
  if (finalCharge != null && finalCharge > 0) {
    return { label: 'Paid', cls: 'bg-emerald-100 text-emerald-700' };
  }
  return null;
}

export function ShipmentTable({ orders, onOpen }: ShipmentTableProps): ReactElement {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-gray-50">
          <tr className="text-xs font-medium text-gray-400">
            <th scope="col" className="border-r border-gray-200 px-5 py-3">Goods</th>
            <th scope="col" className="border-r border-gray-200 px-5 py-3">Tracking number</th>
            <th scope="col" className="border-r border-gray-200 px-5 py-3">Shipment type</th>
            <th scope="col" className="border-r border-gray-200 px-5 py-3">Booked</th>
            <th scope="col" className="border-r border-gray-200 px-5 py-3">Status</th>
            <th scope="col" className="px-5 py-3">Payment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((row) => {
            const style = getStatusStyle(row.statusV2);
            const internal = isInternalTracking(row.trackingNumber);
            const mode = shipmentMode(row);
            const bookedDate = row.createdAt
              ? formatDate(row.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })
              : '—';
            const payment = paymentCell(row);

            return (
              <tr
                key={row.id}
                tabIndex={0}
                role="button"
                aria-label={`View shipment ${row.trackingNumber}`}
                onClick={() => onOpen(row.id)}
                onKeyDown={(event) => {
                  if (!isRowActivation(event)) return;
                  event.preventDefault();
                  onOpen(row.id);
                }}
                className="cursor-pointer bg-white transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-brand-50"
              >
                <td className="max-w-[250px] border-r border-gray-100 px-5 py-4">
                  <p className="truncate font-medium text-gray-900">
                    {(row.raw.description as string) || 'No description'}
                  </p>
                </td>
                <td className="whitespace-nowrap border-r border-gray-100 px-5 py-4">
                  <span className={cn('text-xs', internal ? 'italic text-gray-400' : 'font-mono text-gray-700')}>
                    {internal ? formatTrackingDisplay(row.trackingNumber) : row.trackingNumber}
                  </span>
                </td>
                <td className="whitespace-nowrap border-r border-gray-100 px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-gray-600">
                    <span className="text-gray-400">{mode.icon}</span>
                    {mode.label}
                  </span>
                </td>
                <td className="whitespace-nowrap border-r border-gray-100 px-5 py-4 text-gray-500">
                  {bookedDate}
                </td>
                <td className="whitespace-nowrap border-r border-gray-100 px-5 py-4">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      style.bgClass,
                      style.textClass,
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', style.dotClass)} />
                    {row.statusLabel || row.statusV2}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  {payment ? (
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', payment.cls)}>
                      {payment.label}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
