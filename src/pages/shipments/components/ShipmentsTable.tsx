import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Plane, Search, Ship, X } from 'lucide-react';
import { CopyButton } from '@/components/ui';
import type { ShipmentMode, ShipmentRecord } from '@/types';
import { getStatusStyle } from '@/lib/statusUtils';
import { cn, resolveLocation } from '@/utils';

interface ShipmentsTableProps {
  title: string;
  items: ShipmentRecord[];
  searchValue?: string;
  searchPlaceholder?: string;
  searchMeta?: string;
  onSearchChange?: (value: string) => void;
  onSearchClear?: () => void;
}

const modeIcons: Record<ShipmentMode, ReactElement> = {
  air: <Plane className="h-4 w-4" />,
  ocean: <Ship className="h-4 w-4" />,
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
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
  const { t } = useTranslation('shipments');

  const translateLocation = (value: unknown): string => {
    const str = resolveLocation(value);
    return str ? t(`locations.${str}`, { defaultValue: str }) : '';
  };

  const translateCustomer = (name: string): string => {
    const englishRoles: Record<string, string> = {
      'Super Admin': 'superadmin',
      'Admin': 'admin',
      'Staff': 'staff',
      'Customer': 'user',
    };
    const roleKey = englishRoles[name];
    return roleKey ? t(`common:roles.${roleKey}`, name) : name;
  };
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
                {t('table.columns.trackingNo')}
              </th>
              <th className="whitespace-nowrap border-r border-gray-100 px-6 py-3">
                {t('table.columns.customer')}
              </th>
              <th className="whitespace-nowrap border-r border-gray-100 px-6 py-3">
                {t('table.columns.origin')}
              </th>
              <th className="whitespace-nowrap border-r border-gray-100 px-6 py-3">
                {t('table.columns.destination')}
              </th>
              <th className="border-r border-gray-100 px-6 py-3">
                <div className="flex flex-col leading-tight">
                  <span className="whitespace-nowrap">{t('table.columns.departure')}</span>
                  <span className="mt-1 text-[10px] font-medium text-gray-400">
                    dd/mm/yyyy
                  </span>
                </div>
              </th>
              <th className="border-r border-gray-100 px-6 py-3">
                <div className="flex flex-col leading-tight">
                  <span className="whitespace-nowrap">{t('table.columns.eta')}</span>
                  <span className="mt-1 text-[10px] font-medium text-gray-400">
                    dd/mm/yyyy
                  </span>
                </div>
              </th>
              <th className="whitespace-nowrap border-r border-gray-100 px-6 py-3">
                {t('table.columns.status')}
              </th>
              <th className="whitespace-nowrap px-6 py-3">{t('table.columns.type')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-10 text-center text-[12.5px] text-gray-500"
                >
                  {t('table.empty')}
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
                    <span className="inline-flex items-center gap-1.5">
                      {shipment.sku}
                      <CopyButton value={shipment.sku} />
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-600">
                    {translateCustomer(shipment.customer)}
                  </td>
                  <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-600">
                    {translateLocation(shipment.origin)}
                  </td>
                  <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-600">
                    {translateLocation(shipment.destination)}
                  </td>
                  <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-600">
                    {formatDate(shipment.departureDate)}
                  </td>
                  <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-600">
                    {formatDate(shipment.etaDate)}
                  </td>
                  <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4">
                    {(() => {
                      const style = getStatusStyle(shipment.statusV2);
                      return (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
                            style.bgClass,
                            style.textClass
                          )}
                        >
                          {shipment.statusV2 ? t(`statusV2.${shipment.statusV2}`, { defaultValue: shipment.statusLabel || shipment.status }) : (shipment.statusLabel || shipment.status)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    <span className="inline-flex items-center gap-2">
                      {modeIcons[shipment.mode]}
                      {t(`table.modeLabels.${shipment.mode}`)}
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
