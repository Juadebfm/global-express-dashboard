import type { ReactElement } from 'react';
import { useState } from 'react';
import { Copy, Download, Trash2, Pencil, Plane, Ship } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ShipmentRecord, StatusCategory } from '@/types';
import { cn, resolveLocation } from '@/utils';
import { CopyButton } from '@/components/ui';

interface DashboardShipmentListProps {
  shipments: ShipmentRecord[];
}

type TabValue = 'all' | StatusCategory;

const TAB_IDS: TabValue[] = ['all', 'pending', 'active', 'completed', 'exception'];

const STATUS_STYLES: Record<StatusCategory, { dot: string; text: string }> = {
  pending: { dot: 'bg-amber-500', text: 'text-amber-700' },
  active: { dot: 'bg-blue-500', text: 'text-blue-700' },
  completed: { dot: 'bg-green-500', text: 'text-green-700' },
  exception: { dot: 'bg-rose-500', text: 'text-rose-700' },
};

const MODE_ICON: Record<string, ReactElement> = {
  air: <Plane className="h-4 w-4" />,
  ocean: <Ship className="h-4 w-4" />,
};

export function DashboardShipmentList({ shipments }: DashboardShipmentListProps): ReactElement {
  const { t } = useTranslation('dashboard');
  const [activeTab, setActiveTab] = useState<TabValue>('all');

  const tLoc = (value: unknown): string => {
    const str = resolveLocation(value);
    return str ? t(`shipments:locations.${str}`, { defaultValue: str }) : '';
  };
  const tCustomer = (name: string): string => {
    const m: Record<string, string> = { 'Super Admin': 'superadmin', Admin: 'admin', Staff: 'staff', Customer: 'user' };
    const k = m[name];
    return k ? t(`common:roles.${k}`, name) : name;
  };

  const filtered =
    activeTab === 'all' ? shipments : shipments.filter((s) => s.status === activeTab);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-6">
          <h3 className="text-sm font-semibold text-gray-900">{t('shipmentList.title')}</h3>
          <div className="flex items-center gap-1">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  activeTab === id
                    ? 'text-brand-600 border-b-2 border-brand-500 rounded-none'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t(`shipmentList.tabs.${id}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <button type="button" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Copy">
            <Copy className="h-4 w-4" />
          </button>
          <button type="button" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Download CSV">
            <Download className="h-4 w-4" />
          </button>
          <button type="button" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
          <button type="button" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              {(['trackingNo', 'customer', 'origin', 'destination', 'departure', 'eta', 'status', 'type'] as const).map(
                (col) => (
                  <th key={col} className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">
                    {t(`shipmentList.table.${col}`)}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                  {t('shipmentList.empty')}
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const statusStyle = STATUS_STYLES[row.status];
                return (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">{row.sku}<CopyButton value={row.sku} /></span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{tCustomer(row.customer)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{tLoc(row.origin)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{tLoc(row.destination)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.departureDate}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.etaDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', statusStyle.dot)} />
                        <span className={cn('font-medium', statusStyle.text)}>{row.statusV2 ? t(`shipments:statusV2.${row.statusV2}`, { defaultValue: row.statusLabel || t(`shipmentList.tabs.${row.status}`) }) : (row.statusLabel || t(`shipmentList.tabs.${row.status}`))}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        {MODE_ICON[row.mode] ?? <Plane className="h-4 w-4" />}
                        <span>{t(`shipments:table.modeLabels.${row.mode}`, { defaultValue: row.mode })}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
