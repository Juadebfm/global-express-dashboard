import type { ReactElement } from 'react';
import { useCan, useRecordShipmentMeasurement, useShipmentMeasurements } from '@/hooks';
import type { OrderInvoice } from '@/pages/shared';
import { MeasurementsTab } from './MeasurementsTab';
import { InvoiceAttachmentsPanel } from './InvoiceAttachmentsPanel';

/**
 * "Records" tab in the order workspace — folds in what used to live on the
 * separate /shipments/:id page: per-checkpoint measurements and invoice/
 * regulatory-document attachments. Staff never leave the order they're
 * looking at to see either.
 */
export function RecordsTab({ orderId, invoice }: { orderId: string; invoice: OrderInvoice | null }): ReactElement {
  const canRecord = useCan('orders.warehouseVerify');
  const { data: measurements, isLoading: measurementsLoading } = useShipmentMeasurements(orderId);
  const recordMeasurement = useRecordShipmentMeasurement(orderId);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white">
        <MeasurementsTab
          measurements={measurements ?? []}
          isLoading={measurementsLoading}
          canRecord={canRecord}
          isPending={recordMeasurement.isPending}
          onRecord={(data) => recordMeasurement.mutate(data)}
        />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900">Invoice attachments</h3>
        <p className="mt-0.5 text-sm text-gray-500">
          Task invoices and regulatory documents for this order's invoice.
        </p>
        <div className="mt-4">
          <InvoiceAttachmentsPanel invoice={invoice} />
        </div>
      </section>
    </div>
  );
}
