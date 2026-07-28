import type { ReactElement } from 'react';
import { Plane, Ship, Package2 } from 'lucide-react';

export function modeIcon(mode: string): ReactElement {
  if (mode === 'sea') return <Ship className="h-4 w-4" />;
  if (mode === 'air') return <Plane className="h-4 w-4" />;
  return <Package2 className="h-4 w-4" />;
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPaymentStatus(status: string): string {
  if (!status) return '—';
  return status
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function orderDescription(raw: Record<string, unknown>): string {
  const shippingMark = typeof raw['shippingMark'] === 'string' ? raw['shippingMark'] : null;
  const description = typeof raw['description'] === 'string' ? raw['description'] : null;
  return shippingMark ?? description ?? 'No description';
}

export function orderWeight(raw: Record<string, unknown>): string {
  const weight = typeof raw['weight'] === 'number' || typeof raw['weight'] === 'string' ? raw['weight'] : null;
  return weight != null ? `${weight} kg` : '—';
}
