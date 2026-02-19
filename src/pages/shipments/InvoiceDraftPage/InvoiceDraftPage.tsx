import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Download, FileText, Mail, X } from 'lucide-react';
import { AppShell } from '@/pages/shared';
import { Button } from '@/components/ui';
import { useDashboardData } from '@/hooks';
import { ROUTES } from '@/constants';

export function InvoiceDraftPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const location = useLocation();
  const navigate = useNavigate();
  const [dismissedCreated, setDismissedCreated] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const showCreatedModal = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('created') === '1' && !dismissedCreated;
  }, [location.search, dismissedCreated]);

  const closeCreatedModal = (): void => {
    setDismissedCreated(true);
    navigate(ROUTES.SHIPMENT_INVOICE, { replace: true });
  };

  const handleSendInvoice = (): void => {
    setActionMessage('Invoice sent to billing@novahealth.com.');
    setDismissedCreated(true);
    navigate(ROUTES.SHIPMENT_INVOICE, { replace: true });
  };

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading invoice...">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Invoice Draft</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review invoice details and send to the client.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button size="sm" onClick={handleSendInvoice}>
              <Mail className="h-4 w-4" />
              Send Invoice
            </Button>
          </div>
        </div>

        {actionMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {actionMessage}
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-800">Invoice #INV-20492</p>
                <p className="text-xs text-gray-400">Draft · Created Feb 19, 2026</p>
              </div>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Draft
            </span>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-700">Bill To</p>
              <div className="mt-3 text-sm text-gray-600">
                <p className="font-semibold text-gray-800">Nova Health</p>
                <p>billing@novahealth.com</p>
                <p>Marina port, Lagos Island, Lagos state, Nigeria.</p>
              </div>
              <div className="mt-4 text-xs text-gray-400">
                Terms: Net 30 · Due: Feb 27, 2026
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-700">Shipment Summary</p>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Shipment Type</span>
                  <span className="font-semibold text-gray-800">Standard Package</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Priority</span>
                  <span className="font-semibold text-gray-800">Standard</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Items</span>
                  <span className="font-semibold text-gray-800">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Weight</span>
                  <span className="font-semibold text-gray-800">0.0 lbs</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-800">Base Shipping</td>
                  <td className="px-4 py-3 text-gray-500">Standard package rate</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    $15.00
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-800">Weight Charge</td>
                  <td className="px-4 py-3 text-gray-500">0.0 lbs</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    $0.00
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-800">Service Level</td>
                  <td className="px-4 py-3 text-gray-500">Standard priority</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    $5.00
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-sm space-y-2 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-800">$20.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Taxes</span>
                <span className="font-semibold text-gray-800">$0.00</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-gray-800">
                <span className="font-semibold">Total Due</span>
                <span className="font-semibold">$20.00</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showCreatedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={closeCreatedModal}
              className="absolute right-5 top-5 text-gray-400 transition hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-gray-900">Shipment created</p>
                <p className="text-sm text-gray-500">
                  The invoice draft is ready to send.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={closeCreatedModal}>
                Later
              </Button>
              <Button size="sm" onClick={handleSendInvoice}>
                <Mail className="h-4 w-4" />
                Send Invoice Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
