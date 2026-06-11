import type { ReactElement } from 'react';
import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, FileText, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ApiPayment } from '@/types';

interface ReceiptApprovalPanelProps {
  payment: ApiPayment;
  isPending: boolean;
  onVerify: (paymentId: string, decision: 'approve' | 'reject', note?: string) => Promise<{ warning: string | null }>;
}

const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif|heic)(\?.*)?$/i;

function isImageUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return IMAGE_EXTS.test(path);
  } catch {
    return IMAGE_EXTS.test(url);
  }
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }): ReactElement {
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

export function ReceiptApprovalPanel({
  payment,
  isPending,
  onVerify,
}: ReceiptApprovalPanelProps): ReactElement {
  const [note, setNote] = useState('');
  const [done, setDone] = useState<'approve' | 'reject' | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handle = async (decision: 'approve' | 'reject'): Promise<void> => {
    try {
      const result = await onVerify(payment.id, decision, note.trim() || undefined);
      setWarning(result.warning);
      setDone(decision);
    } catch {
      // error toast handled by useVerifyOrderPayment onError
    }
  };

  if (done) {
    return (
      <div className="space-y-3">
        <div
          className={
            done === 'approve'
              ? 'flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4'
              : 'flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4'
          }
        >
          {done === 'approve' ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-red-500" />
          )}
          <p className="text-sm font-semibold text-gray-800">
            Receipt {done === 'approve' ? 'approved' : 'rejected'}.
          </p>
        </div>
        {done === 'approve' && warning && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-800">{warning}</p>
          </div>
        )}
      </div>
    );
  }

  const proofIsImage = !!payment.proofReference && isImageUrl(payment.proofReference);

  return (
    <>
      {lightboxOpen && payment.proofReference && (
        <ImageLightbox src={payment.proofReference} onClose={() => setLightboxOpen(false)} />
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <h4 className="text-sm font-semibold text-gray-900">Receipt review</h4>
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            Pending review
          </span>
        </div>

        {/* Receipt — image or URL fallback */}
        {payment.proofReference && (
          <div className="mt-3">
            {proofIsImage ? (
              <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <img
                  src={payment.proofReference}
                  alt="Payment receipt"
                  className="max-h-64 w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70 transition"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  View full
                </button>
              </div>
            ) : (
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
          </div>
        )}

        {/* Payment meta */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div>
            <p className="font-semibold uppercase tracking-wide text-gray-400">Amount</p>
            <p className="mt-0.5 text-sm text-gray-700">
              {payment.amount} {payment.currency}
            </p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-gray-400">Method</p>
            <p className="mt-0.5 text-sm text-gray-700">
              {payment.paymentType === 'transfer' ? 'Bank transfer' : 'Cash'}
            </p>
          </div>
        </div>

        {/* Note */}
        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add a note for the customer…"
            className="mt-1 w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            type="button"
            isLoading={isPending}
            onClick={() => void handle('approve')}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => void handle('reject')}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            Reject
          </Button>
        </div>
      </div>
    </>
  );
}
