import type { ReactElement } from 'react';
import type { ApiPayment } from '@/types';

interface OrderPaymentHistoryProps {
  payments: ApiPayment[];
  isLoading?: boolean;
}

function formatAmount(payment: ApiPayment): string {
  const n = parseFloat(payment.amount);
  return Number.isFinite(n)
    ? `${payment.currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : `${payment.currency} ${payment.amount}`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function methodLabel(type: ApiPayment['paymentType']): string {
  if (type === 'transfer') return 'Bank transfer';
  if (type === 'cash') return 'Cash';
  return 'Online';
}

const STATUS_STYLES: Record<ApiPayment['status'], string> = {
  successful: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
  abandoned: 'bg-gray-100 text-gray-500',
};

export function OrderPaymentHistory({ payments, isLoading }: OrderPaymentHistoryProps): ReactElement {
  return (
    <div className="border-t border-gray-100 px-5 py-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Payment history
      </p>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && payments.length === 0 && (
        <p className="text-sm text-gray-400">No payments recorded yet.</p>
      )}

      {!isLoading && payments.length > 0 && (
        <div className="divide-y divide-gray-100">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{formatAmount(payment)}</p>
                <p className="text-xs text-gray-400">
                  {methodLabel(payment.paymentType)} · {formatDate(payment.paidAt ?? payment.createdAt)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[payment.status]}`}
              >
                {payment.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
