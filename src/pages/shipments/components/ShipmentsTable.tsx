import type { ReactElement } from 'react';
import { Plane, Search, Ship, Truck, X } from 'lucide-react';
import type { ShipmentMode, ShipmentRecord, ShipmentStatus } from '@/types';
import { cn } from '@/utils';

interface ShipmentsTableProps {
  title: string;
  items: ShipmentRecord[];
  searchValue?: string;
  searchPlaceholder?: string;
  searchMeta?: string;
  onSearchChange?: (value: string) => void;
  onSearchClear?: () => void;
}

const statusLabels: Record<ShipmentStatus, string> = {
  in_transit: 'In-transit',
  pending: 'Pending',
  delivered: 'Delivered',
};

const statusStyles: Record<ShipmentStatus, string> = {
  in_transit: 'bg-blue-50 text-blue-600',
  pending: 'bg-amber-50 text-amber-600',
  delivered: 'bg-emerald-50 text-emerald-600',
};

const modeIcons: Record<ShipmentMode, ReactElement> = {
  air: <Plane className="h-4 w-4" />,
  ocean: <Ship className="h-4 w-4" />,
  road: <Truck className="h-4 w-4" />,
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const modeLabel = (mode: ShipmentMode): string => {
  if (mode === 'air') return 'Air';
  if (mode === 'ocean') return 'Ocean';
  return 'Road';
};

export function ShipmentsTable({
  title,
  items,
  searchValue,
  searchPlaceholder,
  searchMeta,
  onSearchChange,
  onSearchClear,
}: ShipmentsTableProps): ReactElement {
  const hasSearch = typeof onSearchChange === 'function';
  const trimmedValue = searchValue?.trim() ?? '';

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {searchMeta && (
            <p className="mt-1 text-xs font-medium text-gray-400">{searchMeta}</p>
          )}
        </div>
        {hasSearch && (
          <div className="w-full sm:w-auto">
            <div className="relative w-full sm:w-72 lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchValue ?? ''}
                onChange={(event) => onSearchChange?.(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && trimmedValue) {
                    event.preventDefault();
                    if (onSearchClear) {
                      onSearchClear();
                    } else {
                      onSearchChange?.('');
                    }
                  }
                }}
                placeholder={searchPlaceholder ?? 'Search shipments'}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-9 text-sm text-gray-800 outline-none transition focus:border-brand-500"
                spellCheck={false}
                aria-label="Search shipments"
              />
              {trimmedValue && (
                <button
                  type="button"
                  onClick={() => {
                    if (onSearchClear) {
                      onSearchClear();
                    } else {
                      onSearchChange?.('');
                    }
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-[12.5px]">
          <thead className="bg-gray-50">
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
              <th className="whitespace-nowrap border-r border-gray-100 px-6 py-3">
                SKU
              </th>
              <th className="whitespace-nowrap border-r border-gray-100 px-6 py-3">
                Customer
              </th>
              <th className="whitespace-nowrap border-r border-gray-100 px-6 py-3">
                Origin
              </th>
              <th className="whitespace-nowrap border-r border-gray-100 px-6 py-3">
                Destination
              </th>
              <th className="border-r border-gray-100 px-6 py-3">
                <div className="flex flex-col leading-tight">
                  <span className="whitespace-nowrap">Departure</span>
                  <span className="mt-1 text-[10px] font-medium text-gray-400">
                    dd/mm/yyyy
                  </span>
                </div>
              </th>
              <th className="border-r border-gray-100 px-6 py-3">
                <div className="flex flex-col leading-tight">
                  <span className="whitespace-nowrap">ETA</span>
                  <span className="mt-1 text-[10px] font-medium text-gray-400">
                    dd/mm/yyyy
                  </span>
                </div>
              </th>
              <th className="whitespace-nowrap border-r border-gray-100 px-6 py-3">
                Status
              </th>
              <th className="whitespace-nowrap px-6 py-3">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-10 text-center text-[12.5px] text-gray-500"
                >
                  No shipments match your current filters.
                </td>
              </tr>
            ) : (
              items.map((shipment, index) => (
                <tr
                  key={shipment.id}
                  className={cn(
                    'transition-colors',
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60',
                    'hover:bg-brand-50/40'
                  )}
                >
                  <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 font-medium text-gray-800">
                    {shipment.sku}
                  </td>
                  <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-600">
                    {shipment.customer}
                  </td>
                  <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-600">
                    {shipment.origin}
                  </td>
                  <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-600">
                    {shipment.destination}
                  </td>
                  <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-600">
                    {formatDate(shipment.departureDate)}
                  </td>
                  <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-600">
                    {formatDate(shipment.etaDate)}
                  </td>
                  <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
                        statusStyles[shipment.status]
                      )}
                    >
                      {statusLabels[shipment.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    <span className="inline-flex items-center gap-2">
                      {modeIcons[shipment.mode]}
                      {modeLabel(shipment.mode)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
