import type { ReactElement } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Inbox, Plane, Ship, Package2 } from 'lucide-react';
import { SupplierLayout } from '@/components/supplier/SupplierLayout';
import { Card, AlertBanner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useSupplierOrderRequests } from '@/hooks/useSupplierOrderRequests';
import { cn, formatDate } from '@/utils';
import type { SupplierOrderRequest } from '@/types/supplierPortal.types';

const SUPPLIER_TABS = [
  { id: 'declarations', label: 'My Goods Notices', href: ROUTES.SUPPLIER_DASHBOARD },
  { id: 'requests', label: 'Customer Requests', href: ROUTES.SUPPLIER_REQUESTS },
];

function modeIcon(shipmentType: SupplierOrderRequest['shipmentType']): ReactElement {
  if (shipmentType === 'air') return <Plane className="h-3.5 w-3.5" />;
  if (shipmentType === 'ocean') return <Ship className="h-3.5 w-3.5" />;
  return <Package2 className="h-3.5 w-3.5" />;
}

function modeLabel(shipmentType: SupplierOrderRequest['shipmentType']): string {
  if (shipmentType === 'air') return 'Air freight';
  if (shipmentType === 'ocean') return 'Ocean freight';
  if (shipmentType === 'd2d') return 'Door-to-door';
  return 'Unknown';
}

function RequestRow({ request }: { request: SupplierOrderRequest }): ReactElement {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {request.shipmentType && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {modeIcon(request.shipmentType)}
              {modeLabel(request.shipmentType)}
            </span>
          )}
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            {request.statusV2 ?? 'Pending'}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900 truncate">
          {request.description ?? 'No description provided'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {request.weight && `${request.weight}`}
          {request.declaredValue && ` · USD ${request.declaredValue}`}
          {` · ${formatDate(request.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}`}
        </p>
      </div>
    </div>
  );
}

export function SupplierRequestsPage(): ReactElement {
  const location = useLocation();
  const { data: requests, isLoading, error } = useSupplierOrderRequests();

  return (
    <SupplierLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Customer Requests</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Orders where a customer named you as their supplier.
          </p>
        </div>

        {/* Page nav tabs */}
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
          {SUPPLIER_TABS.map((tab) => (
            <Link
              key={tab.id}
              to={tab.href}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                location.pathname === tab.href
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* List */}
        {isLoading && (
          <Card className="divide-y divide-gray-100 overflow-hidden p-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-4">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="h-5 w-28 rounded-full bg-gray-100 animate-pulse" />
                    <div className="h-5 w-20 rounded-full bg-gray-100 animate-pulse" />
                  </div>
                  <div className="h-4 w-48 rounded bg-gray-100 animate-pulse" />
                  <div className="h-3 w-32 rounded bg-gray-100 animate-pulse" />
                </div>
              </div>
            ))}
          </Card>
        )}

        {!isLoading && error && (
          <AlertBanner tone="error" message="Failed to load requests. Please refresh." />
        )}

        {!isLoading && !error && (
          <>
            {!requests || requests.length === 0 ? (
              <Card className="p-12 flex flex-col items-center gap-4 text-center">
                <Inbox className="h-10 w-10 text-gray-300" />
                <div>
                  <p className="font-medium text-gray-700">No requests yet</p>
                  <p className="mt-1 text-sm text-gray-400">
                    When a customer names you as their supplier, their request will appear here.
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="divide-y divide-gray-100 overflow-hidden p-0">
                {requests.map((req) => (
                  <RequestRow key={req.id} request={req} />
                ))}
              </Card>
            )}
          </>
        )}
      </div>
    </SupplierLayout>
  );
}
