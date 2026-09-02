import { formatCurrency } from '@/utils';

type PaymentCollectionStatus = 'UNPAID' | 'PAYMENT_IN_PROGRESS' | 'PAID_IN_FULL';

export function verifiedWeightLabel(weightKg: string | null): string {
  return weightKg === null ? 'Pending verification' : `${weightKg} kg`;
}

export function usdLabel(value: string | null): string {
  if (value === null) return '—';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? formatCurrency(numeric, 'USD') : '—';
}

export function amountDueLabel(finalChargeUsd: string | null, amountDue: string | null): string {
  if (finalChargeUsd === null) return '—';
  return amountDue === null ? 'Paid in full' : usdLabel(amountDue);
}

export function paidAmountLabel(totalPaidUsd: string | null): string {
  return totalPaidUsd === null ? 'Needs finance review' : usdLabel(totalPaidUsd);
}

export function paymentStatusDisplay(status: PaymentCollectionStatus): { label: string; className: string } {
  switch (status) {
    case 'PAID_IN_FULL':
      return { label: 'Paid in full', className: 'bg-emerald-50 text-emerald-700' };
    case 'PAYMENT_IN_PROGRESS':
      return { label: 'Payment pending', className: 'bg-amber-50 text-amber-700' };
    case 'UNPAID':
      return { label: 'Unpaid', className: 'bg-gray-100 text-gray-600' };
  }
}
