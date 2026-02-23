import type { ReactElement } from 'react';
import { useState } from 'react';
import { Copy, Download, Trash2, Pencil, Plane, Ship, Truck } from 'lucide-react';
import type { ShipmentRecord, ShipmentStatus } from '@/types';
import { cn } from '@/utils';

interface DashboardShipmentListProps {
  shipments: ShipmentRecord[];
}

type TabValue = 'all' | ShipmentStatus;

const TABS: { id: TabValue; label: string }[] = [
  { id: 'all', label: 'All Shipment' },
  { id: 'in_transit', label: 'In-transit' },
  { id: 'pending', label: 'Pending' },
  { id: 'delivered', label: 'Delivered' },
];

const STATUS_STYLES: Record<ShipmentStatus, { dot: string; text: string; label: string }> = {
  delivered: { dot: 'bg-green-500', text: 'text-green-700', label: 'Delivered' },
  in_transit: { dot: 'bg-blue-500', text: 'text-blue-700', label: 'In-transit' },
  pending: { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Pending' },
};

const PRIORITY_STYLES: Record<string, string> = {
  standard: 'bg-blue-50 text-blue-700',
  express: 'bg-rose-50 text-rose-700',
  economy: 'bg-gray-100 text-gray-600',
};

const MODE_ICON: Record<string, ReactElement> = {
  air: <Plane className="h-4 w-4" />,
  ocean: <Ship className="h-4 w-4" />,
  road: <Truck className="h-4 w-4" />,
};

export function DashboardShipmentList({ shipments }: DashboardShipmentListProps): ReactElement {
  const [activeTab, setActiveTab] = useState<TabValue>('all');

  const filtered =
    activeTab === 'all' ? shipments : shipments.filter((s) => s.status === activeTab);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-6">
          <h3 className="text-sm font-semibold text-gray-900">Shipment List</h3>
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  activeTab === tab.id
                    ? 'text-brand-600 border-b-2 border-brand-500 rounded-none'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.label}
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
              {['SKU', 'Customer', 'Origin', 'Destination', 'Departure', 'ETA', 'Status', 'Type', 'Priority'].map(
                (col) => (
                  <th key={col} className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                  No shipments found.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const statusStyle = STATUS_STYLES[row.status];
                const priorityStyle = PRIORITY_STYLES[row.priority] ?? 'bg-gray-100 text-gray-600';
                return (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{row.sku}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.customer}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.origin}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.destination}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.departureDate}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.etaDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', statusStyle.dot)} />
                        <span className={cn('font-medium', statusStyle.text)}>{statusStyle.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        {MODE_ICON[row.mode] ?? <Truck className="h-4 w-4" />}
                        <span className="capitalize">{row.mode}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', priorityStyle)}>
                        {row.priority}
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
