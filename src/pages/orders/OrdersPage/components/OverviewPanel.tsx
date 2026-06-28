import type { ReactElement, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { formatDate, formatCurrency } from '@/utils';
import type { OrderView } from '../types';
import { pricingSourceLabel } from '../types';

interface OverviewPanelProps {
  view: OrderView;
  billableWeightKg?: number | null;
}

function ColHeader({ children }: { children: ReactNode }): ReactElement {
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
      {children}
    </p>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-800">{children || '—'}</p>
    </div>
  );
}

function DescriptionModal({ text, onClose }: { text: string; onClose: () => void }): ReactElement {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Contents</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

function ContentsField({ value }: { value: string | null | undefined }): ReactElement {
  const [open, setOpen] = useState(false);
  const THRESHOLD = 120;
  const text = value || '—';
  const needsModal = !!value && value.length > THRESHOLD;

  return (
    <div>
      <p className="text-xs text-gray-400">Contents</p>
      <p className="mt-0.5 text-sm font-medium text-gray-800 line-clamp-2">{text}</p>
      {needsModal && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
        >
          Read more
        </button>
      )}
      {open && <DescriptionModal text={value!} onClose={() => setOpen(false)} />}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }): ReactElement {
  const s = status.toUpperCase();
  if (s === 'PAID_IN_FULL') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Paid in full
      </span>
    );
  }
  if (s === 'UNPAID') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Unpaid
      </span>
    );
  }
  if (s === 'PAYMENT_IN_PROGRESS') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Payment in progress
      </span>
    );
  }
  return <span className="text-sm font-medium text-gray-800">{status}</span>;
}

export function OverviewPanel({ view, billableWeightKg }: OverviewPanelProps): ReactElement {
  const billableLabel =
    billableWeightKg != null ? `${billableWeightKg.toFixed(0)} kg` : '—';

  const modeLabel =
    view.transportMode === 'sea'  ? 'Sea freight'
    : view.transportMode === 'd2d' ? 'Door-to-door'
    : view.transportMode === 'air' ? 'Air freight'
    : '—';

  const createdLabel = view.createdAt
    ? formatDate(view.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div className="grid divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">

        {/* Recipient */}
        <div className="p-5">
          <ColHeader>Recipient</ColHeader>
          <div className="space-y-3.5">
            <Field label="Name">{view.recipientName || '—'}</Field>
            <Field label="Phone">{view.recipientPhone || '—'}</Field>
            <Field label="Address">{view.recipientAddress || '—'}</Field>
          </div>
        </div>

        {/* Shipment */}
        <div className="p-5">
          <ColHeader>Shipment</ColHeader>
          <div className="space-y-3.5">
            <Field label="Transport">{modeLabel}</Field>
            <ContentsField value={view.contentDescription} />
            {billableWeightKg != null && (
              <Field label="Billable weight">{billableLabel}</Field>
            )}
            <Field label="Declared value">
              {view.declaredValue != null ? formatCurrency(view.declaredValue, 'USD') : '—'}
            </Field>
            <Field label="Created">{createdLabel}</Field>
          </div>
        </div>

        {/* Sourcing Supplier (conditional) */}
        {(view.sourcingSupplierId || view.sourcingSupplierName) && (
          <div className="p-5 col-span-full sm:col-span-1">
            <ColHeader>Sourcing Supplier</ColHeader>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">
                {view.sourcingSupplierName ?? 'GEX Registered Supplier'}
              </p>
              {view.sourcingSupplierPhone && (
                <p className="text-sm text-gray-500">{view.sourcingSupplierPhone}</p>
              )}
              {view.sourcingSupplierEmail && (
                <p className="text-sm text-gray-500">{view.sourcingSupplierEmail}</p>
              )}
            </div>
          </div>
        )}

        {/* Billing */}
        <div className="p-5">
          <ColHeader>Billing</ColHeader>
          <div className="space-y-3.5">
            <div>
              <p className="text-xs text-gray-400">Payment status</p>
              <div className="mt-1.5">
                <PaymentStatusBadge status={view.paymentCollectionStatus} />
              </div>
            </div>

            {(view.totalPaidUsd != null || view.amountDue != null || view.finalChargeUsd != null) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {view.finalChargeUsd != null && (
                  <Field label="Final charge">
                    {formatCurrency(view.finalChargeUsd, 'USD')}
                  </Field>
                )}
                {view.totalPaidUsd != null && (
                  <Field label="Total paid">
                    {formatCurrency(view.totalPaidUsd, 'USD')}
                  </Field>
                )}
                {view.amountDue != null && (
                  <Field label="Balance remaining">
                    {formatCurrency(view.amountDue, 'USD')}
                  </Field>
                )}
              </div>
            )}

            {view.pricingSource && (
              <Field label="Pricing source">{pricingSourceLabel(view.pricingSource)}</Field>
            )}
          </div>
        </div>

      </div>
  );
}
