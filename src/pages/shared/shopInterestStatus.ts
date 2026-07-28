import type { ShopInterestStatus } from '@/types';

/**
 * Single source of truth for shop-interest status display + the allowed
 * next transitions, mirroring the backend's assertInterestTransition rules:
 * new -> contacted -> qualified -> converted -> delivered, hold_offered is a
 * dead end besides closing, and any status can close. Shared between
 * ClaimReviewPanel's SaleStatusSection (car-purchase claims, always starts
 * at 'converted') and the standalone ShopInterestDetailPage (general
 * inquiries, starts at 'new') so the two never drift out of sync.
 */
export function shopInterestStatusBadge(status: ShopInterestStatus): { label: string; cls: string } {
  switch (status) {
    case 'new':
      return { label: 'New', cls: 'bg-blue-100 text-blue-700' };
    case 'contacted':
      return { label: 'Contacted', cls: 'bg-amber-100 text-amber-700' };
    case 'qualified':
      return { label: 'Qualified', cls: 'bg-purple-100 text-purple-700' };
    case 'hold_offered':
      return { label: 'Hold offered', cls: 'bg-purple-100 text-purple-700' };
    case 'converted':
      return { label: 'Converted — awaiting delivery', cls: 'bg-blue-100 text-blue-700' };
    case 'delivered':
      return { label: 'Delivered', cls: 'bg-emerald-100 text-emerald-700' };
    case 'closed':
      return { label: 'Closed', cls: 'bg-gray-100 text-gray-600' };
    default:
      return { label: status, cls: 'bg-gray-100 text-gray-600' };
  }
}

const FORWARD_TRANSITIONS: Partial<Record<ShopInterestStatus, ShopInterestStatus>> = {
  new: 'contacted',
  contacted: 'qualified',
  qualified: 'converted',
  converted: 'delivered',
};

const FORWARD_LABELS: Partial<Record<ShopInterestStatus, string>> = {
  contacted: 'Mark Contacted',
  qualified: 'Mark Qualified',
  converted: 'Mark Converted',
  delivered: 'Mark Delivered',
};

export function nextShopInterestStatusOptions(
  current: ShopInterestStatus,
): { value: ShopInterestStatus; label: string }[] {
  const options: { value: ShopInterestStatus; label: string }[] = [];
  const forward = FORWARD_TRANSITIONS[current];
  if (forward) options.push({ value: forward, label: FORWARD_LABELS[forward]! });
  if (current !== 'closed') options.push({ value: 'closed', label: 'Close' });
  return options;
}
