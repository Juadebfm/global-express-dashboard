import type { ReactElement } from 'react';
import { useState } from 'react';
import { CheckCircle2, Maximize2, X } from 'lucide-react';
import type { ApiPayment } from '@/types';
import { formatCurrency } from '@/utils';

interface PaymentReceiptSummaryProps {
  payments: ApiPayment[];
  isLoading?: boolean;
}

const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif|heic)(\?.*)?$/i;

function isImageUrl(url: string): boolean {
  try {
    return IMAGE_EXTS.test(new URL(url).pathname);
  } catch {
    return IMAGE_EXTS.test(url);
  }
}

function methodLabel(paymentType: ApiPayment['paymentType']): string {
  if (paymentType === 'transfer') return 'Bank transfer';
  if (paymentType === 'cash') return 'Cash';
  if (paymentType === 'online') return 'Online';
  return paymentType;
}

function formatPaidAt(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }): ReactElement {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt="Payment receipt"
        className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function PaymentReceiptSummary({ payments, isLoading }: PaymentReceiptSummaryProps): ReactElement {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const payment = payments.find((p) => p.status === 'successful');

  return (
    <>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Payment complete</h3>
            <p className="text-xs text-gray-400">This order has been paid in full.</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Paid in full
          </span>
        </div>

        {isLoading && !payment && (
          <div className="mt-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        )}

        {payment && (
          <div className="mt-5 space-y-4">
            {/* Receipt image */}
            {payment.proofReference && isImageUrl(payment.proofReference) && (
              <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <img
                  src={payment.proofReference}
                  alt="Payment receipt"
                  className="max-h-64 w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setLightboxSrc(payment.proofReference!)}
                  className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70 transition"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  View full
                </button>
              </div>
            )}

            {/* Proof reference link (non-image) */}
            {payment.proofReference && !isImageUrl(payment.proofReference) && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Proof reference
                </p>
                <a
                  href={payment.proofReference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block break-all text-sm text-brand-600 hover:underline"
                >
                  {payment.proofReference}
                </a>
              </div>
            )}

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-xs text-gray-400">Amount paid</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {formatCurrency(parseFloat(payment.amount), payment.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Method</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {methodLabel(payment.paymentType)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Confirmed at</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {formatPaidAt(payment.paidAt)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
