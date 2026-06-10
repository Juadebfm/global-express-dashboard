import type { ReactElement } from 'react';
import { useState } from 'react';
import { CheckCircle, XCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ApiPayment } from '@/types';

interface ReceiptApprovalPanelProps {
  payment: ApiPayment;
  isPending: boolean;
  onVerify: (paymentId: string, decision: 'approve' | 'reject', note?: string) => Promise<void>;
}

export function ReceiptApprovalPanel({
  payment,
  isPending,
  onVerify,
}: ReceiptApprovalPanelProps): ReactElement {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'approve' | 'reject' | null>(null);

  const handle = async (decision: 'approve' | 'reject'): Promise<void> => {
    setError(null);
    try {
      await onVerify(payment.id, decision, note.trim() || undefined);
      setDone(decision);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed. Try again.');
    }
  };

  if (done) {
    return (
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
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-400" />
        <h4 className="text-sm font-semibold text-gray-900">Receipt review</h4>
        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          Pending review
        </span>
      </div>

      {/* Proof reference / receipt ID */}
      {payment.proofReference && (
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Proof reference
          </p>
          <p className="mt-0.5 break-all text-sm text-gray-700">{payment.proofReference}</p>
        </div>
      )}

      {/* Payment meta */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div>
          <span className="font-semibold text-gray-400">Amount</span>
          <br />
          {payment.amount} {payment.currency}
        </div>
        <div>
          <span className="font-semibold text-gray-400">Method</span>
          <br />
          {payment.paymentType === 'transfer' ? 'Bank transfer' : 'Cash'}
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
          className="mt-1 w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
        />
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

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
  );
}
