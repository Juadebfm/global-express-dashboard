import type { ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, XCircle, Package2 } from 'lucide-react';
import { SupplierLayout } from '@/components/supplier/SupplierLayout';
import { Button, Card } from '@/components/ui';
import { ROUTES } from '@/constants';
import {
  useSupplierDeclaration,
  useOrderTrackingNumber,
} from '@/hooks/useSupplierPortal';
import type { Declaration } from '@/types/supplierPortal.types';

function modeLabel(type: Declaration['shipmentType']): string {
  if (type === 'air') return 'Air freight';
  if (type === 'ocean') return 'Ocean freight';
  return 'Door-to-door';
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <dt className="text-sm text-gray-500 sm:w-40 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 mt-0.5 sm:mt-0">{value}</dd>
    </div>
  );
}

function StatusBanner({ declaration }: { declaration: Declaration }): ReactElement {
  if (declaration.status === 'pending_review') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Waiting for review</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Your goods notice has been received. Our team is reviewing it and will get back to you shortly.
          </p>
        </div>
      </div>
    );
  }

  if (declaration.status === 'rejected') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-800">Goods notice not accepted</p>
          <p className="text-sm text-red-700 mt-0.5">
            Please review the reason below and submit a new goods notice with the corrected details.
          </p>
          {declaration.rejectionReason && (
            <div className="mt-3 rounded-lg border border-red-300 bg-white p-3">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Reason</p>
              <p className="text-sm text-red-800">{declaration.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-emerald-800">Goods notice accepted</p>
        <p className="text-sm text-emerald-700 mt-0.5">
          Your declaration has been approved. Bring your goods to our warehouse.
        </p>
      </div>
    </div>
  );
}

function TrackingSection({ orderId }: { orderId: string }): ReactElement {
  const { data, isLoading, error } = useOrderTrackingNumber(orderId);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
      </div>
    );
  }

  const trackingNumber = data?.trackingNumber;

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
      <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">
        Tracking number
      </p>
      {trackingNumber ? (
        <p className="font-mono text-base font-bold text-brand-800">{trackingNumber}</p>
      ) : (
        <p className="text-sm text-brand-700">Order created — tracking number will appear shortly.</p>
      )}
      <p className="mt-2 text-sm text-brand-700">
        Quote this number when dropping off goods at our warehouse.
      </p>
      {error && (
        <p className="mt-2 text-xs text-gray-400">Could not load tracking info. Please contact support.</p>
      )}
    </div>
  );
}

export function SupplierDeclarationDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: decl, isLoading, error } = useSupplierDeclaration(id);

  return (
    <SupplierLayout>
      <div className="max-w-xl">
        <button
          type="button"
          onClick={() => navigate(ROUTES.SUPPLIER_DASHBOARD)}
          className="mb-5 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to goods notices
        </button>

        {isLoading && (
          <div className="space-y-4">
            <div className="h-6 w-48 rounded bg-gray-200 animate-pulse" />
            <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />
            <div className="h-48 rounded-xl bg-gray-100 animate-pulse" />
          </div>
        )}

        {!isLoading && error && (
          <Card className="p-8 text-center">
            <p className="text-sm text-red-500">Goods notice not found or you don&apos;t have access to it.</p>
          </Card>
        )}

        {!isLoading && decl && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Goods notice details</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Submitted {new Date(decl.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                &nbsp;&middot;&nbsp;{modeLabel(decl.shipmentType)}
              </p>
            </div>

            {/* Status banner */}
            <StatusBanner declaration={decl} />

            {/* Tracking number (accepted only) */}
            {decl.status === 'accepted' && decl.orderId && (
              <TrackingSection orderId={decl.orderId} />
            )}

            {/* Resubmit CTA (rejected only) */}
            {decl.status === 'rejected' && (
              <Button
                variant="secondary"
                leftIcon={<Package2 className="h-4 w-4" />}
                onClick={() => navigate(ROUTES.SUPPLIER_NEW_GOODS_NOTICE)}
              >
                Submit new goods notice
              </Button>
            )}

            {/* Goods details */}
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">Goods</p>
              <dl className="space-y-3">
                <DetailRow label="Description" value={decl.description} />
                <DetailRow
                  label="Declared value"
                  value={`USD ${parseFloat(decl.declaredValueUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                />
                <DetailRow label="Quantity" value={decl.quantity ?? undefined} />
                <DetailRow
                  label="Estimated weight"
                  value={decl.estimatedWeightKg ? `${parseFloat(decl.estimatedWeightKg)} kg` : undefined}
                />
                <DetailRow
                  label="Expected at warehouse"
                  value={
                    decl.estimatedArrivalAt
                      ? new Date(decl.estimatedArrivalAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                      : undefined
                  }
                />
                {decl.specialPackagingNotes && (
                  <DetailRow label="Packaging notes" value={decl.specialPackagingNotes} />
                )}
                {decl.supplierNotes && (
                  <DetailRow label="Your reference" value={decl.supplierNotes} />
                )}
              </dl>
            </Card>

            {/* Recipient details */}
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">Recipient</p>
              <dl className="space-y-3">
                <DetailRow label="Name" value={decl.recipientName} />
                <DetailRow label="Phone" value={decl.recipientPhone} />
                <DetailRow label="Email" value={decl.recipientEmail ?? undefined} />
                <DetailRow label="Address" value={decl.recipientAddress ?? undefined} />
              </dl>
            </Card>
          </div>
        )}
      </div>
    </SupplierLayout>
  );
}
