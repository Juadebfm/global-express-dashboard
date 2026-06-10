import type { ReactElement } from 'react';
import { formatDate, formatCurrency } from '@/utils';
import type { OrderView } from '../types';
import { pricingSourceLabel, statusLabel } from '../types';

interface OverviewPanelProps {
  view: OrderView;
  billableWeightKg?: number | null;
}

function Field({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-800">{value || '—'}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): ReactElement {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function OverviewPanel({ view, billableWeightKg }: OverviewPanelProps): ReactElement {
  const billableLabel =
    billableWeightKg != null ? `${billableWeightKg.toFixed(2)} kg` : '—';

  const modeLabel =
    view.transportMode === 'sea' ? 'Sea freight'
    : view.transportMode === 'd2d' ? 'Door-to-door'
    : view.transportMode === 'air' ? 'Air freight'
    : '—';

  const createdLabel = view.createdAt
    ? formatDate(view.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  const paymentStatusLabel = view.paymentCollectionStatus
    ? statusLabel(view.paymentCollectionStatus)
    : '—';

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Recipient */}
      <Section title="Recipient">
        <Field label="Name" value={view.recipientName} />
        <Field label="Phone" value={view.recipientPhone} />
        <Field label="Address" value={view.recipientAddress} />
      </Section>

      {/* Shipment */}
      <Section title="Shipment">
        <Field label="Transport" value={modeLabel} />
        <Field label="Contents" value={view.contentDescription} />
        <Field label="Billable weight" value={billableLabel} />
        <Field
          label="Declared value"
          value={view.declaredValue != null ? formatCurrency(view.declaredValue, 'USD') : '—'}
        />
        <Field label="Created" value={createdLabel} />
        <Field label="Sender ID" value={view.senderId} />
      </Section>

      {/* Billing */}
      <Section title="Billing">
        <Field label="Payment status" value={paymentStatusLabel} />
        <Field
          label="Amount due"
          value={view.amountDue != null ? formatCurrency(view.amountDue, 'USD') : '—'}
        />
        <Field
          label="Final charge"
          value={view.finalChargeUsd != null ? formatCurrency(view.finalChargeUsd, 'USD') : '—'}
        />
        <Field
          label="Pricing source"
          value={view.pricingSource ? pricingSourceLabel(view.pricingSource) : '—'}
        />
      </Section>
    </div>
  );
}
