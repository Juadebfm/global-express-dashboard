import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plane, Ship, Package2, ClipboardList } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { PageHeader } from '@/pages/shared';
import { Card } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useAuth } from '@/hooks';
import { useInternalDeclarations } from '@/hooks/useInternalDeclarations';
import { cn } from '@/utils';
import type {
  InternalDeclarationListItem,
  DeclarationStatus,
} from '@/types/internalDeclarations.types';

type StatusFilter = 'pending_review' | 'accepted' | 'rejected' | 'all';

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'Pending review', value: 'pending_review' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Not accepted', value: 'rejected' },
  { label: 'All', value: 'all' },
];

function statusBadge(status: DeclarationStatus): { label: string; className: string } {
  switch (status) {
    case 'pending_review':
      return { label: 'Pending review', className: 'bg-amber-50 text-amber-700' };
    case 'accepted':
      return { label: 'Accepted', className: 'bg-emerald-50 text-emerald-700' };
    case 'rejected':
      return { label: 'Not accepted', className: 'bg-red-50 text-red-700' };
  }
}

function modeIcon(type: InternalDeclarationListItem['shipmentType']): ReactElement {
  if (type === 'air') return <Plane className="h-3.5 w-3.5" />;
  if (type === 'ocean') return <Ship className="h-3.5 w-3.5" />;
  return <Package2 className="h-3.5 w-3.5" />;
}

function modeLabel(type: InternalDeclarationListItem['shipmentType']): string {
  if (type === 'air') return 'Air';
  if (type === 'ocean') return 'Ocean';
  return 'D2D';
}

function DeclarationRow({ item }: { item: InternalDeclarationListItem }): ReactElement {
  const badge = statusBadge(item.status);
  const detailPath = ROUTES.SUPPLIER_NOTICE_REVIEW.replace(':id', item.id);

  return (
    <Link
      to={detailPath}
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium shrink-0', badge.className)}>
            {badge.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 shrink-0">
            {modeIcon(item.shipmentType)}
            {modeLabel(item.shipmentType)}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {item.supplierName ?? 'Unknown supplier'}
          {item.supplierBusinessName ? ` · ${item.supplierBusinessName}` : ''}
        </p>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-sm font-medium text-gray-700">
          USD {parseFloat(item.declaredValueUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors" />
    </Link>
  );
}

export function SupplierNoticesPage(): ReactElement {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending_review');

  const { data, isLoading, error } = useInternalDeclarations({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: 50,
  });

  const layoutUser = {
    displayName: user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
      : 'Staff',
    email: user?.email ?? '',
    avatarUrl: '/images/favicon.svg',
  };

  return (
    <AppLayout user={layoutUser}>
      <div className="space-y-6">
        <PageHeader
          title="Supplier goods notices"
          subtitle="Review and action goods notices submitted by suppliers."
        />

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
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="h-5 w-24 rounded-full bg-gray-100 animate-pulse" />
                    <div className="h-5 w-12 rounded-full bg-gray-100 animate-pulse" />
                  </div>
                  <div className="h-4 w-56 rounded bg-gray-100 animate-pulse" />
                  <div className="h-3 w-36 rounded bg-gray-100 animate-pulse" />
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
                  <div className="h-3 w-16 rounded bg-gray-100 animate-pulse" />
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
            {!data || data.length === 0 ? (
              <Card className="p-12 flex flex-col items-center gap-3 text-center">
                <ClipboardList className="h-10 w-10 text-gray-300" />
                <p className="font-medium text-gray-700">
                  {statusFilter === 'pending_review'
                    ? 'No goods notices awaiting review.'
                    : 'No goods notices found for this filter.'}
                </p>
              </Card>
            ) : (
              <Card className="divide-y divide-gray-100 overflow-hidden p-0">
                {data.map((item) => (
                  <DeclarationRow key={item.id} item={item} />
                ))}
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
