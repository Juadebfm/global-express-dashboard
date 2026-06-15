import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Plane, Ship, Package2, ClipboardList } from 'lucide-react';
import { SupplierLayout } from '@/components/supplier/SupplierLayout';
import { Card, Button } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useSupplierDeclarations } from '@/hooks/useSupplierPortal';
import { useSupplierAuthStore } from '@/store/supplierAuth';
import { cn } from '@/utils';
import type { Declaration, DeclarationStatus } from '@/types/supplierPortal.types';

type StatusFilter = 'all' | DeclarationStatus;

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending review', value: 'pending_review' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Not accepted', value: 'rejected' },
];

function statusBadge(status: DeclarationStatus): { label: string; className: string } {
  switch (status) {
    case 'pending_review':
      return { label: 'Waiting for review', className: 'bg-amber-50 text-amber-700' };
    case 'accepted':
      return { label: 'Accepted', className: 'bg-emerald-50 text-emerald-700' };
    case 'rejected':
      return { label: 'Not accepted', className: 'bg-red-50 text-red-700' };
  }
}

function modeIcon(shipmentType: Declaration['shipmentType']): ReactElement {
  if (shipmentType === 'air') return <Plane className="h-3.5 w-3.5" />;
  if (shipmentType === 'ocean') return <Ship className="h-3.5 w-3.5" />;
  return <Package2 className="h-3.5 w-3.5" />;
}

function modeLabel(shipmentType: Declaration['shipmentType']): string {
  if (shipmentType === 'air') return 'Air freight';
  if (shipmentType === 'ocean') return 'Ocean freight';
  return 'Door-to-door';
}

function DeclarationRow({ decl }: { decl: Declaration }): ReactElement {
  const detailPath = ROUTES.SUPPLIER_GOODS_NOTICE_DETAIL.replace(':id', decl.id);
  const badge = statusBadge(decl.status);

  return (
    <Link
      to={detailPath}
      className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', badge.className)}>
            {badge.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {modeIcon(decl.shipmentType)}
            {modeLabel(decl.shipmentType)}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900 truncate">{decl.description}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          For {decl.recipientName} &middot; {new Date(decl.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors" />
    </Link>
  );
}

export function SupplierDashboardPage(): ReactElement {
  const navigate = useNavigate();
  const user = useSupplierAuthStore((s) => s.user);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data: declarations, isLoading, error } = useSupplierDeclarations({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: 50,
  });

  return (
    <SupplierLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {user?.firstName ? `Welcome, ${user.firstName}` : 'My declarations'}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Track the status of your goods notices.
            </p>
          </div>
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.SUPPLIER_NEW_GOODS_NOTICE)}
          >
            New goods notice
          </Button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                statusFilter === tab.value
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading && (
          <Card className="divide-y divide-gray-100 overflow-hidden p-0">
            {Array.from({ length: 5 }).map((_, i) => (
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
          <Card className="p-8 text-center">
            <p className="text-sm text-red-500">Failed to load goods notices. Please refresh.</p>
          </Card>
        )}

        {!isLoading && !error && (
          <>
            {!declarations || declarations.length === 0 ? (
              <Card className="p-12 flex flex-col items-center gap-4 text-center">
                <ClipboardList className="h-10 w-10 text-gray-300" />
                <div>
                  <p className="font-medium text-gray-700">
                    {statusFilter !== 'all'
                      ? 'No goods notices match this filter.'
                      : 'You have not submitted any goods notices yet.'}
                  </p>
                  {statusFilter === 'all' && (
                    <p className="mt-1 text-sm text-gray-400">
                      Submit your first goods notice to get started.
                    </p>
                  )}
                </div>
                {statusFilter === 'all' && (
                  <Button
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => navigate(ROUTES.SUPPLIER_NEW_GOODS_NOTICE)}
                  >
                    Submit a goods notice
                  </Button>
                )}
              </Card>
            ) : (
              <Card className="divide-y divide-gray-100 overflow-hidden p-0">
                {declarations.map((decl) => (
                  <DeclarationRow key={decl.id} decl={decl} />
                ))}
              </Card>
            )}
          </>
        )}
      </div>
    </SupplierLayout>
  );
}
